import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import type { LocaleKey } from '../../../../intl/locales';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  getDateCell,
  getPercentageCell,
  getTextCell,
} from '../../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../../ui/utils/rem';
import { createTableConfig } from '../../../../api/createTableConfig';
import { Button } from '../../../../ui/elements/buttons/Button';
import { ALT_N } from '../../../../ui/utils/shortcuts';
import type { InsurancePolicyFragment } from './insurance.generated';

type Policy = InsurancePolicyFragment;

export interface InsurancePanelProps {
  policies: Policy[];
  loading: boolean;
  /** No add/edit affordance without patient-mutate permission. */
  disabled: boolean;
  onRowClick: (policy: Policy) => void;
  onAdd: () => void;
}

// Policy type renders through its fixed label key (both keys exist in the
// catalog, unlike the reference app's hardcoded English Status literal).
const policyTypeLabel = (type: Policy['policyType']): string =>
  t(`policyType.${type}` as LocaleKey);

// The Insurance tab's policy list (spec/patients ui-surface › Insurance tab).
// Presentational: the resource, refetch, and the add/edit modal live in the
// detail view; this renders the table + empty state and reports row clicks /
// the empty-state add. No row selection and no delete (a policy persists).
export const InsurancePanel: Component<InsurancePanelProps> = props => {
  const tableConfig = createTableConfig({
    tableId: 'patient-insurance-list',
  });

  // Cell-type presets carry the rendering AND the width
  // (ui/docs/CELL_TYPES.md). None of these keys is in the shared CELL_DEF map,
  // so each takes an explicit helper plus a call-site `size` — sized to the
  // header label, which is the wider constraint on every column here. The
  // expiry date is the PLAIN date cell, not the expiry preset: the near-expiry
  // red tone is a stock-expiry signal, and this column is typed a date
  // (spec/patients ui-surface › Insurance tab).
  const columns = (): Column<Policy, never>[] => [
    {
      c: { key: 'policyNumber' },
      header: () => t('label.policy-number'),
      ...getTextCell(),
      size: remToPx(10),
    },
    {
      c: {
        accessor: p => p.insuranceProviders?.providerName ?? '',
        id: 'providerName',
      },
      header: () => t('label.provider-name'),
      ...getTextCell(),
      size: remToPx(12),
    },
    {
      c: { accessor: p => policyTypeLabel(p.policyType), id: 'policyType' },
      header: () => t('label.policy-type'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      // The percentage cell formats the number (locale, `%` suffix) — the value
      // is the bare rate, never a pre-formatted string.
      c: { key: 'discountPercentage' },
      header: () => t('label.discount-rate'),
      ...getPercentageCell(),
      size: remToPx(7.5),
    },
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry-date'),
      ...getDateCell(),
      size: remToPx(8.125),
    },
    {
      c: {
        accessor: p => (p.isActive ? t('label.active') : t('label.inactive')),
        id: 'status',
      },
      header: () => t('label.status'),
      ...getTextCell(),
      size: remToPx(6),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={props.policies}
      rowKey={p => p.id}
      loading={props.loading}
      onRowClick={props.disabled ? undefined : props.onRowClick}
      emptyMessage={t('messages.no-insurance')}
      empty={
        props.disabled ? undefined : (
          <Button
            variant="ghost"
            // The patient detail declares Alt+N for this action; this is one of
            // the two controls that advertise it (ui-surface S2).
            shortcut={ALT_N}
            data-testid="add-insurance-button"
            onClick={props.onAdd}
          >
            {t('button.add-insurance')}
          </Button>
        )
      }
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      configIsDefault={tableConfig.isConfigDefault()}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
    />
  );
};
