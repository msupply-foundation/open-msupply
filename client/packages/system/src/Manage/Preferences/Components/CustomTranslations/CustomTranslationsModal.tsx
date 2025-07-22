import React, { useState } from 'react';
import { ButtonWithIcon, DialogButton } from '@common/components';
import { EditIcon, PlusCircleIcon } from '@common/icons';
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

  const save = async () => {
    const asObject = mapTranslationsToObject(translations);

    await update(asObject);
    //     // Note - this is still requires the component in question to
    //     // re-render to pick up the new translations
    //     // TODO: Could trigger full refresh on modal save?
    i18n.reloadResources(undefined, CUSTOM_TRANSLATIONS_NAMESPACE);
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
        width={900}
        cancelButton={
          <DialogButton variant="cancel" onClick={isOpen.toggleOff} />
        }
        okButton={<DialogButton variant="ok" onClick={save} />}
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
  setTranslations: (translations: Translation[]) => void;
}) => {
  const t = useTranslation();

  //   const deleteDose = (id: string) => {
  //     updatePatch({
  //       vaccineCourseDoses: doses.filter(dose => dose.id !== id),
  //     });
  //   };

  const columns = useColumns<Translation>([
    {
      key: 'key',
      Cell: TooltipTextCell,
      label: 'label.key',
    },
    {
      key: 'default',
      Cell: TooltipTextCell,
      label: 'label.default',
    },
    {
      key: 'custom',
      Cell: TextInputCell,
      label: 'label.custom',
      setter: input => {
        const updatedTranslations = translations.map(tr =>
          tr.id === input.id ? { ...tr, ...input } : tr
        );
        setTranslations(updatedTranslations);
      },
    },

    //   {
    //     key: 'delete',
    //     Cell: ({ rowData }) => (
    //       <IconButton
    //         icon={<DeleteIcon sx={{ height: '0.9em' }} />}
    //         label={t('label.delete')}
    //         onClick={() => deleteDose(rowData.id)}
    //       />
    //     ),
    //   },
  ]);

  return (
    <>
      <Box display="flex" justifyContent="flex-end" marginBottom="8px">
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.translation')}
          onClick={() => {}}
        />
      </Box>
      <TableProvider createStore={createTableStore}>
        <DataTable
          id={'translations-list'}
          columns={columns}
          data={translations}
          noDataMessage={t('message.add-a-translation')}
          dense
        />
      </TableProvider>
    </>
  );
};
