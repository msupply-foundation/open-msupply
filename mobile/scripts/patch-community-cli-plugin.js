/**
 * Patches @react-native/community-cli-plugin to filter undefined entries from
 * unstable_extraMiddleware. In RN 0.76.x, runServer.js references
 * _cliServerApi.indexPageMiddleware which is not exported by any version of
 * @react-native-community/cli-server-api. This causes Metro's dev server to
 * crash with "Cannot read properties of undefined (reading 'handle')".
 */
const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'community-cli-plugin',
  'dist',
  'commands',
  'start',
  'runServer.js',
);

if (!fs.existsSync(targetFile)) {
  console.log('patch-community-cli-plugin: target file not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

if (content.includes('.filter(Boolean)')) {
  console.log('patch-community-cli-plugin: already applied, skipping');
  process.exit(0);
}

// Match the unstable_extraMiddleware array closing bracket and add .filter(Boolean)
const patched = content.replace(
  /(unstable_extraMiddleware:\s*\[[\s\S]*?middleware,\s*\])(,)/,
  '$1.filter(Boolean)$2',
);

if (patched === content) {
  console.error(
    'patch-community-cli-plugin: pattern not found, patch could not be applied',
  );
  process.exit(1);
}

fs.writeFileSync(targetFile, patched, 'utf8');
console.log(
  'patch-community-cli-plugin: successfully patched @react-native/community-cli-plugin',
);
