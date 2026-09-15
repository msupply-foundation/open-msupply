import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

// The discovery page's own transitive slice of the new front end's build,
// staged into ./discovery-page for extraResource below.
//
// This is a forge HOOK rather than an npm `prepackage` script, and that is the
// whole point: npm only runs `prepackage` for `yarn package`, while CI (and
// everyone else) packages with `yarn electron:build` -> `make`, which drives
// forge's packaging step internally and never touches the npm script. Wired
// that way, `yarn package` staged the directory and `yarn make` did not, and
// the only symptom was an opaque ENOENT from extraResource on a missing path.
// A hook runs for both.
//
// Paths are resolved from this file, not from the working directory, because a
// hook's cwd is forge's, not the one the script was launched from.
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const DISCOVERY_PAGE_DIR = path.join(__dirname, 'discovery-page');

const stageDiscoveryPage = (): void => {
  const dist = path.join(REPO_ROOT, 'frontend', 'dist');
  // Said plainly, because the alternative is a bare ENOENT on a manifest path
  // that does not explain what to do about it.
  if (!existsSync(path.join(dist, '.vite', 'manifest.json'))) {
    throw new Error(
      `Cannot stage the discovery page: ${dist} has no build manifest. ` +
        'Build the new front end first (cd frontend && pnpm build) — the ' +
        "installer carries that build's discovery page."
    );
  }
  execFileSync(
    process.execPath,
    [
      path.join(REPO_ROOT, 'frontend', 'scripts', 'prune-discovery-dist.mjs'),
      dist,
      DISCOVERY_PAGE_DIR,
    ],
    { stdio: 'inherit' }
  );
};

const config: ForgeConfig = {
  hooks: {
    // Before packaging, whichever command started it. Deliberately not
    // `generateAssets`, which also runs for `yarn start` — an unpackaged run
    // serves the page straight out of frontend/dist (src/discoveryHost.ts
    // § pageDir), so it needs nothing staged and must not require a built
    // front end just to launch.
    prePackage: async () => stageDiscoveryPage(),
  },
  packagerConfig: {
    icon: './src/public/oms',
    asar: {
      unpack: '**/*.node',
    },
    // The new front end's discovery page, served over loopback by
    // src/discoveryHost.ts because no server can serve the screen you choose a
    // server on. Only the page's own transitive slice of the front end build —
    // staged by the prePackage hook above, which walks the build manifest — so
    // the installer carries the page, not the whole product.
    extraResource: [DISCOVERY_PAGE_DIR],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({ name: 'omSupply' }),
    new MakerZIP({}, ['darwin', 'windows', 'linux']),
    new MakerDMG({ name: 'omSupply', icon: 'src/public/oms.png' }, ['darwin']),
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      // needed for api requests during discovery
      devContentSecurityPolicy: 'connect-src *',
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
  ],
};

export default config;
