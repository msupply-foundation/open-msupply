import { For, Show, type JSX } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { FormSection } from '@/ui/layout/Form/FormSection';
import { Table } from '@/ui/elements/table/Table';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { AsyncCombobox } from '@/ui/elements/selectors/AsyncCombobox';
import { CloseIcon } from '@/ui/icons';
import type { Page } from '@/ui/utils/createPaginatedSearch';
import { StoreSearch } from './sites.generated';
import type { SiteStore } from './siteEdit';

// The editor's Stores section (spec/sites/ui-surface.md S2 § stores): a store
// lookup over EVERY store on the server, then a static sub-table of the site's
// assigned stores. Adds and removes are DRAFT ONLY until Save, where they
// commit in the second write (rules.md § saving a site).

const PAGE_SIZE = 30;

/**
 * One page of the store picker (registry role "Store lookup": every store on
 * the SERVER, searched code-or-name, code emphasised beside the name,
 * excluding ids the caller passes).
 *
 * It deliberately does NOT exclude stores belonging to another site — that is
 * what makes picking one MOVE it (OMS-FUN-SYC-002.32), silently and with no
 * warning that another site is losing it. Captured as-is (rules.md § store
 * assignment); a warning would be new behaviour this build may not invent.
 */
const storePageFetcher =
  (excludeIds: () => string[]) =>
  async (
    search: string,
    offset: number
  ): Promise<Page<SiteStore> | undefined> => {
    const result = await graphqlFetch(StoreSearch, {
      search: search === '' ? undefined : search,
      excludeIds: excludeIds(),
      first: PAGE_SIZE,
      offset,
    });
    if (result.kind !== 'success') return undefined;
    return {
      nodes: result.data.stores.nodes,
      totalCount: result.data.stores.totalCount,
    };
  };

export interface SiteStoresSectionProps {
  /** The draft store list, in display order. */
  stores: () => SiteStore[];
  /**
   * Whether the store lookup renders at all. On a central server that is not
   * standalone it is ABSENT, not disabled — read-only mode is a content
   * difference (OMS-FUN-SYC-002.12, ui-surface § cross-cutting). From
   * siteGates.siteAffordances, so the whole area answers one table.
   */
  showPicker: boolean;
  /** Whether the trailing remove column renders at all — same gate, same rule. */
  showRemove: boolean;
  /**
   * Whether stores may be removed from THIS site (OMS-FUN-SYC-002.34): the
   * central server's own site has nowhere to give them back to, so its rows
   * show the affordance disabled.
   */
  canRemove: boolean;
  onAdd: (store: SiteStore) => void;
  onRemove: (store: SiteStore) => void;
  /** Inputs are inert while a save is in flight. */
  disabled?: boolean;
}

export const SiteStoresSection = (
  props: SiteStoresSectionProps
): JSX.Element => (
  // The Stores heading over the section, whose hairline rule IS the separator
  // between the field rows and this block (ui-surface S2 § layout). h3 with the
  // group treatment: the dialog's own title holds the h2, but this is a
  // top-level group of the surface.
  <FormSection
    title={t('heading.stores')}
    headingLevel="h3"
    heading="group"
    data-testid="site-stores-section"
  >
    <Show when={props.showPicker}>
      <AsyncCombobox<SiteStore>
        label={t('label.store')}
        inputTestId="site-store-search-input"
        disabled={props.disabled}
        // Only the stores already in this editor's draft are withheld.
        fetchPage={storePageFetcher(() => props.stores().map(s => s.id))}
        itemToString={store => store.storeName}
        itemToValue={store => store.id}
        renderItem={store => (
          <>
            {/* Code emphasised beside the name — <strong> rather than a style,
                so the screen owns no CSS (src/ui/CLAUDE.md). */}
            <strong data-testid="item-option-code">{store.code}</strong>{' '}
            <span data-testid="item-option-name">{store.storeName}</span>
          </>
        )}
        // Picking one adds it to the list and clears the search, ready for the
        // next: the picker is never a held selection, so it takes no `value`.
        onSelect={store => {
          if (store) props.onAdd(store);
        }}
      />
    </Show>
    {/* A static sub-table (registry role): a short, fixed row set inside another
        surface — not sortable, not selectable, not paginated, so a DataTable's
        toolbar chrome would outweigh it. */}
    <Table label={t('heading.stores')}>
      <thead>
        <tr>
          <th scope="col">{t('label.code')}</th>
          <th scope="col">{t('label.name')}</th>
          <Show when={props.showRemove}>
            {/* The remove column's header is iconic/empty in the grid, so it
                names itself for assistive tech. */}
            <th scope="col" aria-label={t('label.remove')} />
          </Show>
        </tr>
      </thead>
      <tbody>
        <For each={props.stores()}>
          {store => (
            <tr data-row-key={store.id}>
              <td data-mono>{store.code}</td>
              <td>{store.storeName}</td>
              <Show when={props.showRemove}>
                <td>
                  <IconButton
                    label={t('label.remove')}
                    icon={<CloseIcon />}
                    data-testid="site-store-remove"
                    disabled={!props.canRemove || props.disabled}
                    onClick={() => props.onRemove(store)}
                  />
                </td>
              </Show>
            </tr>
          )}
        </For>
      </tbody>
    </Table>
  </FormSection>
);
