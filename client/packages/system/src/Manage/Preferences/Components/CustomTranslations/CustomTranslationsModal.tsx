import React, { useState } from 'react';
import {
  ButtonWithIcon,
  DialogButton,
  LoadingButton,
} from '@common/components';
import { EditIcon, SaveIcon } from '@common/icons';
import {
  CUSTOM_TRANSLATIONS_NAMESPACE,
  useIntl,
  useTranslation,
} from '@common/intl';
import { useDialog, useNotification, useToggle } from '@common/hooks';
import { mapTranslationsToArray, mapTranslationsToObject } from './helpers';
import { TranslationsTable } from './TranslationsInputTable';
import {
  createTableStore,
  TableProvider,
} from '@openmsupply-client/common/src';

export const EditCustomTranslations = ({
  value,
  update,
}: {
  value: Record<string, string>;
  update: (value: Record<string, string>) => Promise<void>;
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
  update: (value: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const defaultTranslation = useTranslation('common');
  const { i18n } = useIntl();
  const { success, error } = useNotification();

  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });

  const [loading, setLoading] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [translations, setTranslations] = useState(
    mapTranslationsToArray(value, defaultTranslation)
  );

  const invalidateCustomTranslations = () => {
    // Clear from local storage cache
    Object.keys(localStorage)
      .filter(
        key =>
          key.startsWith('i18next_res_') &&
          key.endsWith(CUSTOM_TRANSLATIONS_NAMESPACE)
      )
      .forEach(key => localStorage.removeItem(key));

    // Clear from i18next cache (specifically for when we delete a translation)
    for (const lang of i18n.languages) {
      i18n.removeResourceBundle(lang, CUSTOM_TRANSLATIONS_NAMESPACE);
    }

    // Then reload from backend
    // Note - this is still requires the components in question to
    // re-render to pick up the new translations
    i18n.reloadResources(undefined, CUSTOM_TRANSLATIONS_NAMESPACE);
  };

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
    await update(asObject);

    invalidateCustomTranslations();

    setLoading(false);
    success(t('messages.saved'))();
    onClose();
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
        <TableProvider createStore={createTableStore}>
          <TranslationsTable
            translations={translations}
            setTranslations={setTranslations}
            showValidationErrors={showValidationErrors}
          />
        </TableProvider>
      </Modal>
    </>
  );
};
