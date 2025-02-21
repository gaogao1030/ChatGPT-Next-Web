import { type OpenAIListModelResponse } from "@/app/client/platforms/openai";
import { ModelProvider, AigptPath } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../auth";
import { requestAigpt } from "../../aigpt";

const ALLOWD_PATH = new Set(Object.values(AigptPath));

async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[AIGPT Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const subpath = params.path.join("/");

  if (!ALLOWD_PATH.has(subpath)) {
    console.log("[AIGPT Route] forbidden path ", subpath);
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

  const authResult = auth(req, ModelProvider.GPT);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  try {
    const response = await requestAigpt(req);
    // list models
    if (subpath === AigptPath.ListModelPath && response.status === 200) {
      const resJson = (await response.json()) as OpenAIListModelResponse;
      const availableModels = resJson;
      return NextResponse.json(availableModels, {
        status: response.status,
      });
    }
    return response;
  } catch (e) {
    console.error("[AIGPT] ", e);
    return NextResponse.json(prettyObject(e));
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;

export const runtime = "edge";
