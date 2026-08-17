import type { Component } from 'solid-js';
import type { StoreSummary } from './StoreGuardLayout';
import { StoreSelector } from '../ui/elements/selectors/StoreSelector';
import { t } from '../intl';
import layout from '../ui/styles/LoginInitLayout.module.css';
import styles from '../ui/styles/shared.module.css';

// Spec (startup S3, [D14]): the store-selection panel's ROUTED host — a page
// at /resolve-store, reached by the guard pipeline whenever the URL does not
// resolve a store (an explicit switch opens the panel's other host, the
// bottom bar's StoreSwitchModal). The frame is the login screen's own
// (gradient hero + panel, LoginInitLayout — issue #193's mocks place store
// selection in that frame); its content is the shared StoreSelector panel,
// which owns the whole interaction — card rows, the search gate, and the
// "Always open" checkbox (SL-9).
//
// onSelect's `alwaysOpen` is that checkbox's state at the pick: true saves
// the store as the user's always-open store on this device before entering.
export const StoreSelectionScreen: Component<{
  stores: StoreSummary[];
  defaultStoreId?: string;
  lastUsedStoreId?: string;
  pinnedCount?: number;
  defaultAlwaysOpen?: boolean;
  onAlwaysOpenChange?: (alwaysOpen: boolean) => void;
  onSelect: (storeId: string, alwaysOpen: boolean) => void;
}> = props => (
  <div class={layout.page}>
    <section class={layout.hero} aria-label={t('label.about-open-msupply')}>
      <h1 class={layout.heroHeading}>{t('login.heading')}</h1>
      <p class={layout.heroBody}>{t('login.body')}</p>
    </section>
    <main class={`${layout.panel} ${styles.storeSelectArea}`}>
      <StoreSelector
        stores={props.stores}
        fillHeight
        defaultStoreId={props.defaultStoreId}
        lastUsedStoreId={props.lastUsedStoreId}
        pinnedCount={props.pinnedCount}
        defaultAlwaysOpen={props.defaultAlwaysOpen}
        onAlwaysOpenChange={props.onAlwaysOpenChange}
        onConfirm={props.onSelect}
      />
    </main>
  </div>
);
