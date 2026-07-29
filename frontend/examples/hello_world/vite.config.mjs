// What the plugin CLI runs (`yarn install && yarn build-plugin`). An
// out-of-tree plugin imports the same preset from
// '@openmsupply/plugin-sdk/vite'; in-repo examples reach it by path.
import { pluginViteConfig } from '../../vite/pluginBuild.ts';

export default pluginViteConfig({
  code: 'hello_world',
  entry: 'plugin.tsx',
  outDir: 'dist',
  version: '1.0.0',
});
