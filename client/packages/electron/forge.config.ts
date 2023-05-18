import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { MakerDMG } from '@electron-forge/maker-dmg';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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
  hooks: {
    packageAfterPrune: async (_forgeConfig, buildPath) => {
      console.log(buildPath);

      const packageJson = JSON.parse(
        fs.readFileSync(path.resolve(buildPath, 'package.json')).toString()
      );

      packageJson.dependencies = {
        serialport: '^11.0.0',
      };

      fs.writeFileSync(
        path.resolve(buildPath, 'package.json'),
        JSON.stringify(packageJson)
      );

      return new Promise((resolve, reject) => {
        const npmInstall = spawn('yarn', ['install', '--production=true'], {
          cwd: buildPath,
          stdio: 'inherit',
          shell: true,
        });

        npmInstall.on('close', code => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('process finished with error code ' + code));
          }
        });

        npmInstall.on('error', error => {
          reject(error);
        });
      });
    },
  },
};

export default config;
