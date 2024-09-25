import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX, ModelProvider } from "../constant";

const NOT_USE_AIGC = process.env.CODE == "None";

function getIP(req: NextRequest) {
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }

  return ip;
}

function parseApiKey(bearToken: string) {
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();
  const isApiKey = !token.startsWith(ACCESS_CODE_PREFIX);

  return {
    accessCode: isApiKey ? "" : token.slice(ACCESS_CODE_PREFIX.length),
    apiKey: isApiKey ? token : "",
  };
}

export function auth(req: NextRequest, modelProvider: ModelProvider) {
  const authToken = req.headers.get("Authorization") ?? "";

  // check if it is openai api key or user token
  const { accessCode, apiKey } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();

  const serverConfig = getServerSideConfig();
  console.log("[Auth] allowed hashed codes: ", [...serverConfig.codes]);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());

  if (NOT_USE_AIGC) {
    req.headers.set("X-Access-Code", `${accessCode}`);
  } else {
    if (
      serverConfig.needCode &&
      !serverConfig.codes.has(hashedCode) &&
      !authToken
    ) {
      return {
        error: true,
        msg: !accessCode ? "empty access code" : "wrong access code",
      };
    }

    // if user does not provide an api key, inject system api key
    if (!authToken) {
      const apiKey = serverConfig.apiKey;
      if (apiKey) {
        console.log("[Auth] use system api key");
        req.headers.set("Authorization", `Bearer ${apiKey}`);
        req.headers.set("X-Access-Code", `${accessCode}`);
      } else {
        console.log("[Auth] admin did not provide an api key");
      }
      req.headers.set("X-Access-Code", `${accessCode}`);
    } else {
      console.log("[Auth] use user api key");
    }
  }

  return {
    error: false,
  };
}
