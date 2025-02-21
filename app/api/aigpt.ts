import { NextRequest } from "next/server";

import { AIGPT_API_BASE_URL } from "@/app/constant";

const DEFAULT_PROTOCOL = "https";
const PROTOCOL = process.env.PROTOCOL || DEFAULT_PROTOCOL;

export async function requestAigpt(req: NextRequest) {
  const controller = new AbortController();
  const openaiPath = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
    "/api/aigpt/",
    "",
  );

  let baseUrl = AIGPT_API_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `${PROTOCOL}://${baseUrl}`;
  }

  console.log("[Proxy] ", openaiPath);
  console.log("[Base Url]", baseUrl);
  console.log("[Code]", req.headers.get("X-Access-Code"));

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  try {
    const fetchUrl = `${baseUrl}/${openaiPath}`;
    const fetchOptions: RequestInit = {
      headers: {
        Language: req.headers.get("Language") || "en",
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        "X-Access-Code": req.headers.get("X-Access-Code") || "",
        "Accept-Encoding": "identity", // Nginx proxy openai api location was handle ungzip response
      },
      cache: "no-store",
      method: req.method,
      body: req.body,
      // @ts-ignore
      duplex: "half",
      signal: controller.signal,
    };

    const res = await fetch(fetchUrl, fetchOptions);
    return res;
  } catch (error: any) {
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
