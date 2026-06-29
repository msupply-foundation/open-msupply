import React from 'react';
import {
  Box,
  DraftProperties,
  InputWithLabelRow,
  InvoiceNodeType,
  CustomFieldNodeDisplayMode,
  CustomFieldInput,
  useAuthContext,
} from '@openmsupply-client/common';
import {
  INVOICE_PROPERTY_MUTATE_PERMISSION,
  useInvoiceCustomFields,
} from './hooks';

interface InvoiceToolbarCustomFieldsProps {
  invoiceType: InvoiceNodeType;
  /** The invoice's current `customFields` blob (from the detail query). */
  customFields?: Record<string, unknown> | null;
  /**
   * Saves a single-key patch through the view's own update mutation. The server
   * patch-merges into the existing blob, so a partial patch never clobbers the
   * other property values — no need to merge the current blob here.
   */
  onUpdate: (patch: DraftProperties) => void;
  /** Status-based editability, matching the other toolbar fields. */
  disabled?: boolean;
}

/**
 * Renders the invoice type's `PROMINENT` customFields (e.g. the legacy
 * transaction category) as quick-access controls in the detail-view toolbar,
 * mirroring OG where the category sits on the transact window. Saves
 * immediately on change like every other toolbar field; the same properties
 * also remain editable in the Properties tab (the toolbar is an additional
 * quick editor, not a replacement). Renders nothing when the scope has no
 * prominent properties.
 *
 * NOTE: save-on-every-change suits discrete-value properties (OPTION /
 * BOOLEAN), which is all that is `Prominent` today. A TEXT/NUMBER/REAL property
 * promoted here would fire a mutation per keystroke — those belong in the
 * Properties tab, which buffers a draft behind an explicit Save. Revisit (e.g.
 * buffer here too) before promoting a free-text value type.
 */
export const InvoiceToolbarCustomFields = ({
  invoiceType,
  customFields,
  onUpdate,
  disabled,
}: InvoiceToolbarCustomFieldsProps) => {
  const { userHasPermission } = useAuthContext();
  const { data: definitions = [] } = useInvoiceCustomFields(invoiceType);

  const prominent = definitions.filter(
    definition => definition.displayMode === CustomFieldNodeDisplayMode.Prominent
  );
  if (!prominent.length) return null;

  // Gate on the same mutate permission as the Properties tab, so the property
  // isn't editable here under looser rules than there (most types' toolbar
  // `disabled` is status-only). The server enforces it on save regardless.
  const permission = INVOICE_PROPERTY_MUTATE_PERMISSION[invoiceType];
  const editDisabled =
    disabled || !permission || !userHasPermission(permission);

  const values = (customFields ?? {}) as Record<string, unknown>;

  return (
    <>
      {prominent.map(definition => (
        <InputWithLabelRow
          key={definition.id}
          label={definition.name || definition.key}
          Input={
            <Box sx={{ width: 220 }}>
              <CustomFieldInput
                definition={definition}
                value={values[definition.key] ?? null}
                disabled={editDisabled}
                onChange={value => onUpdate({ [definition.key]: value ?? null })}
              />
            </Box>
          }
        />
      ))}
    </>
  );
};
