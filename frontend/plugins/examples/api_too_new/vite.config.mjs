// Identity (code, version) comes from package.json; outDir defaults to dist.
import { pluginViteConfig } from '../../../vite/pluginBuild.ts';

export default pluginViteConfig({ entry: 'plugin.tsx' });
