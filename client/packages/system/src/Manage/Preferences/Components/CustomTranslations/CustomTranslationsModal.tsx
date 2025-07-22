import React, { useState } from 'react';
import { ButtonWithIcon, DialogButton, IconButton } from '@common/components';
import { DeleteIcon, EditIcon } from '@common/icons';
import {
  CUSTOM_TRANSLATIONS_NAMESPACE,
  useIntl,
  useTranslation,
} from '@common/intl';
import { useDialog, useToggle } from '@common/hooks';
import {
  Box,
  createTableStore,
  DataTable,
  TableProvider,
  TextInputCell,
  TooltipTextCell,
  useColumns,
} from '@openmsupply-client/common';
import {
  mapTranslationsToArray,
  mapTranslationsToObject,
  Translation,
} from './helpers';
import {
  TranslationOption,
  TranslationSearchInput,
} from './TranslationSearchInput';

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

const TranslationsTable = ({
  translations,
  setTranslations,
}: {
  translations: Translation[];
  setTranslations: React.Dispatch<React.SetStateAction<Translation[]>>;
}) => {
  const t = useTranslation();

  const columns = useColumns<Translation>([
    {
      key: 'key',
      Cell: TooltipTextCell,
      label: 'label.key',
      width: 200,
    },
    {
      key: 'default',
      Cell: TooltipTextCell,
      label: 'label.default',
      width: 300,
    },
    {
      key: 'custom',
      Cell: TextInputCell,
      label: 'label.custom',
      cellProps: {
        fullWidth: true,
      },
      setter: input => {
        setTranslations(translations => {
          const updatedTranslations = translations.map(tr =>
            tr.id === input.id ? { ...tr, ...input } : tr
          );
          return updatedTranslations;
        });
      },
    },
    {
      key: 'delete',
      width: 50,
      Cell: ({ rowData }) => (
        <IconButton
          icon={<DeleteIcon sx={{ height: '0.9em' }} />}
          label={t('label.delete')}
          onClick={() =>
            setTranslations(translations => {
              const updatedTranslations = translations.filter(
                tr => tr.id !== rowData.id
              );
              return updatedTranslations;
            })
          }
        />
      ),
    },
  ]);

  const onAdd = (option: TranslationOption | null) => {
    if (!option) return;
    const newLine = {
      id: option.key,
      key: option.key,
      default: option.default,
      custom: '',
    };
    setTranslations(translations => [...translations, newLine]);
  };

  return (
    <>
      <TableProvider createStore={createTableStore}>
        <DataTable
          id={'translations-list'}
          columns={columns}
          data={translations}
          noDataMessage={t('message.add-a-translation')}
          dense
        />
      </TableProvider>
      <Box display="flex" justifyContent="flex-start" marginBottom="8px">
        <TranslationSearchInput
          onChange={onAdd}
          existingKeys={translations.map(t => t.key)}
        />
      </Box>
    </>
  );
};
