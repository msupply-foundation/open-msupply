// What the plugin CLI runs (`yarn install && yarn build-plugin`). An
// out-of-tree plugin imports the same preset from
// '@openmsupply/plugin-sdk/vite'; in-repo examples reach it by path.
// Identity (code, version) comes from package.json; outDir defaults to dist.
import { pluginViteConfig } from '../../vite/pluginBuild.ts';

export default pluginViteConfig({ entry: 'plugin.tsx' });
