/*
 * `@openmsupply/plugin-sdk` — the ONLY module a frontend plugin may import
 * besides `solid-js` and its subpaths (spec/plugins/sdk-contract.md § imports).
 *
 * Everything a plugin needs reaches it through here, and nothing else does: a
 * plugin never imports host application source, so host internals churn freely
 * without breaking an installed bundle. If a plugin needs something this file
 * does not export, that is a gap to file against the SDK — not a licence to
 * reach into `src/`. The alias-free plugin build config makes the rule
 * enforceable rather than aspirational: a deep import into host source simply
 * fails to resolve.
 *
 * ── Why this module is LAZY ──────────────────────────────────────────────────
 * kdd/bundling reasons about the SDK as eager startup weight, because it must
 * be live before any plugin evaluates. It doesn't have to be *startup* weight
 * though: the loader `import()`s this module, and only when there is at least
 * one plugin to load. So a deployment with no plugins pays nothing, and one
 * with plugins pays a separate chunk — which is also where the UI kit's
 * components land, shared with the host's own copies. Keep the re-export list
 * below deliberate all the same: everything here is public API a plugin may
 * come to depend on, and every addition is an API commitment.
 */

// ── Slot API, manifest, versioning ───────────────────────────────────────────
export { PLUGIN_API_VERSION, SLOTS } from './types';
export type {
  Contribution,
  FieldValidity,
  FormParticipation,
  PluginDefinition,
  PluginManifest,
  PrescriptionPaymentDto,
  PrescriptionPaymentFormProps,
  SaveContext,
  SlotContext,
  SlotContribution,
  SlotId,
} from './types';
export { contribute, definePlugin } from './definePlugin';

// ── Plugin runtime: own data, own identity, session context ──────────────────
export {
  usePluginCode,
  usePluginContext,
  usePluginData,
} from './pluginRuntime';
export type {
  PluginDataQuery,
  PluginDataRow,
  PluginDataStore,
  PluginDataWrite,
  PluginDataOutcome,
} from '../pluginData';

// ── Intl ─────────────────────────────────────────────────────────────────────
/*
 * `t` resolves against the host catalogue, so a plugin's keys are compile-
 * checked (`LocaleKey` is a union over `src/intl/locales/en/common.json`) — the
 * old client's plugins passed raw strings and silently rendered keys when the
 * host dropped one. Plugin-SHIPPED translations under a `code` namespace
 * (rules § internationalisation) are not implemented yet: a plugin's strings
 * must currently be host keys. ⚠️ Tracked in the plugin-loading KDD.
 */
export { t, tPlural, locale, isRtl } from '../../intl';
export type { LocaleKey } from '../../intl';
export {
  formatNumber,
  round,
  roundTo,
  localisedDate,
  localisedDateTime,
} from '../../intl';
/*
 * The entered store's currency minor units. Any plugin doing money arithmetic
 * needs it: a figure it STORES or compares must be rounded to the currency, and
 * hard-coding 2 is wrong for the zero-decimal currencies this product actually
 * runs on (XOF in Côte d'Ivoire, among others).
 */
export { currencyDecimals } from './currency';

// ── UI kit ───────────────────────────────────────────────────────────────────
/*
 * The host's own components, so a contribution looks native for free and no
 * plugin ever bundles a second copy of a control. Deliberately a small starter
 * set — the union of what the audited country plugins' *form* surfaces use
 * (kdd/plugin-loading/evidence/interface-audits/). The heavy components
 * (DataTable, date pickers, the rich pickers) are NOT here yet: sdk-contract
 * requires them as host-owned `lazy()` wrappers so the implementation stays a
 * host chunk shared by everyone, and that wrapper layer lands with the first
 * contribution that needs one (CIV's requisition info panel).
 */
export { Alert } from '../../ui/elements/feedback/Alert';
export { Button } from '../../ui/elements/buttons/Button';
export { Checkbox } from '../../ui/elements/inputs/Checkbox';
export { CurrencyField } from '../../ui/elements/inputs/CurrencyField';
export { FieldRow } from '../../ui/elements/inputs/FieldRow';
export { NumberField } from '../../ui/elements/inputs/NumberField';
export { Select } from '../../ui/elements/selectors/Select';
export type { SelectOption } from '../../ui/elements/selectors/Select';
export { TextField } from '../../ui/elements/inputs/TextField';
export { Text } from '../../ui/elements/typography/Text';
export { FormColumn } from '../../ui/layout/Form/FormColumn';
export { FormColumns } from '../../ui/layout/Form/FormColumns';
export { Stack } from '../../ui/layout/Stack/Stack';
