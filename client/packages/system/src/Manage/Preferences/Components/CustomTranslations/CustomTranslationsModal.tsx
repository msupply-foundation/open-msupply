import React, { useState } from 'react';
import { ButtonWithIcon, DialogButton } from '@common/components';
import { EditIcon } from '@common/icons';
import {
  CUSTOM_TRANSLATIONS_NAMESPACE,
  useIntl,
  useTranslation,
} from '@common/intl';
import { useDialog, useToggle } from '@common/hooks';
import { mapTranslationsToArray, mapTranslationsToObject } from './helpers';
import { TranslationsTable } from './TranslationsInputTable';

export const CustomTranslationsModal = ({
  value,
  update,
}: {
  value: Record<string, string>;
  update: (value: Record<string, string>) => Promise<void>;
}) => {
  const t = useTranslation();
  const defaultTranslation = useTranslation('common');
  const isOpen = useToggle();
  const { Modal } = useDialog({ isOpen: isOpen.isOn, disableBackdrop: true });
  const [translations, setTranslations] = useState(
    mapTranslationsToArray(value, defaultTranslation)
  );
  const { i18n } = useIntl();

  const saveAndClose = async () => {
    const asObject = mapTranslationsToObject(translations);

    await update(asObject);

    // Note - this is still requires the component in question to
    // re-render to pick up the new translations (i.e. navigate away)
    i18n.reloadResources(undefined, CUSTOM_TRANSLATIONS_NAMESPACE);

    isOpen.toggleOff();
  };

  return (
    <>
      <ButtonWithIcon
        label={t('button.edit')}
        onClick={isOpen.toggleOn}
        Icon={<EditIcon />}
      />
      <Modal
        title={t('label.edit-custom-translations')}
        width={1200}
        cancelButton={
          <DialogButton variant="cancel" onClick={isOpen.toggleOff} />
        }
        okButton={<DialogButton variant="ok" onClick={saveAndClose} />}
      >
        <TranslationsTable
          translations={translations}
          setTranslations={setTranslations}
        />
      </Modal>
    </>
  );
};
