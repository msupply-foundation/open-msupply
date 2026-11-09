import { Show, type Component } from 'solid-js';
import { HomeIcon, TruckIcon } from '../../ui/icons';
import styles from './SupplierKindIcon.module.css';

/*
 * The shipment's supplier KIND, as a glyph: a house for another store in the
 * system, a truck for an external supplier (spec S1 column 1 — the same marker
 * the S3 breadcrumb shows before the shipment number). Two screens render it,
 * so it lives here rather than in either; `supplierIsStore` (detail/
 * inboundShipmentStatus) is what decides the kind.
 *
 * Decorative: it repeats what the row's supplier name and the header's
 * supplier field already say, so it keeps the icon set's default
 * `aria-hidden` — which is also why the breadcrumb renders a crumb's icon
 * OUTSIDE the leaf's <h1>, whose accessible name must stay the number.
 */
export const SupplierKindIcon: Component<{ isStore: boolean }> = props => (
  <Show when={props.isStore} fallback={<TruckIcon class={styles.external} />}>
    <HomeIcon class={styles.internal} />
  </Show>
);
