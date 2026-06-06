import { IslandCtx } from '../context';
import { el, clear } from '../dom';
import { openModal } from '../modal';
import { fetchSuppliers, createInbound, SupplierOption } from './createData';

/**
 * Open the "new inbound shipment" modal: search/select a supplier, then create.
 * Calls onCreated(invoiceId) on success.
 */
export const openCreateModal = (
  ctx: IslandCtx,
  onCreated: (invoiceId: string) => void
): void => {
  const t = ctx.t;
  const modal = openModal(t('button.new-shipment'), { isRtl: ctx.isRtl });

  let selectedId: string | null = null;

  const search = el('input', {
    class: 'oms-input',
    type: 'search',
    attrs: { placeholder: t('placeholder.search-by-name') },
  });
  const list = el('div', { class: 'oms-suppliers' });
  const errorEl = el('div', { class: 'oms-modal-error' });

  const field = el('div', { class: 'oms-field' }, [
    el('label', { text: t('label.supplier-name') }),
    search,
  ]);

  modal.body.append(field, list, errorEl);

  const renderOptions = (suppliers: SupplierOption[]) => {
    clear(list);
    if (suppliers.length === 0) {
      list.appendChild(
        el('div', { class: 'oms-supplier-option', text: t('message.no-supplier') })
      );
      return;
    }
    suppliers.forEach(s => {
      const opt = el('div', {
        class:
          s.id === selectedId
            ? 'oms-supplier-option is-selected'
            : 'oms-supplier-option',
        text: `${s.name} (${s.code})`,
      });
      opt.addEventListener('click', () => {
        selectedId = s.id;
        renderOptions(suppliers);
        createBtn.disabled = false;
      });
      list.appendChild(opt);
    });
  };

  const loadSuppliers = async (term: string) => {
    try {
      const suppliers = await fetchSuppliers(ctx, term);
      renderOptions(suppliers);
    } catch (e) {
      errorEl.textContent = e instanceof Error ? e.message : String(e);
    }
  };

  let timer: ReturnType<typeof setTimeout>;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadSuppliers(search.value), 300);
  });

  const cancelBtn = el('button', {
    class: 'oms-btn',
    text: t('button.cancel'),
    on: { click: () => modal.close() },
  });
  const createBtn = el('button', {
    class: 'oms-btn oms-btn--primary',
    text: t('button.create'),
    disabled: true,
    on: {
      click: async () => {
        if (!selectedId) return;
        createBtn.disabled = true;
        errorEl.textContent = '';
        try {
          const id = await createInbound(ctx, selectedId);
          modal.close();
          onCreated(id);
        } catch (e) {
          errorEl.textContent = e instanceof Error ? e.message : String(e);
          createBtn.disabled = false;
        }
      },
    },
  });

  modal.footer.append(cancelBtn, createBtn);

  void loadSuppliers('');
};
