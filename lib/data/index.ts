import type { DataApi } from "./api";
import { mockApi } from "./mock";

// Swap this line for the Supabase implementation later. Nothing else changes.
export const api: DataApi = mockApi;

export * from "./api";
