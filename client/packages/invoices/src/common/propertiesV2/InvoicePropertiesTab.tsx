import React from 'react';
import {
  DraftProperties,
  InvoiceNodeType,
  PropertiesEditTab,
  UserPermission,
  useAuthContext,
} from '@openmsupply-client/common';
import { useInvoicePropertiesV2 } from './hooks';
import { throwIfStructuredError } from './saveResult';

/** The permission gating property edits for each invoice type's tab. */
const MUTATE_PERMISSION: Partial<Record<InvoiceNodeType, UserPermission>> = {
  [InvoiceNodeType.InboundShipment]: UserPermission.InboundShipmentMutate,
  [InvoiceNodeType.OutboundShipment]: UserPermission.OutboundShipmentMutate,
  [InvoiceNodeType.Prescription]: UserPermission.PrescriptionMutate,
  [InvoiceNodeType.SupplierReturn]: UserPermission.SupplierReturnMutate,
  [InvoiceNodeType.CustomerReturn]: UserPermission.CustomerReturnMutate,
};

interface InvoicePropertiesTabProps {
  invoiceType: InvoiceNodeType;
  /** The invoice's current `propertiesV2` blob (from the detail query). */
  propertiesV2?: Record<string, unknown> | null;
  /**
   * Saves the draft patch through the view's own update mutation
   * (`update({ propertiesV2: patch })`), so it shares the per-type endpoint's
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
 * permission and status-gated save into the shared {@link PropertiesEditTab}.
 */
export const InvoicePropertiesTab = ({
  invoiceType,
  propertiesV2,
  onSave,
  disabled: statusDisabled,
  onEdit,
}: InvoicePropertiesTabProps) => {
  const { userHasPermission } = useAuthContext();
  const { data: definitions = [] } = useInvoicePropertiesV2(invoiceType);

  const permission = MUTATE_PERMISSION[invoiceType];
  const disabled =
    !!statusDisabled || !permission || !userHasPermission(permission);

  return (
    <PropertiesEditTab
      // Alphabetical by label, as this tab has always rendered them — the shared
      // renderer keeps whatever order it's handed.
      definitions={[...definitions].sort((a, b) =>
        (a.name || a.key).localeCompare(b.name || b.key)
      )}
      properties={propertiesV2}
      disabled={disabled}
      onEdit={onEdit}
      // Some update hooks resolve structured error payloads rather than throwing
      // — surface those so a rejection isn't reported as saved.
      onSave={async draft => throwIfStructuredError(await onSave(draft))}
    />
  );
};
