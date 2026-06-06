import {
  InvoiceNodeStatus,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { IslandCtx, Island } from '../context';
import { el, clear } from '../dom';
import { createStore } from '../store';
import { VanillaTable, VanillaColumn } from '../table';
import { InboundFragment, InboundLineFragment } from '../../api/operations.generated';
import { fetchInvoice, updateInvoice } from './detailData';
import { openLineEditModal } from './lineEditModal';
import { getInboundStockLines } from '../../../utils';
import '../styles/detail.css';
import '../styles/list.css';

interface DetailState {
  data: InboundFragment | null;
  loading: boolean;
  error: string | null;
  sort: { key: string; desc: boolean };
}

export const mountDetail = (container: HTMLElement, ctx: IslandCtx): Island => {
  const invoiceId = ctx.invoiceId ?? '';
  const store = createStore<DetailState>({
    data: null,
    loading: true,
    error: null,
    sort: { key: 'itemName', desc: false },
  });

  const root = el('div', {
    class: 'oms-inbound-detail',
    attrs: ctx.isRtl ? { dir: 'rtl' } : {},
  });
  const header = el('div', { class: 'oms-detail-header' });
  const actions = el('div', { class: 'oms-detail-actions' });
  const tableArea = el('div', { class: 'oms-table-area' });
  root.append(header, actions, tableArea);
  container.appendChild(root);

  const t = ctx.t;

  const isDisabled = (data: InboundFragment | null) =>
    !data || data.onHold || data.status === InvoiceNodeStatus.Verified;

  // --- Lines table ---
  const columns: VanillaColumn<InboundLineFragment>[] = [
    {
      id: 'itemCode',
      header: t('label.code'),
      sortable: true,
      width: '100px',
      render: l => l.item.code,
    },
    {
      id: 'itemName',
      header: t('label.name'),
      sortable: true,
      width: '280px',
      render: l => l.itemName,
    },
    ...(ctx.isExternal
      ? [
          {
            id: 'poLine',
            header: t('label.line-number'),
            width: '90px',
            align: 'right' as const,
            render: (l: InboundLineFragment) =>
              l.purchaseOrderLine ? String(l.purchaseOrderLine.lineNumber) : '',
          },
        ]
      : []),
    {
      id: 'batch',
      header: t('label.batch'),
      sortable: true,
      width: '120px',
      render: l => l.batch ?? '',
    },
    {
      id: 'expiryDate',
      header: t('label.expiry'),
      sortable: true,
      width: '120px',
      render: l => ctx.formatters.date(l.expiryDate),
    },
    {
      id: 'packSize',
      header: t('label.pack-size'),
      width: '90px',
      align: 'right',
      render: l => ctx.formatters.number(l.packSize),
    },
    {
      id: 'numberOfPacks',
      header: t('label.num-packs'),
      width: '100px',
      align: 'right',
      render: l => ctx.formatters.number(l.numberOfPacks),
    },
    {
      id: 'unitQuantity',
      header: t('label.unit-quantity'),
      width: '110px',
      align: 'right',
      hideOnMobile: true,
      render: l => ctx.formatters.number(l.numberOfPacks * l.packSize),
    },
    {
      id: 'costPerUnit',
      header: t('label.cost-per-unit'),
      width: '110px',
      align: 'right',
      hideOnMobile: true,
      render: l =>
        ctx.formatters.currency(
          l.packSize ? l.costPricePerPack / l.packSize : 0
        ),
    },
    {
      id: 'sellPricePerPack',
      header: t('label.sell-price'),
      width: '110px',
      align: 'right',
      hideOnMobile: true,
      render: l => ctx.formatters.currency(l.sellPricePerPack),
    },
    {
      id: 'lineTotal',
      header: t('label.total'),
      width: '120px',
      align: 'right',
      render: l => ctx.formatters.currency(l.totalAfterTax),
    },
  ];

  const sortLines = (lines: InboundLineFragment[]) => {
    const { key, desc } = store.getState().sort;
    const col = columns.find(c => c.id === key);
    if (!col) return lines;
    const sorted = [...lines].sort((a, b) => {
      const av = col.render(a);
      const bv = col.render(b);
      const an = Number(av);
      const bn = Number(bv);
      const cmp =
        !isNaN(an) && !isNaN(bn) && av !== '' && bv !== ''
          ? an - bn
          : String(av).localeCompare(String(bv));
      return desc ? -cmp : cmp;
    });
    return sorted;
  };

  const table = new VanillaTable<InboundLineFragment>({
    columns,
    rows: [],
    sort: store.getState().sort,
    onSort: (key, desc) => {
      store.setState({ sort: { key, desc } });
      table.updateSort({ key, desc });
      renderTable();
    },
    onRowClick: line =>
      openLineEditModal({
        ctx,
        invoiceId,
        line,
        disabled: isDisabled(store.getState().data),
        onSaved: load,
      }),
    emptyMessage: t('error.no-items'),
  });
  table.render(tableArea);

  // --- Data ---
  const load = async () => {
    store.setState({ loading: true, error: null });
    try {
      const data = await fetchInvoice(ctx, invoiceId);
      store.setState({ data, loading: false });
      ctx.onInvoiceLoaded?.(data.invoiceNumber, data.inboundType);
    } catch (e) {
      store.setState({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // --- Renderers ---
  const field = (label: string, value: string) =>
    el('div', { class: 'oms-detail-field' }, [
      el('div', { class: 'oms-label', text: label }),
      el('div', { class: 'oms-value', text: value || '-' }),
    ]);

  const renderHeader = () => {
    const { data } = store.getState();
    clear(header);
    if (!data) return;

    header.append(
      field(t('label.supplier'), data.otherPartyName),
      field(t('label.number'), String(data.invoiceNumber)),
      field(t('label.status'), data.status),
      field(t('label.created'), ctx.formatters.date(data.createdDatetime)),
      field(t('label.delivered'), ctx.formatters.date(data.deliveredDatetime)),
      field(t('label.reference'), data.theirReference ?? '')
    );

    // Editable comment.
    const commentInput = el('input', {
      class: 'oms-input',
      value: data.comment ?? '',
      disabled: isDisabled(data),
    });
    commentInput.addEventListener('change', async () => {
      try {
        await updateInvoice(ctx, { id: data.id, comment: commentInput.value });
        ctx.invalidateShellQueries(['invoice']);
        await load();
      } catch (e) {
        store.setState({
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });
    const commentField = el('div', { class: 'oms-detail-field' }, [
      el('div', { class: 'oms-label', text: t('label.comment') }),
      commentInput,
    ]);
    header.append(commentField);
  };

  const renderActions = () => {
    const { data } = store.getState();
    clear(actions);

    const back = el('button', {
      class: 'oms-btn',
      text: t('button.back'),
      on: {
        click: () =>
          ctx.navigate(
            RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InboundShipment)
              .build()
          ),
      },
    });

    const addLine = el('button', {
      class: 'oms-btn oms-btn--primary',
      text: t('button.add-item'),
      disabled: isDisabled(data),
      on: {
        click: () =>
          openLineEditModal({
            ctx,
            invoiceId,
            line: null,
            disabled: isDisabled(data),
            onSaved: load,
          }),
      },
    });

    actions.append(back, el('span', { class: 'oms-spacer' }), addLine);
  };

  const renderTable = () => {
    const { data, loading, error } = store.getState();
    tableArea.classList.toggle('is-loading', loading);
    if (error) {
      clear(tableArea);
      tableArea.appendChild(el('div', { class: 'oms-error', text: error }));
      return;
    }
    if (!tableArea.querySelector('.gridjs-wrapper')) {
      clear(tableArea);
      table.render(tableArea);
    }
    const lines = data ? getInboundStockLines(data.lines.nodes) : [];
    table.updateData(sortLines(lines));
  };

  const render = () => {
    renderHeader();
    renderActions();
    renderTable();
  };

  const unsubscribe = store.subscribe(render);
  render();
  load();

  return {
    unmount: () => {
      unsubscribe();
      table.destroy();
      clear(container);
    },
    update: (next: IslandCtx) => {
      ctx = next;
      load();
    },
  };
};
