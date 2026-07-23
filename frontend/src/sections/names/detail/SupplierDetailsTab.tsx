import type { Component } from 'solid-js';
import { NameDetailForm } from './NameDetailForm';
import type { NameDetail } from './nameDetail';

// S4 Details tab — the shared read-only detail form in supplier mode: the same
// field set as the customer modal plus the supplier-only trade terms interleaved
// into the columns, and no customer-only supply level (AC-N25). Read-only
// throughout (AC-N22).
export const SupplierDetailsTab: Component<{ name: NameDetail }> = props => (
  <NameDetailForm name={props.name} role="supplier" />
);
