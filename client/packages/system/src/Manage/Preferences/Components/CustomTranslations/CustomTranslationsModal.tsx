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
import { useDialog, useToggle } from '@common/hooks';
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

  const { Modal } = useDialog({ isOpen: true, disableBackdrop: true });

  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState(
    mapTranslationsToArray(value, defaultTranslation)
  );

  const saveAndClose = async () => {
    setLoading(true);
    const asObject = mapTranslationsToObject(translations);
    await update(asObject);
    // Note - this is still requires the component in question to
    // re-render to pick up the new translations (i.e. navigate away)
    i18n.reloadResources(undefined, CUSTOM_TRANSLATIONS_NAMESPACE);
    setLoading(false);
    onClose();
  };

  return (
    <>
      <Modal
        title={t('label.edit-custom-translations')}
        width={1200}
        height={700}
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
          />
        </TableProvider>
      </Modal>
    </>
  );
};
