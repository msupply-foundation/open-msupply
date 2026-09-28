import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t, tPlural } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '@/ui/elements/buttons/Button';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getBooleanCell } from '@/ui/elements/table/BooleanCell';
import { getCellDefinition } from '@/ui/elements/table/tableHelpers';
import {
  FilterSelect,
  FilterBar,
  constructFilters,
} from '@/ui/elements/selectors/FilterBar';
import { createTableConfig } from '@/api/createTableConfig';
import { CloseIcon, PlusCircleIcon } from '@/ui/icons';
import { useUrlQueryState } from '@/list/urlQueryState';
import { stripEmpty } from '@/typeHelpers';
import {
  AssetLogReasons,
  DeleteLogReason,
  type AssetLogReasonsVariables,
} from './logReasons.generated';
import {
  statusLabel,
  statusOptions,
  type AssetLogStatus,
  type LogReasonRow,
} from './logReasons';
import { CreateLogReasonModal } from './CreateLogReasonModal';
import { DeleteSelectedAction } from '../DeleteSelectedAction';
import { REASON_WRITE, guardWrite, writesOffered } from '../access';
import { outcomeOf } from '../refusals';

// Catalogue › Assets › Log reasons (spec/asset-catalogue S3): every live
// reason in one read (a short configuration list — no pagination footer),
// ordered by status, the only order the server offers. Create and Delete on
// the central server only.

type ReasonFilter = NonNullable<AssetLogReasonsVariables['filter']>;
type SortKey = NonNullable<AssetLogReasonsVariables['sort']>[number]['key'];

type ReasonsState = {
  filter: ReasonFilter;
  sort?: AssetLogReasonsVariables['sort'];
};

const DEFAULT_STATE: ReasonsState = {
  filter: {},
  sort: [{ key: 'status', desc: false }],
};

// The one filter: status (rules § log reasons). Every other key of the
// generated filter input is not offered.
const FILTERS = constructFilters<ReasonFilter>({
  assetLogStatus: {
    label: () => t('label.status'),
    render: props => (
      <FilterSelect<AssetLogStatus>
        label={t('label.status')}
        testId={props.testId}
        value={props.filter().assetLogStatus?.equalTo ?? ''}
        options={[{ value: '', label: t('label.any') }, ...statusOptions()]}
        onChange={value =>
          props.setPartialFilter({
            assetLogStatus: value ? { equalTo: value } : null,
          })
        }
      />
    ),
  },
  id: null,
  reason: null,
});

const LogReasonsList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<ReasonsState>(DEFAULT_STATE);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [createOpen, setCreateOpen] = createSignal(false);

  const tableConfig = createTableConfig({
    tableId: 'asset-log-reasons',
    defaultConfig: { compact: { viewMode: 'card' } },
  });

  const variables = createMemo<AssetLogReasonsVariables>(() => ({
    storeId: params.storeId,
    filter: stripEmpty(query().filter),
    sort: query().sort,
  }));
  const [data, { refetch }] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        AssetLogReasons,
        JSON.parse(serialised) as AssetLogReasonsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.assetLogReasons;
    }
  );
  const rows = () => gated(data)?.nodes ?? [];

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort?.[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  const openCreate = () => {
    if (guardWrite(REASON_WRITE)) setCreateOpen(true);
  };

  const selectedRows = () =>
    rows().filter(row => selectedIds().includes(row.id));

  const deleteOne = async (row: LogReasonRow) =>
    outcomeOf(
      await graphqlFetch(
        DeleteLogReason,
        { id: row.id },
        { returnGraphqlErrors: true }
      )
    );

  const columns = (): Column<LogReasonRow, SortKey>[] => [
    {
      c: {
        accessor: row => statusLabel(row.assetLogStatus),
        id: 'assetLogStatus',
      },
      sortKey: 'status',
      header: () => t('label.status'),
      meta: { headerPosition: 'badge' },
    },
    {
      c: { key: 'reason' },
      header: () => t('label.reason'),
      ...getCellDefinition('reason', { headerPosition: 'primary' }),
    },
    {
      c: { key: 'commentsRequired' },
      header: () => t('label.comments-required'),
      ...getBooleanCell<LogReasonRow>(
        { display: 'check', label: t('label.comments-required') },
        // The header's explanation, where every column declares one (its
        // tooltip render is the table's own follow-up — columnTypes.ts).
        { description: t('description.comments-required') }
      ),
    },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb
            crumbs={[
              {
                label: t('assets'),
                onClick: () => navigate(`/${params.storeId}/catalogue/assets`),
              },
              { label: t('log-reasons') },
            ]}
          />
          <HeaderButtons>
            <Show when={writesOffered()}>
              <Button
                icon={<PlusCircleIcon />}
                data-testid="create-log-reason-button"
                onClick={openCreate}
              >
                {t('button.create-log-reason')}
              </Button>
            </Show>
          </HeaderButtons>
        </Header>
      }
      contentFooter={
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <DeleteSelectedAction
              selected={selectedRows}
              guard={() => guardWrite(REASON_WRITE)}
              deleteOne={deleteOne}
              nameOf={row => row.reason}
              confirmMessage={count =>
                tPlural('messages.confirm-delete-reasons', count)
              }
              deletedMessage={count =>
                tPlural('messages.deleted-reasons', count)
              }
              refusedMessage={count =>
                tPlural('messages.error-deleting-reasons', count)
              }
              onChanged={() => void refetch()}
              onDone={() => setSelectedIds([])}
            />
            <ContentFooterActions>
              <Button
                variant="secondary"
                icon={<CloseIcon />}
                onClick={() => setSelectedIds([])}
              >
                {t('label.clear-selection')}
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        filters={
          <FilterBar
            filters={FILTERS}
            filter={query().filter}
            onChange={filter => {
              setQuery({ ...query(), filter });
              setSelectedIds([]);
            }}
          />
        }
        loading={data.loading}
        sort={currentSort()}
        onSort={(key, desc) => setQuery({ ...query(), sort: [{ key, desc }] })}
        emptyMessage={t('error.no-asset-log-reasons')}
        empty={
          <Show when={writesOffered()}>
            <Button
              variant="ghost"
              data-testid="nothing-here-create-button"
              onClick={openCreate}
            >
              {t('button.create-a-new-one')}
            </Button>
          </Show>
        }
        enableSelection={writesOffered()}
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
      />
      <Show when={createOpen()}>
        <CreateLogReasonModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => void refetch()}
        />
      </Show>
    </Page>
  );
};

export default LogReasonsList;
