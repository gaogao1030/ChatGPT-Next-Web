import { Mask } from "@/app/store/mask";
import { getLang } from "../../locales";
import { AigptPath, REQUEST_TIMEOUT_MS } from "@/app/constant";
import { getHeaders, LLMModel } from "../api";
import { ChatMessage } from "@/app/store";
import Locale from "../../locales";

export type ListMask = Mask[];

export interface AIGPTListModelResponse {
  object: string;
  data: Array<{
    id: string;
    providerType: string;
    providerName: string;
    object: string;
    root: string;
  }>;
}

interface SessionParams {
  session_id: string;
  session_topic: string;
  event: string;
}

export interface PlatformConfig {
  title: string;
  desc: string;
  recharge_link: string;
  usage_help_link: string;
  version: string;
}

export interface Plan {
  name: string;
  plan_type: string;
  description: string;
  list_type_for_model: string;
  quota_for_count: number;
  quota_for_money: number;
}

export interface Code {
  plan: Plan;
  actived_at: string;
  ban_cause: string;
  deactived_at: string;
  expired_at: string;
  state: string;
  value: string;
  utm_source: string;
}

interface ModelUsage {
  model_name: string;
  total_completion_tokens: number;
  total_cost: number;
  total_cost_with_coefficient: number;
  total_count: number;
  total_prompt_tokens: number;
}

export interface CodeTotalUsage {
  total_cost: number;
  total_count: number;
}

interface BalancData {
  code: Code;
  code_usage: CodeTotalUsage;
  plan: Plan;
}

export interface Context {
  id: string;
  name: string;
  url: string;
  isFamilyFriendly: boolean;
  displayUrl: string;
  snippet: string;
  dateLastCrawled: string;
  cachedPageUrl: string;
  language: string;
  isNavigational: boolean;
  noCache: boolean;
}

export interface CoreferenceResult {
  input: string;
  output: string;
}

export interface PromptWithContexts {
  search_prompt: string;
  contexts: Context[];
  search_key_words: string;
  coreference_result: CoreferenceResult;
}

abstract class BaseAPI {
  abstract save_topic(options: SessionParams): Promise<void>;
  abstract models(): Promise<LLMModel[]>;
  abstract total_usage(): Promise<BalancData>;
  abstract save_utm_source(utm_source: string): Promise<void>;
  abstract text2speech(text: String, signal: AbortSignal): Promise<any>;
  abstract search_prompt(
    messages: ChatMessage[],
  ): Promise<[number, PromptWithContexts]>;
}

export class AiGPTApi implements BaseAPI {
  path(path: string): string {
    let aigptUrl = "/api/aigpt";
    if (aigptUrl.endsWith("/")) {
      aigptUrl = aigptUrl.slice(0, aigptUrl.length - 1);
    }
    return [aigptUrl, path].join("/");
  }

  async save_utm_source(utm_source: string) {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const path = this.path(AigptPath.CodeUtmSource);
    const payload = {
      method: "PUT",
      body: JSON.stringify({ utm_source: utm_source }),
      signal: controller.signal,
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return resJson;
  }

  async save_topic(params: SessionParams) {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const path = this.path(AigptPath.TopicPath);
    const payload = {
      method: "POST",
      body: JSON.stringify(params),
      signal: controller.signal,
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return resJson;
  }

  async models(): Promise<LLMModel[]> {
    const ListModelPath = AigptPath.ListModelPath;

    const res = await fetch(this.path(ListModelPath), {
      method: "GET",
      headers: {
        ...getHeaders(),
      },
    });

    const resJson = (await res.json()) as AIGPTListModelResponse;
    // const chatModels = resJson.data?.filter((m) => m.id.startsWith("gpt-"));
    const chatModels = resJson.data;
    console.log("[Models]", chatModels);

    if (!chatModels) {
      return [];
    }

    let seq = 1000; //同 Constant.ts 中的排序保持一致
    return chatModels.map((m) => ({
      name: m.id,
      available: true,
      sorted: seq++,
      provider: {
        id: "openai",
        providerName: m.providerName ? m.providerName : "OpenAI",
        providerType: m.providerType ? m.providerType : "openai",
        sorted: 1,
      },
    }));
  }

  async platform_config(platform_name: String) {
    const lang = getLang();
    const res = await fetch(
      this.path(
        `${AigptPath.PlatformConfigPath}?name=${platform_name}&lang=${lang}`,
      ),
      {
        method: "GET",
        headers: getHeaders(),
      },
    );
    if (!res.ok) {
      throw new Error("Failed to query platform config from aigpt");
    }

    const platformConfig = (await res.json()) as PlatformConfig;

    return platformConfig;
  }

  async get_masks(platform_name: String) {
    const res = await fetch(
      this.path(`${AigptPath.PlatformMasksPath}?name=${platform_name}`),
      {
        method: "GET",
        headers: getHeaders(),
      },
    );
    if (!res.ok) {
      throw new Error("Failed to query platform masks from aigpt");
    }

    const list_masks = (await res.json()) as ListMask;

    return list_masks;
  }

  async text2speech(text: String, signal: AbortSignal) {
    const res = await fetch(this.path(`${AigptPath.Text2Speech}`), {
      signal: signal,
      body: JSON.stringify(text),
      method: "POST",
      cache: "no-store",
      headers: getHeaders(),
    });

    if (!res.ok) {
      const resJson = await res.json();
      throw new Error(resJson.detail);
    }

    return res;
  }

  async search_prompt(
    messages: ChatMessage[],
    search_engine?: string,
  ): Promise<[number, PromptWithContexts]> {
    const body = {
      messages: messages,
      search_engine: search_engine,
    };
    const res = await fetch(this.path(`${AigptPath.SearchPromptPath}`), {
      method: "POST",
      body: JSON.stringify(body),
      cache: "no-store",
      headers: getHeaders(),
    });

    const resJson = await res.json();

    return [res.status, resJson];
  }

  async total_usage() {
    const [usage, code] = await Promise.all([
      fetch(this.path(`${AigptPath.CodeUsagePath}`), {
        method: "GET",
        headers: getHeaders(),
      }),
      fetch(this.path(AigptPath.CodePath), {
        method: "GET",
        headers: getHeaders(),
      }),
    ]);

    if (code.status === 401) {
      throw new Error(Locale.Error.Unauthorized);
    }

    if (!code.ok || !usage.ok) {
      throw new Error("Failed to query usage from aigpt");
    }

    const codeModel = (await code.json()) as Code;

    const usageModel = (await usage.json()) as CodeTotalUsage;

    return {
      plan: codeModel.plan,
      code: codeModel,
      code_usage: usageModel,
    } as BalancData;
  }
}

export const aigpt_api = new AiGPTApi();
