import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from './pluginImports.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
});

const at = (file, code) => ({ filename: `/repo/frontend/${file}`, code });
const outside = (file, code) => ({
  ...at(file, code),
  errors: [{ messageId: 'outside' }],
});

tester.run('plugin/imports', rule, {
  valid: [
    at(
      'plugins/djibouti/plugin.tsx',
      "import { x } from '@openmsupply/plugin-sdk';"
    ),
    at(
      'plugins/djibouti/plugin.tsx',
      "import { createSignal } from 'solid-js';"
    ),
    at(
      'plugins/cook_islands/src/x.tsx',
      "import { render } from 'solid-js/web';"
    ),
    at('plugins/cook_islands/src/x.tsx', "import x from '../intl';"),
    at(
      'plugins/cook_islands/src/stock-count/x.tsx',
      "import x from '../kit/Kpi';"
    ),
    at(
      'plugins/afghanistan/src/api/x.ts',
      "import x from '../../shared/types';"
    ),
    at(
      'plugins/djibouti/forms/Patient/form.tsx',
      "import x from '../shared/enrolmentId';"
    ),
    // Tests never ship, and read the server's schema.
    at(
      'plugins/cook_islands/src/x.test.ts',
      "import s from '../../../../server/schema.graphql?raw';"
    ),
  ],
  invalid: [
    outside(
      'plugins/djibouti/plugin.tsx',
      "import x from '../../vite.config';"
    ),
    outside(
      'plugins/djibouti/plugin.tsx',
      "import x from '../cook_islands/intl';"
    ),
    outside(
      'plugins/djibouti/forms/Patient/x.tsx',
      "import x from '../../../examples/demo_program/plugin';"
    ),
    outside(
      'plugins/cook_islands/src/stock-count/x.tsx',
      "import x from '../../../djibouti/intl';"
    ),
    outside(
      'plugins/cook_islands/src/x.tsx',
      "import x from '../../djibouti/intl';"
    ),
    outside(
      'plugins/cook_islands/src/x.tsx',
      "import x from '../../../src/intl';"
    ),
    outside('plugins/cook_islands/src/x.tsx', "import x from '@/intl';"),
    outside('plugins/cook_islands/src/x.tsx', "import x from 'lodash';"),
    outside(
      'plugins/cook_islands/src/x.tsx',
      "const x = import('../../djibouti/intl');"
    ),
    outside(
      'plugins/cook_islands/src/x.tsx',
      "export { x } from '../../djibouti/intl';"
    ),
    outside(
      'plugins/cook_islands/src/x.tsx',
      "export * from '../../djibouti/intl';"
    ),
  ],
});
