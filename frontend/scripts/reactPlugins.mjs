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
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const REPO_ROOT = resolve('..');

const PARTS = ['frontend/latest', 'backend/latest'];

/*
 * What is not built, by repo-relative path — a plugin directory or one part —
 * and why. A plugin listed whole gets no React rows at all; with no SolidJS
 * parts either, it gets no bundle. A part is only listed alone when the
 * bundle is complete without it: a bundle missing a part its other parts call
 * is the half-installed plugin this whole arrangement exists to prevent.
 */
export const NOT_BUILT = {
  'plugins/open_msupply':
    "the React UI's reference plugins — examples, not a deployment's plugin",
  'plugins/forecasting':
    "type errors against today's client/ plugin types (drift since its last commit)",
  'private/plugins/congo':
    "its backend has type errors against today's client/ plugin types, and its frontend calls it",
  'private/plugins/niger':
    'its backend no longer matches TransformRequestRequisitionLineOutput',
  'private/plugins/liberia/react/frontend/latest':
    "installs its own webpack, which clashes with the shared config's — and registers no contributions",
};

const notBuilt = path => {
  const rel = relative(REPO_ROOT, resolve(path));
  return Object.entries(NOT_BUILT).find(
    ([listed]) => rel === listed || rel.startsWith(`${listed}/`)
  )?.[1];
};

/**
 * A plugin directory's React parts, each with its manifest read and `skipped`
 * set to the reason when it is not built. Empty for a directory with no
 * `react/`.
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
      skipped: notBuilt(dir),
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
