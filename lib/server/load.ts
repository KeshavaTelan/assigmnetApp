import "server-only";
import { cache } from "react";

import { buildModel, type Model } from "@/lib/calc/model";
import { readStore, storeIsEmpty } from "@/lib/store/repository";

// `cache` keeps this to one read and one rate build per request.
export const loadModel = cache(async (): Promise<Model> => buildModel(await readStore()));

export async function loadModelOrEmpty(): Promise<{ model: Model; isEmpty: boolean }> {
  const model = await loadModel();
  return { model, isEmpty: storeIsEmpty(model.store) };
}
