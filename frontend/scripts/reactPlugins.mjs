/*
 * The React-UI parts of the in-repo plugins, which build-plugins.mjs packs
 * into the same bundle as the plugin's SolidJS parts.
 *
 * Each country's old `<country>-plugins` repo was imported into `react/`
 * beside its SolidJS port (private/plugins/README.md § The React-UI plugins).
 * A site can switch between the two UIs on demand, so whoever installs a
 * plugin needs both of its frontends, and one bundle carrying both is what
 * makes that impossible to get wrong. The server takes it as it takes any
 * bundle: install is a per-row upsert, a frontend row's id carries its host
 * runtime, and discovery hands each UI the rows of its own runtime.
 *
 * A part is `<dir>/react/frontend/latest` or `<dir>/react/backend/latest` —
 * the layout every imported repo shares. Older versioned folders beside
 * `latest` (forecasting's `frontend/1.0.0`) are history, never built.
 *
 * Built by the legacy client toolchain, as `remote_server_cli
 * generate-plugin-bundle` does: `yarn install` then `yarn build-plugin` (webpack)
 * in the part's own directory, resolving webpack, React and
 * `@openmsupply-client/*` from the repo root's node_modules — so a build
 * needs the root `yarn install` as well as this front end's `pnpm install`.
 *
 * A plugin whose React parts fail — disagree with its other parts, or don't
 * build against today's client/ — gets no bundle and is reported, and the run
 * goes on (build-plugins.mjs). It fails again every run until it is fixed,
 * which is the reminder.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REPO_ROOT = resolve('..');

const PARTS = ['frontend/latest', 'backend/latest'];

/**
 * A plugin directory's React parts, each with its manifest read. Empty for a
 * directory with no `react/`.
 */
export const discoverReactParts = pluginDir => {
  const parts = [];
  for (const part of PARTS) {
    const dir = join(pluginDir, 'react', part);
    const manifestPath = join(dir, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const target = manifest.omSupplyPlugin?.target;
    if (target !== 'frontend' && target !== 'backend') continue;
    parts.push({
      dir,
      target,
      code: manifest.name,
      version: manifest.version ?? '0.0.0',
      types: manifest.omSupplyPlugin.types ?? [],
      variantType: manifest.omSupplyPlugin.variant_type,
      // The CLI's default, for every manifest written before the field.
      hostRuntime: manifest.omSupplyPlugin.host_runtime ?? 'react',
    });
  }
  return parts;
};

/** Fails the run unless the repo root's yarn install has been done. */
export const checkReactToolchain = () => {
  if (!existsSync(join(REPO_ROOT, 'node_modules', 'webpack'))) {
    throw new Error(
      'building the React parts needs the repo root installed: run ' +
        '`yarn install` at the repo root first'
    );
  }
};

const run = (args, cwd) => {
  const result = spawnSync('yarn', args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(
      `${relative(REPO_ROOT, resolve(cwd))}: \`yarn ${args.join(' ')}\` failed`
    );
  }
};

/**
 * Builds one part into `<part>/dist`, from clean: webpack leaves files from
 * an earlier build beside new ones, and every file in `dist/` is packed.
 */
export const buildReactPart = part => {
  rmSync(join(part.dir, 'dist'), { recursive: true, force: true });
  run(['install'], part.dir);
  run(['build-plugin'], part.dir);
};
