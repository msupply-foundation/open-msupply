import { createSignal, createMemo, For, Show } from 'solid-js'
import { TextField } from '../inputs/TextField'
import { StatusChip } from '../feedback/StatusChip'
import { Button } from '../buttons/Button'
import { ArrowRightIcon } from '../../icons'
import { t } from '../../../intl'
import styles from './StoreSelector.module.css'

export type StoreOption = {
  id: string
  code: string
  name: string
}

/*
 * Store selector — the searchable store-picker panel, styled after the current
 * app's login store-selector (host/LoginStoreSelectorPanel): a search field, a
 * bordered scrollable list of selectable rows (with Default / Last-used chips),
 * and a Continue button. Presentational and dismiss-agnostic — it takes the
 * (already-ordered) stores and reports the chosen id via onConfirm; the host
 * decides where it lives (in the app it fills the store-selection Dialog) and
 * what confirming does. Selection is select-then-Continue (double-click a row
 * confirms directly); the effective selection falls back to default → last-used
 * → first visible so Continue is always actionable.
 *
 * Colour independence: the Default / Last-used markers are StatusChips (dot +
 * label), never colour alone; the active row is a token tint AND aria-selected.
 */
export const StoreSelector = (props: {
  stores: StoreOption[]
  defaultStoreId?: string
  lastUsedStoreId?: string
  onConfirm: (storeId: string) => void
}) => {
  const [query, setQuery] = createSignal('')
  const [selected, setSelected] = createSignal<string | undefined>()

  const visible = createMemo(() => {
    const q = query().trim().toLowerCase()
    if (!q) return props.stores
    return props.stores.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    )
  })

  // The effective selection: an explicit pick if it's still visible, else the
  // default, else last-used, else the first row — mirrors the app's fallback.
  const selectedId = createMemo(() => {
    const candidates = [selected(), props.defaultStoreId, props.lastUsedStoreId]
    for (const id of candidates) {
      if (id && visible().some(s => s.id === id)) return id
    }
    return visible()[0]?.id
  })

  return (
    <div class={styles.panel}>
      <p class={styles.instructions}>{t('store.select-instructions')}</p>

      <TextField
        label={t('store.search')}
        width="full"
        value={query()}
        placeholder={t('store.search')}
        onInput={e => setQuery(e.currentTarget.value)}
      />

      <div class={styles.listPanel}>
        <Show
          when={visible().length > 0}
          fallback={<div class={styles.empty}>{t('store.no-results')}</div>}
        >
          <ul class={styles.list} role="listbox" aria-label={t('store.select')}>
            <For each={visible()}>
              {store => (
                <li>
                  <button
                    type="button"
                    class={styles.row}
                    role="option"
                    aria-selected={store.id === selectedId()}
                    data-active={store.id === selectedId() ? '' : undefined}
                    onClick={() => setSelected(store.id)}
                    onDblClick={() => props.onConfirm(store.id)}
                  >
                    <span class={styles.storeName}>{store.name}</span>
                    <span class={styles.tags}>
                      <Show when={store.id === props.defaultStoreId}>
                        <StatusChip label={t('store.default')} colour="var(--status-new)" />
                      </Show>
                      <Show when={store.id === props.lastUsedStoreId}>
                        <StatusChip label={t('store.last-used')} colour="var(--status-verified)" />
                      </Show>
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>

      <div class={styles.footer}>
        <Button
          variant="secondary"
          icon={<ArrowRightIcon />}
          iconPosition="end"
          disabled={!selectedId()}
          onClick={() => selectedId() && props.onConfirm(selectedId()!)}
        >
          {t('store.continue')}
        </Button>
      </div>
    </div>
  )
}
