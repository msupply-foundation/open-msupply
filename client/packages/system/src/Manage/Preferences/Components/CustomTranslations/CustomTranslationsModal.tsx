import React, { useState } from 'react';
import {
  ButtonWithIcon,
  DialogButton,
  LoadingButton,
} from '@common/components';
import { EditIcon, SaveIcon } from '@common/icons';
import { useIntlUtils, useTranslation } from '@common/intl';
import { useDialog, useNotification, useToggle } from '@common/hooks';
import { mapTranslationsToArray, mapTranslationsToObject } from './helpers';
import { TranslationsTable } from './TranslationsInputTable';

export const EditCustomTranslations = ({
  value,
  update,
  disabled,
}: {
  value: Record<string, string>;
  update: (value: Record<string, string>) => Promise<boolean>;
  disabled: boolean;
}) => {
  const t = useTranslation();
  const isOpen = useToggle();

  const onClose = () => {
    isOpen.toggleOff();
  };

  return (
    <>
      <ButtonWithIcon
        label={t('button.edit')}
        onClick={isOpen.toggleOn}
        Icon={<EditIcon />}
        disabled={disabled}
      />
      {isOpen.isOn && (
        <CustomTranslationsModal
          value={value}
          update={update}
          onClose={onClose}
        />
      )}
    </>
  );
};

export const CustomTranslationsModal = ({
  value,
  update,
  onClose,
}: {
  value: Record<string, string>;
  update: (value: Record<string, string>) => Promise<boolean>;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const defaultTranslation = useTranslation('common');
  const { invalidateCustomTranslations } = useIntlUtils();
  const { success, error } = useNotification();

  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });

  const [loading, setLoading] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [translations, setTranslations] = useState(
    mapTranslationsToArray(value, defaultTranslation)
  );

  const saveAndClose = async () => {
    const hasInvalidTranslations = translations.some(tr => tr.isInvalid);
    if (hasInvalidTranslations) {
      setShowValidationErrors(true);
      const errorSnack = error(t('error.invalid-custom-translation'));
      errorSnack();
      return;
    }

    setLoading(true);
    const asObject = mapTranslationsToObject(translations);

    const successfulSave = await update(asObject);
    setLoading(false);

    if (successfulSave) {
      invalidateCustomTranslations();
      success(t('messages.saved'))();
      onClose();
    }
  };

  return (
    <>
      <Modal
        title={t('label.edit-custom-translations')}
        width={1200}
        height={900}
        cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
        okButton={
          <LoadingButton
            isLoading={loading}
            onClick={saveAndClose}
            label={t('button.save')}
            startIcon={<SaveIcon />}
            variant="contained"
            color="secondary"
          />
        }
      >
        <TranslationsTable
          translations={translations}
          setTranslations={setTranslations}
          showValidationErrors={showValidationErrors}
        />
      </Modal>
    </>
  );
};
