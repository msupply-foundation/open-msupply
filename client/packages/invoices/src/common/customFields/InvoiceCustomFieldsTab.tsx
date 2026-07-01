import React from 'react';
import {
  DraftProperties,
  InvoiceNodeType,
  CustomFieldsEditTab,
  CustomFieldNodeDisplayMode,
  useAuthContext,
} from '@openmsupply-client/common';
import {
  INVOICE_PROPERTY_MUTATE_PERMISSION,
  useInvoiceCustomFields,
} from './hooks';
import { throwIfStructuredError } from './saveResult';

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
  /** Reports draft dirtiness so the view can gate tab navigation. */
  onEdit: (isDirty: boolean) => void;
}

/**
 * "Properties" tab for every invoice detail view — wires the type's definitions,
 * permission and status-gated save into the shared {@link CustomFieldsEditTab}.
 */
export const InvoiceCustomFieldsTab = ({
  invoiceType,
  customFields,
  onSave,
  disabled: statusDisabled,
  onEdit,
}: InvoiceCustomFieldsTabProps) => {
  const { userHasPermission } = useAuthContext();
  const { data: definitions = [] } = useInvoiceCustomFields(invoiceType);

  const permission = INVOICE_PROPERTY_MUTATE_PERMISSION[invoiceType];
  const disabled =
    !!statusDisabled || !permission || !userHasPermission(permission);

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
