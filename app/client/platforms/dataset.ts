import { AigptPath, REQUEST_TIMEOUT_MS } from "@/app/constant";
import { getHeaders } from "../api";
import { Dataset } from "../../store/dataset";
import { ChatMessage } from "@/app/store";
import { CoreferenceResult } from "./aigpt";

export interface CreateNotify {
  name: string;
  collection_name: string;
  status: string;
  detail: string;
}

export interface Message {
  detail: string;
}

export interface GenSchema {
  schema_prompt: string;
}

export interface DatasetStatus {
  id: string;
  name: string;
  schema_prompt: string;
  collection_name: string;
  total_tokens: number;
  error_message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RefDoc {
  page_content: string;
  metadata: { source: string };
  type: string;
}

export interface PromptWithRelevantDocs {
  prompt: string;
  query_type: string;
  relevant_docs: RefDoc[];
  tokens_used: number;
  cost_price: number;
  coreference_result: CoreferenceResult;
}

export interface SearchKwargs {
  k: number;
}

abstract class BaseAPI {
  abstract create(file: File): Promise<[number, CreateNotify]>;
  abstract list(): Promise<[number, Dataset[] | Message]>;
  abstract list_status(
    list_collection_name: string[],
  ): Promise<[number, DatasetStatus[]]>;
  abstract read(collection_name: string): Promise<[number, Dataset]>;
  abstract delete(collection_name: string): Promise<[number, Message]>;
  abstract qa_prompt(
    collection_name: string,
    messages: ChatMessage[],
    search_kwargs: SearchKwargs,
  ): Promise<[number, PromptWithRelevantDocs]>;
  abstract gen_schema(collection_name: string): Promise<[number, GenSchema]>;
  abstract save_schema(
    collection_name: string,
    schema_prompt: string,
  ): Promise<[number, Dataset]>;
}

export class DatasetAPI implements BaseAPI {
  path(path: string): string {
    let aigptUrl = "/api/aigpt";
    if (aigptUrl.endsWith("/")) {
      aigptUrl = aigptUrl.slice(0, aigptUrl.length - 1);
    }
    return [aigptUrl, path].join("/");
  }

  async gen_schema(collection_name: string): Promise<[number, GenSchema]> {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const params = {
      collection_name: collection_name,
    };
    const queryString = new URLSearchParams(params);
    const path = `${this.path(AigptPath.DatasetGenSchema)}?${queryString}`;
    const payload = {
      method: "POST",
      signal: controller.signal,
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return [res.status, resJson];
  }

  async save_schema(
    collection_name: string,
    schema_prompt: string,
  ): Promise<[number, Dataset]> {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const params = {
      collection_name: collection_name,
    };
    const queryString = new URLSearchParams(params);
    const body = {
      schema_prompt: schema_prompt,
    };
    const path = `${this.path(AigptPath.DatasetSchema)}?${queryString}`;
    const payload = {
      method: "PUT",
      body: JSON.stringify(body),
      signal: controller.signal,
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return [res.status, resJson];
  }

  async qa_prompt(
    collection_name: string,
    messages: ChatMessage[],
    search_kwargs: SearchKwargs,
  ): Promise<[number, PromptWithRelevantDocs]> {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const params = {
      collection_name: collection_name,
    };

    const body = {
      messages: messages,
      search_kwargs: search_kwargs,
    };

    const queryString = new URLSearchParams(params);
    const path = `${this.path(AigptPath.DatasetQAPromptPath)}?${queryString}`;
    const payload = {
      method: "POST",
      signal: controller.signal,
      body: JSON.stringify(body),
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return [res.status, resJson];
  }

  async create(file: File): Promise<[number, CreateNotify]> {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    if (!file) {
      console.error("No file selected");
      return [400, {} as CreateNotify];
    }

    const formData = new FormData();
    formData.append("file", file);

    const path = this.path(AigptPath.DatasetPath);
    const headers = getHeaders();
    const payload = {
      method: "POST",
      signal: controller.signal,
      body: formData,
      headers: {
        Accept: headers.Accept,
        Authorization: headers.Authorization,
      },
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return [res.status, resJson];
  }

  async delete(collection_name: string): Promise<[number, Message]> {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    const params = {
      collection_name: collection_name,
    };

    const queryString = new URLSearchParams(params);
    const path = `${this.path(AigptPath.DatasetPath)}?${queryString}`;
    const payload = {
      method: "Delete",
      signal: controller.signal,
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return [res.status, resJson];
  }

  async list(): Promise<[number, Dataset[] | Message]> {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const path = this.path(AigptPath.DatasetListPath);
    const payload = {
      method: "GET",
      signal: controller.signal,
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return [res.status, resJson];
  }

  async list_status(
    list_collection_name: string[],
  ): Promise<[number, DatasetStatus[]]> {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const path = this.path(AigptPath.DatasetListStatusPath);
    const payload = {
      method: "POST",
      body: JSON.stringify(list_collection_name),
      signal: controller.signal,
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return [res.status, resJson];
  }

  async read(collection_name: string): Promise<[number, Dataset]> {
    const controller = new AbortController();
    const requestTimeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    const params = {
      collection_name: collection_name,
    };

    const queryString = new URLSearchParams(params);
    const path = `${this.path(AigptPath.DatasetPath)}?${queryString}`;
    const payload = {
      method: "GET",
      signal: controller.signal,
      headers: getHeaders(),
    };
    const res = await fetch(path, payload);
    clearTimeout(requestTimeoutId);

    const resJson = await res.json();
    return [res.status, resJson];
  }
}

export const dataset_api = new DatasetAPI();
