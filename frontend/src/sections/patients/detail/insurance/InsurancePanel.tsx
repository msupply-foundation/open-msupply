import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import type { LocaleKey } from '../../../../intl/locales';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { getDateCell } from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import { Button } from '../../../../ui/elements/buttons/Button';
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

  const columns = (): Column<Policy, never>[] => [
    {
      c: { key: 'policyNumber' },
      header: () => t('label.policy-number'),
    },
    {
      c: {
        accessor: p => p.insuranceProviders?.providerName ?? '',
        id: 'providerName',
      },
      header: () => t('label.provider-name'),
    },
    {
      c: { accessor: p => policyTypeLabel(p.policyType), id: 'policyType' },
      header: () => t('label.policy-type'),
    },
    {
      c: { accessor: p => `${p.discountPercentage}%`, id: 'discountRate' },
      header: () => t('label.discount-rate'),
      meta: { align: 'right' },
    },
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry-date'),
      ...getDateCell(),
    },
    {
      c: {
        accessor: p => (p.isActive ? t('label.active') : t('label.inactive')),
        id: 'status',
      },
      header: () => t('label.status'),
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
            data-testid="add-insurance-button"
            onClick={props.onAdd}
          >
            {t('button.add-insurance')}
          </Button>
        )
      }
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
    />
  );
};
