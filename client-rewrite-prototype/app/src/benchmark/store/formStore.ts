import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";
import type { Draft, FieldValue } from "@/benchmark/StateAdapter";

/*
 * The Zustand tier's store — a fresh vanilla store per mount (so switching
 * field count or tier starts clean). `setValue` replaces the `values` object,
 * but each field component subscribes with a per-field selector (`s =>
 * s.values[path]`), so Zustand's Object.is comparison on the SELECTOR OUTPUT
 * re-renders only the field whose value actually changed. That selector-level
 * equality — not context-value equality — is the whole advantage being
 * measured.
 */
export interface FormState {
  values: Record<string, FieldValue>;
  setValue: (path: string, value: FieldValue) => void;
  reset: (initial: Draft) => void;
}

export type FormStore = StoreApi<FormState>;

export const createFormStore = (initial: Draft): FormStore =>
  createStore<FormState>((set) => ({
    values: initial.values,
    setValue: (path, value) => set((state) => ({ values: { ...state.values, [path]: value } })),
    reset: (init) => set({ values: init.values }),
  }));
