/*
 * The plugin's namespaced translator (spec/plugins/rules.md §
 * internationalisation): every string of the demo program resolves through
 * `pluginIntl(code)`, so its keys live under `demo_program:` and cannot
 * collide with the host's or another plugin's.
 */
import { pluginIntl } from '@openmsupply/plugin-sdk';
import { name } from './package.json';

export const intl = pluginIntl(name);
