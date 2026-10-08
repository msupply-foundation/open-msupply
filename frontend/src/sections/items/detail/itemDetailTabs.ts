import { t } from '../../../intl';
import type { TabDef } from '../../../ui/elements/tabs/Tabs';

// Item detail tab visibility (spec/items/rules.md § central-only management,
// OMS-REG-CAT-05.1/.2). Pure so the central-only Variants tab is unit-tested
// without the screen. Fixed order per ui-surface.md § S2 Tabs; every tab but
// Variants is shown regardless of server role.
export const visibleTabs = (centralServer: boolean): TabDef[] => [
  { value: 'general', label: t('label.general') },
  { value: 'store', label: t('label.store') },
  { value: 'master-lists', label: t('label.master-lists') },
  { value: 'ledger', label: t('label.ledger') },
  { value: 'ancillary', label: t('title.ancillary-supplies') },
  { value: 'custom-fields', label: t('label.custom-fields') },
  ...(centralServer ? [{ value: 'variants', label: t('label.variants') }] : []),
  { value: 'log', label: t('label.log') },
];
