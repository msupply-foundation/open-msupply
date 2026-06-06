import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { InvoiceNodeStatus } from '@common/types';
import { getStatusTranslator } from '../../../utils';
import { IslandCtx, Island } from '../context';
import { el, clear } from '../dom';
import { createStore } from '../store';
import { VanillaTable, VanillaColumn } from '../table';
import { InboundRowFragment } from '../../api/operations.generated';
import {
  fetchList,
  deleteInbounds,
  ListResult,
} from './listData';
import {
  readListParams,
  writeListParams,
  PAGE_SIZE,
  FilterState,
} from './urlState';
import { openCreateModal } from './createModal';
import '../styles/list.css';

interface ListState {
  result: ListResult;
  loading: boolean;
  error: string | null;
}

const STATUS_OPTIONS = ['NEW', 'DELIVERED', 'VERIFIED'];

const isExtraSmallScreen = () =>
  window.matchMedia('(max-width: 600px)').matches;

const colorDot = (colour?: string | null) =>
  colour
    ? `<span class="oms-color-dot" style="background:${colour}"></span>`
    : `<span class="oms-color-dot"></span>`;

export const mountList = (container: HTMLElement, ctx: IslandCtx): Island => {
  const store = createStore<ListState>({
    result: { nodes: [], totalCount: 0 },
    loading: true,
    error: null,
  });

  const selected = new Set<string>();
  const xs = isExtraSmallScreen();

  // --- Root scaffold ---
  const root = el('div', {
    class: 'oms-inbound-list',
    attrs: ctx.isRtl ? { dir: 'rtl' } : {},
  });
  const toolbar = el('div', { class: 'oms-toolbar' });
  const tableArea = el('div', { class: 'oms-table-area' });
  const pager = el('div', { class: 'oms-pager' });
  root.append(toolbar, tableArea, pager);
  container.appendChild(root);

  // --- Columns ---
  const t = ctx.t;
  const statusLabel = getStatusTranslator(ctx.t);
  const columns: VanillaColumn<InboundRowFragment>[] = [
    {
      id: 'select',
      header: '',
      width: '44px',
      isHtml: true,
      render: row =>
        `<span class="oms-no-nav oms-checkbox-cell"><input type="checkbox" data-id="${row.id}" ${
          selected.has(row.id) ? 'checked' : ''
        }/></span>`,
    },
    {
      id: 'otherPartyName',
      header: t('label.supplier'),
      sortable: true,
      width: '320px',
      isHtml: true,
      render: row =>
        `<span class="oms-supplier">${colorDot(row.colour)}<span>${escapeHtml(
          row.otherPartyName
        )}</span></span>`,
    },
    {
      id: 'status',
      header: t('label.status'),
      sortable: true,
      width: '120px',
      render: row => statusLabel(row.status),
    },
    {
      id: 'invoiceNumber',
      header: t('label.number'),
      sortable: true,
      width: '90px',
      align: 'right',
      render: row => String(row.invoiceNumber),
    },
    {
      id: 'createdDatetime',
      header: t('label.created'),
      sortable: true,
      width: '110px',
      render: row => ctx.formatters.date(row.createdDatetime),
    },
    {
      id: 'deliveredDatetime',
      header: t('label.delivered'),
      sortable: true,
      width: '110px',
      hideOnMobile: true,
      render: row => ctx.formatters.date(row.deliveredDatetime),
    },
    {
      id: 'comment',
      header: t('label.comment'),
      render: row => row.comment ?? '',
    },
    {
      id: 'theirReference',
      header: t('label.reference'),
      sortable: true,
      width: '180px',
      hideOnMobile: true,
      render: row => row.theirReference ?? '',
    },
    {
      id: 'total',
      header: t('label.total'),
      align: 'right',
      hideOnMobile: true,
      render: row => ctx.formatters.currency(row.pricing.totalAfterTax),
    },
  ];

  const navigateToRow = (row: InboundRowFragment) => {
    if (row.purchaseOrder) {
      ctx.navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.InboundShipmentExternal)
          .addPart(row.id)
          .build()
      );
    } else {
      ctx.navigate(row.id);
    }
  };

  let { params, filter } = readListParams();

  const table = new VanillaTable<InboundRowFragment>({
    columns,
    rows: [],
    onRowClick: navigateToRow,
    sort: { key: params.sortKey, desc: params.sortDesc },
    onSort: (key, desc) => {
      params = { ...params, sortKey: key, sortDesc: desc };
      writeListParams({ sortKey: key, sortDesc: desc });
      table.updateSort({ key, desc });
      load();
    },
    emptyMessage: t('error.no-inbound-shipments'),
  });
  table.render(tableArea);

  // Checkbox selection via delegation (avoids full re-render on toggle).
  tableArea.addEventListener('change', e => {
    const input = e.target as HTMLInputElement;
    if (input?.type !== 'checkbox' || !input.dataset['id']) return;
    const id = input.dataset['id'];
    if (input.checked) selected.add(id);
    else selected.delete(id);
    renderToolbar();
  });

  // --- Data loading ---
  const load = async () => {
    store.setState({ loading: true, error: null });
    try {
      const result = await fetchList(ctx, params);
      store.setState({ result, loading: false });
    } catch (e) {
      store.setState({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // --- Renderers ---
  const renderToolbar = () => {
    clear(toolbar);
    if (xs) return; // No app-bar actions on mobile (matches React list).

    const search = el('input', {
      class: 'oms-input',
      type: 'search',
      value: filter.search,
      attrs: { placeholder: t('placeholder.search-by-name') },
    });
    let searchTimer: ReturnType<typeof setTimeout>;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => applyFilter({ search: search.value }), 300);
    });

    const statusSelect = el(
      'select',
      { class: 'oms-select' },
      [
        el('option', { value: '', text: t('label.all') }),
        ...STATUS_OPTIONS.map(s =>
          el('option', {
            value: s,
            text: statusLabel(s as InvoiceNodeStatus),
            attrs: filter.status.includes(s) ? { selected: 'selected' } : {},
          })
        ),
      ]
    );
    statusSelect.addEventListener('change', () =>
      applyFilter({
        status: statusSelect.value ? [statusSelect.value] : [],
      })
    );

    const newBtn = el('button', {
      class: 'oms-btn oms-btn--primary',
      text: t('button.new-shipment'),
      on: { click: () => openCreate() },
    });

    const deleteBtn = el('button', {
      class: 'oms-btn oms-btn--danger',
      text:
        selected.size > 0
          ? `${t('button.delete-lines')} (${selected.size})`
          : t('button.delete-lines'),
      disabled: selected.size === 0,
      on: { click: () => onDelete() },
    });

    toolbar.append(
      search,
      statusSelect,
      el('span', { class: 'oms-spacer' }),
      deleteBtn,
      newBtn
    );
  };

  const renderTable = () => {
    const { result, loading, error } = store.getState();
    tableArea.classList.toggle('is-loading', loading);

    if (error) {
      clear(tableArea);
      tableArea.appendChild(el('div', { class: 'oms-error', text: error }));
      return;
    }
    // Re-attach the grid container if an error previously replaced it.
    if (!tableArea.querySelector('.gridjs-wrapper')) {
      clear(tableArea);
      table.render(tableArea);
    }
    table.updateData(result.nodes);
  };

  const renderPager = () => {
    const { result } = store.getState();
    clear(pager);
    const page = Math.floor(params.offset / PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE));
    const from = result.totalCount === 0 ? 0 : params.offset + 1;
    const to = Math.min(params.offset + PAGE_SIZE, result.totalCount);

    const prev = el('button', {
      class: 'oms-btn',
      text: '‹',
      disabled: page <= 0,
      on: { click: () => gotoPage(page - 1) },
    });
    const next = el('button', {
      class: 'oms-btn',
      text: '›',
      disabled: page >= totalPages - 1,
      on: { click: () => gotoPage(page + 1) },
    });
    pager.append(
      el('span', {
        text: `${from}-${to} ${t('label.of')} ${result.totalCount}`,
      }),
      prev,
      next
    );
  };

  const render = () => {
    renderToolbar();
    renderTable();
    renderPager();
  };

  // --- Actions ---
  const applyFilter = (patch: Partial<FilterState>) => {
    filter = { ...filter, ...patch };
    writeListParams({ filter });
    params = { ...readListParams().params };
    load();
  };

  const gotoPage = (page: number) => {
    writeListParams({ page });
    params = { ...params, offset: page * PAGE_SIZE };
    load();
  };

  const onDelete = async () => {
    const rows = store
      .getState()
      .result.nodes.filter(n => selected.has(n.id));
    if (rows.length === 0) return;
    try {
      await deleteInbounds(ctx, rows);
      selected.clear();
      ctx.invalidateShellQueries(['invoice', 'list']);
      await load();
    } catch (e) {
      store.setState({
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const openCreate = () => {
    openCreateModal(ctx, id => {
      ctx.invalidateShellQueries(['invoice', 'list']);
      ctx.navigate(id);
    });
  };

  // --- Wire up ---
  const unsubscribe = store.subscribe(render);
  const onPopState = () => {
    const next = readListParams();
    params = next.params;
    filter = next.filter;
    table.updateSort({ key: params.sortKey, desc: params.sortDesc });
    load();
  };
  window.addEventListener('popstate', onPopState);

  render();
  load();

  return {
    unmount: () => {
      unsubscribe();
      window.removeEventListener('popstate', onPopState);
      table.destroy();
      clear(container);
    },
    update: (next: IslandCtx) => {
      ctx = next;
      load();
    },
  };
};

// --- helpers ---
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c =>
      (({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }) as Record<string, string>)[c] ?? c
  );

