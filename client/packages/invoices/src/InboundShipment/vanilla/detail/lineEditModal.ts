import { IslandCtx } from '../context';
import { el, clear } from '../dom';
import { openModal } from '../modal';
import { InboundLineFragment } from '../../api/operations.generated';
import {
  LineDraft,
  ItemOption,
  fetchItems,
  insertLine,
  updateLine,
  deleteLine,
} from './detailLineData';

interface LineEditOptions {
  ctx: IslandCtx;
  invoiceId: string;
  /** Existing line to edit, or null to create a new line. */
  line: InboundLineFragment | null;
  disabled: boolean;
  onSaved: () => void;
}

const numberField = (
  label: string,
  value: number
): { field: HTMLElement; input: HTMLInputElement } => {
  const input = el('input', {
    class: 'oms-input',
    type: 'number',
    value: String(value),
  });
  const field = el('div', { class: 'oms-field' }, [
    el('label', { text: label }),
    input,
  ]);
  return { field, input };
};

export const openLineEditModal = (opts: LineEditOptions): void => {
  const { ctx, invoiceId, line, disabled } = opts;
  const t = ctx.t;
  const isCreate = line === null;
  const modal = openModal(
    isCreate ? t('heading.add-item') : t('label.edit'),
    { isRtl: ctx.isRtl, width: '520px' }
  );

  let itemId = line?.item.id ?? '';

  const errorEl = el('div', { class: 'oms-modal-error' });

  // --- Item picker (create) or read-only name (update) ---
  const itemSection = el('div', { class: 'oms-field' });
  if (isCreate) {
    const itemSearch = el('input', {
      class: 'oms-input',
      type: 'search',
      attrs: { placeholder: t('placeholder.search-by-name-or-code') },
    });
    const itemList = el('div', { class: 'oms-suppliers' });
    itemSection.append(
      el('label', { text: t('label.item') }),
      itemSearch,
      itemList
    );

    const renderItems = (items: ItemOption[]) => {
      clear(itemList);
      items.forEach(item => {
        const opt = el('div', {
          class:
            item.id === itemId
              ? 'oms-supplier-option is-selected'
              : 'oms-supplier-option',
          text: `${item.name} (${item.code})`,
        });
        opt.addEventListener('click', () => {
          itemId = item.id;
          renderItems(items);
          saveBtn.disabled = false;
        });
        itemList.appendChild(opt);
      });
    };

    let timer: ReturnType<typeof setTimeout>;
    itemSearch.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          renderItems(await fetchItems(ctx, itemSearch.value));
        } catch (e) {
          errorEl.textContent = e instanceof Error ? e.message : String(e);
        }
      }, 300);
    });
    void fetchItems(ctx, '').then(renderItems);
  } else {
    itemSection.append(
      el('label', { text: t('label.item') }),
      el('div', { text: `${line.item.name} (${line.item.code})` })
    );
  }

  // --- Editable fields ---
  const batch = el('input', {
    class: 'oms-input',
    value: line?.batch ?? '',
  });
  const batchField = el('div', { class: 'oms-field' }, [
    el('label', { text: t('label.batch') }),
    batch,
  ]);

  const expiry = el('input', {
    class: 'oms-input',
    type: 'date',
    value: line?.expiryDate ?? '',
  });
  const expiryField = el('div', { class: 'oms-field' }, [
    el('label', { text: t('label.expiry') }),
    expiry,
  ]);

  const packSize = numberField(t('label.pack-size'), line?.packSize ?? 1);
  const numPacks = numberField(
    t('label.num-packs'),
    line?.numberOfPacks ?? 0
  );
  const cost = numberField(
    t('label.cost-price'),
    line?.costPricePerPack ?? 0
  );
  const sell = numberField(
    t('label.sell-price'),
    line?.sellPricePerPack ?? 0
  );

  modal.body.append(
    itemSection,
    batchField,
    expiryField,
    packSize.field,
    numPacks.field,
    cost.field,
    sell.field,
    errorEl
  );

  // --- Footer ---
  const cancelBtn = el('button', {
    class: 'oms-btn',
    text: t('button.cancel'),
    on: { click: () => modal.close() },
  });

  const saveBtn = el('button', {
    class: 'oms-btn oms-btn--primary',
    text: t('button.ok'),
    disabled: disabled || (isCreate && !itemId),
    on: {
      click: async () => {
        errorEl.textContent = '';
        const draft: LineDraft = {
          id: line?.id ?? '',
          itemId,
          batch: batch.value,
          expiryDate: expiry.value,
          packSize: Number(packSize.input.value) || 0,
          numberOfPacks: Number(numPacks.input.value) || 0,
          costPricePerPack: Number(cost.input.value) || 0,
          sellPricePerPack: Number(sell.input.value) || 0,
        };
        saveBtn.disabled = true;
        try {
          if (isCreate) await insertLine(ctx, invoiceId, draft);
          else await updateLine(ctx, draft);
          modal.close();
          opts.onSaved();
        } catch (e) {
          errorEl.textContent = e instanceof Error ? e.message : String(e);
          saveBtn.disabled = false;
        }
      },
    },
  });

  modal.footer.append(cancelBtn);

  if (!isCreate && !disabled) {
    const deleteBtn = el('button', {
      class: 'oms-btn oms-btn--danger',
      text: t('button.delete'),
      on: {
        click: async () => {
          errorEl.textContent = '';
          try {
            await deleteLine(ctx, line.id);
            modal.close();
            opts.onSaved();
          } catch (e) {
            errorEl.textContent = e instanceof Error ? e.message : String(e);
          }
        },
      },
    });
    modal.footer.append(deleteBtn);
  }

  modal.footer.append(saveBtn);
};
