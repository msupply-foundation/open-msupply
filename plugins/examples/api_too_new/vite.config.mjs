// Identity (code, version) comes from package.json; outDir defaults to dist.
import { pluginViteConfig } from '../../../frontend/vite/pluginBuild.ts';

export default pluginViteConfig({ entry: 'plugin.tsx' });
