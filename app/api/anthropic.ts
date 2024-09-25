import { getServerSideConfig } from "@/app/config/server";
import {
  ANTHROPIC_BASE_URL,
  Anthropic,
  ModelProvider,
} from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { cloudflareAIGatewayUrl } from "@/app/utils/cloudflare";

const ALLOWD_PATH = new Set([Anthropic.ChatPath]);

export async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[Anthropic Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const subpath = params.path.join("/");

  if (!ALLOWD_PATH.has(subpath)) {
    console.log("[Anthropic Route] forbidden path ", subpath);
    return NextResponse.json(
      {
        error: true,
        msg: "you are not allowed to request " + subpath,
      },
      {
        status: 403,
      },
    );
  }

  const authResult = auth(req, ModelProvider.Claude);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  try {
    const response = await request(req);
    return response;
  } catch (e) {
    console.error("[Anthropic] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

const serverConfig = getServerSideConfig();

async function request(req: NextRequest) {
  const controller = new AbortController();

  let path = `${req.nextUrl.pathname}`.replaceAll(
    "/api/anthropic/",
    "/anthropic/api/",
  );

  let baseUrl =
    serverConfig.anthropicUrl || serverConfig.baseUrl || ANTHROPIC_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Anthropic Proxy] ", path);
  console.log("[Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  // try rebuild url, when using cloudflare ai gateway in server
  const fetchUrl = cloudflareAIGatewayUrl(`${baseUrl}${path}`);
  console.log("[Anthropic FetchUrl] ", fetchUrl);

  const fetchOptions: RequestInit = {
    headers: {
      Language: req.headers.get("Language") || "en",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      // "anthropic-dangerous-direct-browser-access": "true",
      // [authHeaderName]: authValue,
      "X-Access-Code": req.headers.get("X-Access-Code") || "",

      // "anthropic-version":
      //   req.headers.get("anthropic-version") ||
      //   serverConfig.anthropicApiVersion ||
      //   Anthropic.Vision,
      "Accept-Encoding": "identity", // Nginx proxy openai api location was handle ungzip response
    },
    method: req.method,
    body: req.body,
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  try {
    const res = await fetch(fetchUrl, fetchOptions);

    // console.log(
    //   "[Anthropic response]",
    //   res.status,
    //   "   ",
    //   res.headers,
    //   res.url,
    // );
    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
    newHeaders.set("X-Accel-Buffering", "no");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
