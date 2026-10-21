import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from './pluginImports.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
});

const at = (file, code) => ({ filename: `/repo/${file}`, code });
const outside = (file, code) => ({
  ...at(file, code),
  errors: [{ messageId: 'outside' }],
});

tester.run('plugin/imports', rule, {
  valid: [
    at(
      'private/plugins/djibouti/plugin.tsx',
      "import { x } from '@openmsupply/plugin-sdk';"
    ),
    at(
      'private/plugins/djibouti/plugin.tsx',
      "import { createSignal } from 'solid-js';"
    ),
    at(
      'private/plugins/cook_islands/src/x.tsx',
      "import { render } from 'solid-js/web';"
    ),
    at('private/plugins/cook_islands/src/x.tsx', "import x from '../intl';"),
    at(
      'private/plugins/cook_islands/src/stock-count/x.tsx',
      "import x from '../kit/Kpi';"
    ),
    at(
      'private/plugins/afghanistan/src/api/x.ts',
      "import x from '../../shared/types';"
    ),
    at(
      'private/plugins/djibouti/forms/Patient/form.tsx',
      "import x from '../shared/enrolmentId';"
    ),
    // Tests never ship, and read the server's schema.
    at(
      'private/plugins/cook_islands/src/x.test.ts',
      "import s from '../../../../../server/schema.graphql?raw';"
    ),
  ],
  invalid: [
    outside(
      'private/plugins/djibouti/plugin.tsx',
      "import x from '../../../frontend/vite.config';"
    ),
    outside(
      'private/plugins/djibouti/plugin.tsx',
      "import x from '../cook_islands/intl';"
    ),
    outside(
      'private/plugins/djibouti/forms/Patient/x.tsx',
      "import x from '../../../../../plugins/examples/demo_program/plugin';"
    ),
    outside(
      'private/plugins/cook_islands/src/stock-count/x.tsx',
      "import x from '../../../djibouti/intl';"
    ),
    outside(
      'private/plugins/cook_islands/src/x.tsx',
      "import x from '../../djibouti/intl';"
    ),
    outside(
      'private/plugins/cook_islands/src/x.tsx',
      "import x from '../../../../frontend/src/intl';"
    ),
    outside(
      'private/plugins/cook_islands/src/x.tsx',
      "import x from '@/intl';"
    ),
    outside(
      'private/plugins/cook_islands/src/x.tsx',
      "import x from 'lodash';"
    ),
    outside(
      'private/plugins/cook_islands/src/x.tsx',
      "const x = import('../../djibouti/intl');"
    ),
    outside(
      'private/plugins/cook_islands/src/x.tsx',
      "export { x } from '../../djibouti/intl';"
    ),
    outside(
      'private/plugins/cook_islands/src/x.tsx',
      "export * from '../../djibouti/intl';"
    ),
  ],
});
