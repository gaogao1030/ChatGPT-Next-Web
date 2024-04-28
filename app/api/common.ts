import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "../config/server";
import { DEFAULT_MODELS, OPENAI_BASE_URL, GEMINI_BASE_URL } from "../constant";
import { collectModelTable } from "../utils/model";
import { makeAzurePath } from "../azure";

const serverConfig = getServerSideConfig();
export const OPENAI_URL = "api.openai.com";

export async function requestOpenai(req: NextRequest) {
  const controller = new AbortController();

  var authValue,
    authHeaderName = "";
  if (serverConfig.isAzure) {
    authValue =
      req.headers
        .get("Authorization")
        ?.trim()
        .replaceAll("Bearer ", "")
        .trim() ?? "";

    authHeaderName = "api-key";
  } else {
    authValue = req.headers.get("Authorization") ?? "";
    authHeaderName = "Authorization";
  }

  let path = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/openai/",
    "",
  );

  let baseUrl =
    serverConfig.azureUrl || serverConfig.baseUrl || OPENAI_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Proxy] ", path);
  console.log("[Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  try {
    if (serverConfig.isAzure) {
      if (!serverConfig.azureApiVersion) {
        return NextResponse.json({
          error: true,
          message: `missing AZURE_API_VERSION in server env vars`,
        });
      }
      path = makeAzurePath(path, serverConfig.azureApiVersion);
    }

    const fetchUrl = `${baseUrl}/${path}`;
    console.log(fetchUrl);
    const fetchOptions: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Access-Code": req.headers.get("X-Access-Code") || "",
        [authHeaderName]: authValue,
        ...(serverConfig.openaiOrgId && {
          "OpenAI-Organization": serverConfig.openaiOrgId,
        }),
        "Accept-Encoding": "identity", // Nginx proxy openai api location was handle ungzip response
      },
      cache: "no-store",
      method: req.method,
      body: req.body,
      // to fix #2485: https://stackoverflow.com/questions/55920957/cloudflare-worker-typeerror-one-time-use-body
      redirect: "manual",
      // @ts-ignore
      duplex: "half",
      signal: controller.signal,
    };

    // #1815 try to refuse gpt4 request
    if (serverConfig.customModels && req.body) {
      try {
        const modelTable = collectModelTable(
          DEFAULT_MODELS,
          serverConfig.customModels,
        );
        const clonedBody = await req.text();
        fetchOptions.body = clonedBody;

        const jsonBody = JSON.parse(clonedBody) as { model?: string };

        // not undefined and is false
        if (modelTable[jsonBody?.model ?? ""].available === false) {
          return NextResponse.json(
            {
              error: true,
              message: `you are not allowed to use ${jsonBody?.model} model`,
            },
            {
              status: 403,
            },
          );
        }
      } catch (e) {
        console.error("[OpenAI] gpt4 filter", e);
      }
    }

    const res = await fetch(fetchUrl, fetchOptions);
    if (res.status === 401) {
      // to prevent browser prompt for credentials
      const newHeaders = new Headers(res.headers);
      newHeaders.delete("www-authenticate");
      // to disbale ngnix buffering
      newHeaders.set("X-Accel-Buffering", "no");
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders,
      });
    }
    await rethrowOpenAIError(res);
    return res;
  } catch (error: any) {
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function rethrowOpenAIError(res: Response) {
  if (!res.ok) {
    let errorPayload: object | string | null = null;
    try {
      errorPayload = await (
        await res.text()
      ).replace(/provided:.*. You/, "provided: ***. You");
    } catch (e) {
      // ignore
    }
    throw new Error(
      `${res.status} · ${res.statusText} \n ${
        typeof errorPayload == "string"
          ? errorPayload
          : JSON.stringify(errorPayload, null, "  ")
      }`,
    );
  }
}
