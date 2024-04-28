import { Anthropic, ApiPath } from "@/app/constant";
import { ChatOptions, getHeaders, LLMApi } from "../api";
import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source";

import Locale from "../../locales";
import { prettyObject } from "@/app/utils/format";
import { getMessageTextContent, isVisionModel } from "@/app/utils";
import { cacheImageToBase64Image } from "@/app/utils/chat";
import { cloudflareAIGatewayUrl } from "@/app/utils/cloudflare";

export type MultiBlockContent = {
  type: "image" | "text";
  source?: {
    type: string;
    media_type: string;
    data: string;
  };
  text?: string;
};

export type AnthropicMessage = {
  role: (typeof ClaudeMapper)[keyof typeof ClaudeMapper];
  content: string | MultiBlockContent[];
};

export interface AnthropicChatRequest {
  model: string; // The model that will complete your prompt.
  messages: AnthropicMessage[]; // The prompt that you want Claude to complete.
  max_tokens: number; // The maximum number of tokens to generate before stopping.
  stop_sequences?: string[]; // Sequences that will cause the model to stop generating completion text.
  temperature?: number; // Amount of randomness injected into the response.
  top_p?: number; // Use nucleus sampling.
  top_k?: number; // Only sample from the top K options for each subsequent token.
  metadata?: object; // An object describing metadata about the request.
  stream?: boolean; // Whether to incrementally stream the response using server-sent events.
}

export interface ChatRequest {
  model: string; // The model that will complete your prompt.
  prompt: string; // The prompt that you want Claude to complete.
  max_tokens_to_sample: number; // The maximum number of tokens to generate before stopping.
  stop_sequences?: string[]; // Sequences that will cause the model to stop generating completion text.
  temperature?: number; // Amount of randomness injected into the response.
  top_p?: number; // Use nucleus sampling.
  top_k?: number; // Only sample from the top K options for each subsequent token.
  metadata?: object; // An object describing metadata about the request.
  stream?: boolean; // Whether to incrementally stream the response using server-sent events.
}

export interface ChatResponse {
  completion: string;
  stop_reason: "stop_sequence" | "max_tokens";
  model: string;
}

export type ChatStreamResponse = ChatResponse & {
  stop?: string;
  log_id: string;
};

const ClaudeMapper = {
  assistant: "assistant",
  user: "user",
  system: "user",
} as const;

export class ClaudeApi implements LLMApi {
  async models() {
    return [];
  }

  extractMessage(res: any) {
    return res.choices?.at(0)?.message?.content ?? "";
  }

  async chat(options: ChatOptions): Promise<void> {
    const visionModel = isVisionModel(options.config.model);

    const accessStore = useAccessStore.getState();

    const shouldStream = !!options.config.stream;

    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      ...{
        model: options.config.model,
      },
    };

    const messages = [...options.messages];

    const keys = ["system", "user"];

    // roles must alternate between "user" and "assistant" in claude, so add a fake assistant message between two user messages
    for (let i = 0; i < messages.length - 1; i++) {
      const message = messages[i];
      const nextMessage = messages[i + 1];

      if (keys.includes(message.role) && keys.includes(nextMessage.role)) {
        messages[i] = [
          message,
          {
            role: "assistant",
            content: ";",
          },
        ] as any;
      }
    }

    const prompt = await Promise.all(
      messages
        .flat()
        .filter((v) => {
          if (!v.content) return false;
          if (typeof v.content === "string" && !v.content.trim()) return false;
          return true;
        })
        .map(async (v) => {
          const { role, content } = v;
          const insideRole = ClaudeMapper[role] ?? "user";

          if (!visionModel || typeof content === "string") {
            return {
              role: insideRole,
              content: getMessageTextContent(v),
            };
          }

          const resolvedContent = await Promise.all(
            content
              .filter((v) => v.image_url || v.text)
              .map(async ({ type, text, image_url }) => {
                if (type === "text") {
                  return {
                    type,
                    text: text!,
                  };
                }
                let { url = "" } = image_url || {};
                url = await cacheImageToBase64Image(url);
                const colonIndex = url.indexOf(":");
                const semicolonIndex = url.indexOf(";");
                const comma = url.indexOf(",");

                const mimeType = url.slice(colonIndex + 1, semicolonIndex);
                const encodeType = url.slice(semicolonIndex + 1, comma);
                const data = url.slice(comma + 1);

                return {
                  type: "image" as const,
                  source: {
                    type: encodeType,
                    media_type: mimeType,
                    data,
                  },
                };
              }),
          );

          return {
            role: insideRole,
            content: resolvedContent,
          };
        }),
    );

    const requestBody: AnthropicChatRequest = {
      messages: prompt,
      stream: shouldStream,

      model: modelConfig.model,
      max_tokens: modelConfig.max_tokens,
      temperature: modelConfig.temperature,
      top_p: modelConfig.top_p,
      top_k: 5,
    };

    const path = this.path(Anthropic.ChatPath);

    const controller = new AbortController();
    options.onController?.(controller);

    const payload = {
      method: "POST",
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      headers: {
        ...getHeaders(), // get common headers
        "anthropic-version": accessStore.anthropicApiVersion,
        // do not send `anthropicApiKey` in browser!!!
        // Authorization: getAuthKey(accessStore.anthropicApiKey),
      },
    };

    if (shouldStream) {
      try {
        const context = {
          text: "",
          finished: false,
        };

        const finish = () => {
          if (!context.finished) {
            options.onFinish(context.text);
            context.finished = true;
          }
        };

        controller.signal.onabort = finish;
        fetchEventSource(path, {
          ...payload,
          async onopen(res) {
            const contentType = res.headers.get("content-type");
            console.log("response content type: ", contentType);

            if (contentType?.startsWith("text/plain")) {
              context.text = await res.clone().text();
              return finish();
            }

            if (
              !res.ok ||
              !res.headers
                .get("content-type")
                ?.startsWith(EventStreamContentType) ||
              res.status !== 200
            ) {
              const responseTexts = [context.text];
              let extraInfo = await res.clone().text();
              try {
                const resJson = await res.clone().json();
                extraInfo = prettyObject(resJson);
              } catch {}

              if (res.status === 401) {
                responseTexts.push(Locale.Error.Unauthorized);
              }

              if (extraInfo) {
                responseTexts.push(extraInfo);
              }

              context.text = responseTexts.join("\n\n");

              return finish();
            }
          },
          onmessage(msg) {
            if (msg.data === "[DONE]" || context.finished) {
              return finish();
            }
            const text = msg.data;
            try {
              const json = JSON.parse(text);
              const choices = json.choices as Array<{
                delta: { content: string };
              }>;
              const delta = choices[0]?.delta?.content;

              if (delta) {
                context.text += delta;
                options.onUpdate?.(context.text, delta);
              }
            } catch (e) {
              console.error("[Request] parse error", text, msg);
            }
          },
          onclose() {
            finish();
          },
          onerror(e) {
            options.onError?.(e);
            throw e;
          },
          openWhenHidden: true,
        });
      } catch (e) {
        console.error("failed to chat", e);
        options.onError?.(e as Error);
      }
    } else {
      try {
        controller.signal.onabort = () => options.onFinish("");

        const res = await fetch(path, payload);
        const resJson = await res.json();

        const message = this.extractMessage(resJson);
        options.onFinish(message);
      } catch (e) {
        console.error("failed to chat", e);
        options.onError?.(e as Error);
      }
    }
  }
  async usage() {
    return {
      used: 0,
      total: 0,
    };
  }
  path(path: string): string {
    let baseUrl: string = "";

    // if endpoint is empty, use default endpoint
    if (baseUrl.trim().length === 0) {
      const apiPath = ApiPath.Anthropic;
      baseUrl = apiPath;
    }

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, baseUrl.length - 1);
    }

    console.log("[Proxy Endpoint] ", baseUrl, path);

    // try rebuild url, when using cloudflare ai gateway in client
    return cloudflareAIGatewayUrl([baseUrl, path].join("/"));
  }
}
