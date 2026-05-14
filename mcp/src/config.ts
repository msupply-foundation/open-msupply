import { applyPresetMode, isPresetMode, PresetMode } from './permissions.js';

export interface Config {
  url?: string;
  username?: string;
  password?: string;
  storeId?: string;
  allowSelfSigned: boolean;
  /** Overrides provided via env vars; these "win" over browser-entered values. */
  envOverrides: {
    url?: string;
    username?: string;
    password?: string;
    mode?: PresetMode;
  };
}

export interface CategoryPermission {
  queries?: boolean;
  mutations?: boolean;
}

export interface PermissionConfig {
  queries: boolean;
  mutations: boolean;
  categories: Record<string, CategoryPermission>;
  disabledTools: string[];
  enabledTools: string[];
}

export interface McpConfig {
  server: Config;
  permissions: PermissionConfig;
}

const ALL_CATEGORIES = [
  'system', 'items', 'stock', 'invoices', 'requisitions',
  'stocktakes', 'locations', 'purchase_orders', 'names',
  'master_lists', 'dashboard', 'reports', 'files', 'documents',
];

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function loadPermissions(): PermissionConfig {
  const permissions: PermissionConfig = {
    queries: true,
    mutations: false,
    categories: {},
    disabledTools: parseCsv(process.env.OMSUPPLY_DISABLED_TOOLS),
    enabledTools: parseCsv(process.env.OMSUPPLY_ENABLED_TOOLS),
  };

  if (process.env.OMSUPPLY_ALLOW_MUTATIONS === 'true' || process.env.OMSUPPLY_ALLOW_MUTATIONS === '1') {
    permissions.mutations = true;
  }

  const allowedCategories = parseCsv(process.env.OMSUPPLY_ALLOWED_CATEGORIES);
  if (allowedCategories.length > 0) {
    for (const cat of ALL_CATEGORIES) {
      if (!allowedCategories.includes(cat)) {
        permissions.categories[cat] = { queries: false, mutations: false };
      }
    }
  }

  return permissions;
}

export function loadConfig(): McpConfig {
  const url = process.env.OMSUPPLY_URL?.replace(/\/$/, '');
  const username = process.env.OMSUPPLY_USERNAME;
  const password = process.env.OMSUPPLY_PASSWORD;
  const storeId = process.env.OMSUPPLY_STORE_ID;
  const allowSelfSigned =
    process.env.OMSUPPLY_ALLOW_SELF_SIGNED === 'true' ||
    process.env.OMSUPPLY_ALLOW_SELF_SIGNED === '1';

  const modeEnv = process.env.OMSUPPLY_MODE;
  const mode = modeEnv && isPresetMode(modeEnv) ? modeEnv : undefined;
  if (modeEnv && !mode) {
    console.error(
      `[open-msupply-mcp] Ignoring unknown OMSUPPLY_MODE=${modeEnv}. Valid: read-only, read-write, safe-mutations.`
    );
  }

  let permissions = loadPermissions();
  if (mode) permissions = applyPresetMode(permissions, mode);

  return {
    server: {
      url,
      username,
      password,
      storeId,
      allowSelfSigned,
      envOverrides: { url, username, password, mode },
    },
    permissions,
  };
}
