import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  InputWithLabelRow,
  InvoiceNodeType,
  LoadingButton,
  NothingHere,
  PropertyV2Input,
  SaveIcon,
  Typography,
  useConfirmationModal,
  useIsExtraSmallScreen,
  useNotification,
  useTranslation,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { useInvoicePropertiesV2 } from './hooks';
import { throwIfStructuredError } from './saveResult';
import {
  DraftProperties,
  useDraftInvoiceProperties,
} from './useDraftInvoiceProperties';

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
 * "Properties" tab shared by every invoice detail view — editable list of the
 * type's custom (propertiesV2) values, mirroring the patient Custom properties
 * tab: edits collect in a draft and save via an explicit confirmed Save button.
 */
export const InvoicePropertiesTab = ({
  invoiceType,
  propertiesV2,
  onSave,
  disabled: statusDisabled,
  onEdit,
}: InvoicePropertiesTabProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const { userHasPermission } = useAuthContext();
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const [isSaving, setIsSaving] = useState(false);

  const { data: definitions = [] } = useInvoicePropertiesV2(invoiceType);
  const { draftProperties, updateProperty, isDirty } =
    useDraftInvoiceProperties(propertiesV2);

  const permission = MUTATE_PERMISSION[invoiceType];
  const disabled =
    !!statusDisabled || !permission || !userHasPermission(permission);

  useEffect(() => {
    onEdit(isDirty);
  }, [isDirty, onEdit]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Some update hooks resolve structured error payloads rather than
      // throwing — scan the result so a server rejection isn't reported as
      // saved (see throwIfStructuredError).
      throwIfStructuredError(await onSave(draftProperties));
      success(t('success.data-saved'))();
    } catch {
      error(t('error.failed-to-save-properties'))();
    } finally {
      setIsSaving(false);
    }
  }, [onSave, draftProperties, success, error, t]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: handleSave,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  if (!definitions.length) {
    return <NothingHere body={t('messages.no-properties')} />;
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
      <Box
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            width: '95%',
            minWidth: '340px',
            paddingX: '2em',
          },
          width: '600px',
          display: 'grid',
          gap: 1,
          margin: '0 auto',
          paddingTop: 2,
        })}
      >
        {[...definitions]
          .sort((a, b) => (a.name || a.key).localeCompare(b.name || b.key))
          .map(definition => (
            <Row
              key={definition.id}
              label={definition.name || definition.key}
              isExtraSmallScreen={isExtraSmallScreen}
              input={
                <PropertyV2Input
                  definition={definition}
                  value={draftProperties[definition.key] ?? null}
                  disabled={disabled}
                  onChange={v => updateProperty({ [definition.key]: v ?? null })}
                />
              }
            />
          ))}
      </Box>
      {!disabled && (
        <Box paddingTop={2}>
          <LoadingButton
            onClick={() => showSaveConfirmation()}
            isLoading={isSaving}
            disabled={!isDirty}
            startIcon={<SaveIcon />}
            label={t('button.save')}
            variant="contained"
          />
        </Box>
      )}
    </Box>
  );
};

const Row = ({
  label,
  isExtraSmallScreen,
  input,
}: {
  label: string;
  isExtraSmallScreen: boolean;
  input: React.ReactNode;
}) => {
  if (!isExtraSmallScreen)
    return (
      <InputWithLabelRow
        label={label}
        sx={{ width: '100%' }}
        labelProps={{
          sx: { width: '250px', fontSize: '16px', paddingRight: 2 },
        }}
        Input={<Box flex={1}>{input}</Box>}
      />
    );

  return (
    <Box paddingTop={1.5}>
      <Typography sx={{ fontSize: '1rem!important', fontWeight: 'bold' }}>
        {label}
      </Typography>
      {input}
    </Box>
  );
};
