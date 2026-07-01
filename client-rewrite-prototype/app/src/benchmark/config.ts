import type { Draft } from '@/benchmark/StateAdapter';

/*
 * Static configuration + tiny helpers for the benchmark harness. No React here.
 */

export type Impl = 'naive' | 'context-memo' | 'zustand';
export type Mode = 'single' | 'side';

export const TIERS: readonly { value: Impl; label: string }[] = [
  { value: 'naive', label: 'Naive' },
  { value: 'context-memo', label: 'Context+Memo' },
  { value: 'zustand', label: 'Zustand' },
];

export const FIELD_COUNTS = [50, 200, 500, 1000] as const;
export type FieldCount = (typeof FIELD_COUNTS)[number];

export const MAX_FIELDS = 1000;

/*
 * `context-memo` shards the draft into fixed-size regions, one React context each.
 * A keystroke rewrites only its region's context, so only that region re-renders.
 * The context pool is sized for the maximum field count so identities stay stable.
 */
export const GROUP_SIZE = 25;
export const GROUP_COUNT = Math.ceil(MAX_FIELDS / GROUP_SIZE);

export const DEFAULT_MODE: Mode = 'side';
export const DEFAULT_IMPL: Impl = 'naive';
export const DEFAULT_FIELDS: FieldCount = 200;

export const fieldPath = (index: number): string => `f${index}`;
const indexOfPath = (path: string): number => Number(path.slice(1));
export const groupOfPath = (path: string): number =>
  Math.floor(indexOfPath(path) / GROUP_SIZE);

export const makeInitialDraft = (fields: number): Draft => {
  const values: Record<string, string> = {};
  for (let i = 0; i < fields; i++) values[fieldPath(i)] = '';
  return { values };
};

/* --- URL params (reproducibility; no router in this prototype) --------------- */

export interface BenchParams {
  mode: Mode;
  impl: Impl;
  fields: FieldCount;
}

const isImpl = (value: string | null): value is Impl =>
  TIERS.some((tier) => tier.value === value);
const isMode = (value: string | null): value is Mode =>
  value === 'single' || value === 'side';
const isFieldCount = (value: number): value is FieldCount =>
  (FIELD_COUNTS as readonly number[]).includes(value);

export const readParams = (): BenchParams => {
  const query = new URLSearchParams(window.location.search);
  const impl = query.get('impl');
  const mode = query.get('mode');
  const fields = Number(query.get('fields'));
  return {
    mode: isMode(mode) ? mode : DEFAULT_MODE,
    impl: isImpl(impl) ? impl : DEFAULT_IMPL,
    fields: isFieldCount(fields) ? fields : DEFAULT_FIELDS,
  };
};

export const writeParams = (params: BenchParams): void => {
  const query = new URLSearchParams(window.location.search);
  query.set('mode', params.mode);
  query.set('impl', params.impl);
  query.set('fields', String(params.fields));
  window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
};
