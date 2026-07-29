import { pluginViteConfig } from '../../vite/pluginBuild.ts';

export default pluginViteConfig({
  code: 'api_too_new',
  entry: 'plugin.tsx',
  outDir: 'dist',
  version: '1.0.0',
});
