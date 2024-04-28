import { LLMModel } from "./client/api";

export function getDefaultModel(models: Array<LLMModel>) {
  const default_model =
    models.find((i) => i.name == "gpt-4-turbo" && i.available)?.name ||
    models[0]?.name ||
    "gpt-3.5-turbo";
  return default_model;
}
