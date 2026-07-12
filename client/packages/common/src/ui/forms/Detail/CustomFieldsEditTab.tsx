import React, { useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import {
  BasicSpinner,
  LoadingButton,
  NothingHere,
  useConfirmationModal,
} from '@common/components';
import { SaveIcon } from '@common/icons';
import { LocaleKey, useTranslation } from '@common/intl';
import { useNotification } from '@common/hooks';
import { DraftProperties, useDraftCustomFields } from '@common/utils';
import {
  CustomFieldDetailRows,
  CustomFieldRenderDefinition,
} from './CustomFieldDetailRows';

interface CustomFieldsEditTabProps {
  /** Property definitions for the record kind, in the order to display them. */
  definitions: CustomFieldRenderDefinition[];
  /** The record's loaded `customFields` blob; the draft initialises from it. */
  properties?: Record<string, unknown> | null;
  /**
   * Persists the draft. Must reject/throw on failure so a server rejection is
   * surfaced as the error toast rather than a false "saved".
   */
  onSave: (draft: DraftProperties) => Promise<unknown>;
  /** Reports draft dirtiness so the parent can gate tab navigation. */
  onEdit: (isDirty: boolean) => void;
  /** Disables editing — the caller resolves permission + record status. */
  disabled?: boolean;
  /** Shows a spinner instead of the form (e.g. while the record loads). */
  isLoading?: boolean;
  /** Toast key shown when `onSave` fails; defaults to a generic message. */
  saveErrorMessage?: LocaleKey;
}

/**
 * Editable "Properties" tab shell shared by every record kind's custom
 * customFields tab (patient, invoice, …): owns the draft, renders the labelled
 * rows via {@link CustomFieldDetailRows}, and saves behind a confirmed Save
 * button. Purely presentational — the caller owns everything record-specific
 * (how `definitions`/`properties` are fetched, how `disabled` resolves, and what
 * `onSave` does), so the only behaviour here is draft + save + dirty reporting.
 */
export const CustomFieldsEditTab = ({
  definitions,
  properties,
  onSave,
  onEdit,
  disabled,
  isLoading,
  saveErrorMessage = 'error.failed-to-save-custom-fields',
}: CustomFieldsEditTabProps) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const [isSaving, setIsSaving] = useState(false);

  const { draftProperties, updateProperty, isDirty } =
    useDraftCustomFields(properties);

  useEffect(() => {
    onEdit(isDirty);
  }, [isDirty, onEdit]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(draftProperties);
      success(t('success.data-saved'))();
    } catch {
      error(t(saveErrorMessage))();
    } finally {
      setIsSaving(false);
    }
  }, [onSave, draftProperties, success, error, t, saveErrorMessage]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: handleSave,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  if (isLoading) return <BasicSpinner />;

  if (!definitions.length) {
    return <NothingHere body={t('messages.no-custom-fields')} />;
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
          margin: '0 auto',
          paddingTop: 2,
        })}
      >
        <CustomFieldDetailRows
          definitions={definitions}
          properties={draftProperties}
          onChange={(key, value) => updateProperty({ [key]: value })}
          disabled={disabled}
        />
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
