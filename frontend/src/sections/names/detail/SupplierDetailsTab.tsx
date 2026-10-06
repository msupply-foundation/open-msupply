import type { Component } from 'solid-js';
import { NameDetailForm } from './NameDetailForm';
import type { NameDetail } from './nameDetail';

// S4 Details tab — the shared read-only detail form in supplier mode: the same
// field set as the customer modal plus the supplier-only trade terms
// interleaved into the columns, and no customer-only supply level
// (OMS-REG-DIST-08.26, OMS-REG-REPL-08.22). Read-only throughout
// (OMS-REG-DIST-08.12, OMS-REG-REPL-08.12). `padded`: the page is `fillBody`
// for its table tabs, so the body carries no edge padding for this form to
// inherit.
export const SupplierDetailsTab: Component<{ name: NameDetail }> = props => (
  <NameDetailForm name={props.name} role="supplier" padded />
);
