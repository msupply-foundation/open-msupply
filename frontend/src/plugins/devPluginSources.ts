/*
 * The one module that names the generated virtual module (vite/devPlugins.ts).
 *
 * Its own file for one reason: a STATIC import of `virtual:oms-dev-plugins`
 * only resolves under a Vite config carrying devPluginsPlugin. Keeping it here
 * — imported dynamically by devPlugins.ts, which tests drive with a fake
 * source map — means the unit tests (and any other non-Vite consumer) never
 * have to resolve it.
 */
export { devPlugins } from 'virtual:oms-dev-plugins';
