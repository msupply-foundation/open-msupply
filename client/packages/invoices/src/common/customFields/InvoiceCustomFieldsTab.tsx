import React, { useCallback, useRef } from 'react';
import {
  DraftProperties,
  InvoiceNodeType,
  CustomFieldsEditTab,
  CustomFieldNodeDisplayMode,
  useAuthContext,
  useConfirmOnLeaving,
} from '@openmsupply-client/common';
import {
  INVOICE_PROPERTY_MUTATE_PERMISSION,
  useInvoiceCustomFields,
} from './hooks';
import { throwIfStructuredError } from './saveResult';

// The URL `?tab=` value of the custom-fields tab, shared by every invoice
// detail view.
const CUSTOM_FIELDS_TAB = 'custom-fields';

interface InvoiceCustomFieldsTabProps {
  invoiceType: InvoiceNodeType;
  /** The invoice's current `customFields` blob (from the detail query). */
  customFields?: Record<string, unknown> | null;
  /**
   * Saves the draft patch through the view's own update mutation
   * (`update({ customFields: patch })`), so it shares the per-type endpoint's
   * validation — including status gating — and cache invalidation.
   */
  onSave: (patch: DraftProperties) => Promise<unknown>;
  /**
   * Status-based editability from the view's isDisabled hook — matches the
   * server's `check_invoice_is_editable` rule (and OG, which locks the category
   * once an invoice is finalised).
   */
  disabled?: boolean;
}

/**
 * "Properties" tab for every invoice detail view — wires the type's definitions,
 * permission and status-gated save into the shared {@link CustomFieldsEditTab}.
 *
 * Owns the unsaved-changes guard itself (via {@link useConfirmOnLeaving}) so all
 * detail views get the same coverage for free: the router blocker handles page
 * navigation and refresh, and the `customCheck` also catches the same-route
 * `?tab=` switch to another tab (which the default pathname-only blocker skips).
 */
export const InvoiceCustomFieldsTab = ({
  invoiceType,
  customFields,
  onSave,
  disabled: statusDisabled,
}: InvoiceCustomFieldsTabProps) => {
  const { userHasPermission } = useAuthContext();
  const { data: definitions = [] } = useInvoiceCustomFields(invoiceType);

  const permission = INVOICE_PROPERTY_MUTATE_PERMISSION[invoiceType];
  const disabled =
    !!statusDisabled || !permission || !userHasPermission(permission);

  // Dirtiness is read inside the (mount-time) customCheck closure, so keep it in
  // a ref rather than state to always see the live value.
  const isDirty = useRef(false);
  const { setIsDirty } = useConfirmOnLeaving('invoice-custom-fields', {
    customCheck: {
      navigate: (current, next) => {
        if (!isDirty.current) return false;
        const leavingPage = current.pathname !== next.pathname;
        const nextTab = new URLSearchParams(next.search).get('tab');
        const leavingTab = nextTab !== CUSTOM_FIELDS_TAB;
        return leavingPage || leavingTab;
      },
      refresh: () => isDirty.current,
    },
  });

  const onEdit = useCallback(
    (dirty: boolean) => {
      isDirty.current = dirty;
      setIsDirty(dirty);
    },
    [setIsDirty]
  );

  return (
    <CustomFieldsEditTab
      // Prominent fields are surfaced as quick-access controls in the toolbar
      // (InvoiceToolbarCustomFields), so exclude them here to avoid duplication.
      // Remaining fields are sorted alphabetically by label, as this tab has
      // always rendered them — the shared renderer keeps the order it is handed.
      definitions={definitions
        .filter(
          d => d.displayMode !== CustomFieldNodeDisplayMode.Prominent
        )
        .sort((a, b) => (a.name || a.key).localeCompare(b.name || b.key))}
      properties={customFields}
      disabled={disabled}
      onEdit={onEdit}
      // Some update hooks resolve structured error payloads rather than throwing
      // — surface those so a rejection isn't reported as saved.
      onSave={async draft => throwIfStructuredError(await onSave(draft))}
    />
  );
};
