import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import { OPENAI_BASE_URL } from "../constant";

const serverConfig = getServerSideConfig();
export const OPENAI_URL = "api.openai.com";

export async function requestOpenai(req: NextRequest) {
  const controller = new AbortController();

  const isAzure = req.nextUrl.pathname.includes("azure/deployments");

  let path = `${req.nextUrl.pathname}`.replaceAll(
    "/api/openai/",
    "/openai/api/",
  );

  let baseUrl =
    (isAzure ? serverConfig.azureUrl : serverConfig.baseUrl) || OPENAI_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[OpenAI Proxy] ", path);
  console.log("[Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  try {
    const fetchUrl = `${baseUrl}${path}`;
    console.log("[OpenAI FetchUrl] ", fetchUrl);
    const fetchOptions: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Access-Code": req.headers.get("X-Access-Code") || "",
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

    const res = await fetch(fetchUrl, fetchOptions);
    const COMMON_ERROR_STATUSES = [400, 401, 410];

    if (COMMON_ERROR_STATUSES.includes(res.status)) {
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
      errorPayload = (await res.text()).replace(
        /provided:.*. You/,
        "provided: ***. You",
      );
    } catch (e) {
      // ignore
    }
    throw new Error(
      `${res.status} · ${res.statusText} \n ${typeof errorPayload == "string"
        ? errorPayload
        : JSON.stringify(errorPayload, null, "  ")
      }`,
    );
  }
}
