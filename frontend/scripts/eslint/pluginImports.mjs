/*
 * A country plugin's front-end code imports only the SDK and solid-js
 * (spec/plugins/sdk-contract.md § imports), and its own files. The `@/`
 * alias is unresolvable in plugin code (tsconfig.plugins.json and the plugin
 * build preset omit it), but a relative path resolves at type-check and
 * build time alike, and the build would bundle a frozen copy of whatever it
 * reached: the host's source, another plugin, build config. Only lint closes
 * that, so this rule resolves each relative import against its file and
 * holds it inside the plugin's own folder, `plugins/<dir>/`, however deep the
 * file sits, and holds a package import to the two the contract names.
 *
 * Tests are exempt: they run under vitest and never ship, and read the
 * server's schema, vitest and node modules.
 */
import path from 'node:path';

const PACKAGES = ['@openmsupply/plugin-sdk', 'solid-js'];

const MESSAGE =
  'A plugin may import only @openmsupply/plugin-sdk and solid-js ' +
  '(spec/plugins/sdk-contract.md § imports), and its own files. Missing ' +
  'something? That is a gap to add to the SDK.';

const allowedPackage = specifier =>
  PACKAGES.some(name => specifier === name || specifier.startsWith(`${name}/`));

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: "Holds a plugin's imports to the SDK and its own files",
    },
    messages: { outside: MESSAGE },
    schema: [],
  },
  create(context) {
    const file = context.filename.split(path.sep).join('/');
    if (/\.test\.tsx?$/.test(file)) return {};
    const root = /^(.*\/plugins\/[^/]+)\//.exec(file)?.[1];
    if (!root) return {};

    const inside = specifier => {
      if (!specifier.startsWith('.')) return allowedPackage(specifier);
      // A query (`?raw`) is the bundler's, not part of the path.
      const target = path.posix.resolve(
        path.posix.dirname(file),
        specifier.replace(/\?.*$/, '')
      );
      return target === root || target.startsWith(`${root}/`);
    };
    const check = source => {
      if (source?.type !== 'Literal' || typeof source.value !== 'string')
        return;
      if (!inside(source.value))
        context.report({ node: source, messageId: 'outside' });
    };

    return {
      ImportDeclaration: node => check(node.source),
      ExportNamedDeclaration: node => check(node.source),
      ExportAllDeclaration: node => check(node.source),
      ImportExpression: node => check(node.source),
    };
  },
};
