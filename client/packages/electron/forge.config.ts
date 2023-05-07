import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { MakerDMG } from '@electron-forge/maker-dmg';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: { icon: './src/public/oms' },
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
