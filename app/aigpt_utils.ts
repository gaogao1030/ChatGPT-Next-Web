import { LLMModel } from "./client/api";

export function getDefaultModel(models: Array<LLMModel>) {
  const default_model =
    models.find((i) => i.name == "gpt-4o" && i.available)?.name ||
    models.find((i) => i.name == "gpt-4-turbo" && i.available)?.name ||
    models[0]?.name ||
    "gpt-3.5-turbo";
  console.log("[DefaultModel]", default_model);
  return default_model;
}

export function sortItems(
  items: any[],
  field: string,
  sortOrder: any[],
): any[] {
  const sortOrderMap = new Map(sortOrder.map((name, index) => [name, index]));

  const compareItems = (a: any, b: any) => {
    const aIndex = sortOrderMap.get(a[field]) ?? Infinity;
    const bIndex = sortOrderMap.get(b[field]) ?? Infinity;
    return aIndex - bIndex;
  };

  // Sort items based on the sortOrder
  const sortedItems = items.sort(compareItems);

  return sortedItems;
}
