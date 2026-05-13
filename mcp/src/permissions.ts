import { PermissionConfig } from './config.js';

export type PresetMode = 'read-only' | 'read-write' | 'safe-mutations';

const DELETE_TOOLS = [
  'delete_location',
  'delete_stocktake',
  'delete_request_requisition',
  'delete_purchase_order',
  'delete_outbound_shipment',
  'delete_inbound_shipment',
];

export function applyPresetMode(
  base: PermissionConfig,
  mode: PresetMode
): PermissionConfig {
  switch (mode) {
    case 'read-only':
      return { ...base, queries: true, mutations: false, categories: {} };
    case 'read-write':
      return { ...base, queries: true, mutations: true, categories: {} };
    case 'safe-mutations':
      return {
        ...base,
        queries: true,
        mutations: true,
        categories: {},
        disabledTools: Array.from(
          new Set([...base.disabledTools, ...DELETE_TOOLS])
        ),
      };
  }
}

export function isPresetMode(value: string): value is PresetMode {
  return value === 'read-only' || value === 'read-write' || value === 'safe-mutations';
}

export type ToolKind = 'query' | 'mutation';

export class PermissionsState {
  constructor(private _current: PermissionConfig) {}
  get current(): PermissionConfig {
    return this._current;
  }
  set(next: PermissionConfig): void {
    this._current = next;
  }
}

export interface ToolMetadata {
  name: string;
  category: string;
  kind: ToolKind;
}

export function isToolAllowed(tool: ToolMetadata, permissions: PermissionConfig): boolean {
  // 1. Explicit allowlist — if set, only those tools pass
  if (permissions.enabledTools.length > 0) {
    return permissions.enabledTools.includes(tool.name);
  }

  // 2. Explicit denylist
  if (permissions.disabledTools.includes(tool.name)) {
    return false;
  }

  // 3. Category-level override (takes priority over master switch)
  const categoryConfig = permissions.categories[tool.category];
  if (categoryConfig) {
    const categoryValue = tool.kind === 'query' ? categoryConfig.queries : categoryConfig.mutations;
    if (categoryValue !== undefined) {
      return categoryValue;
    }
  }

  // 4. Master switch
  if (tool.kind === 'query') return permissions.queries;
  if (tool.kind === 'mutation') return permissions.mutations;

  return false;
}
