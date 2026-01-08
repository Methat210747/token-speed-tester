import { encoding_for_model, get_encoding } from "tiktoken";
import type { TiktokenModel } from "tiktoken";

const FALLBACK_ENCODING = "cl100k_base";

export function createTokenizer(model: string) {
  try {
    return encoding_for_model(model as TiktokenModel);
  } catch {
    return get_encoding(FALLBACK_ENCODING);
  }
}
