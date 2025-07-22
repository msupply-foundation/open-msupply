import React, { useState } from 'react';
import { ButtonWithIcon, DialogButton } from '@common/components';
import { EditIcon, PlusCircleIcon } from '@common/icons';
import { useIntl, useTranslation } from '@common/intl';
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
import { mapTranslations, Translation } from './helpers';

export const CustomTranslationsModal = ({
  value,
}: {
  value: Record<string, string>;
}) => {
  const t = useTranslation();
  const defaultTranslation = useTranslation('common');
  const isOpen = useToggle();
  const { Modal } = useDialog({ isOpen: isOpen.isOn, disableBackdrop: true });
  const [translations, setTranslations] = useState(
    mapTranslations(value, defaultTranslation)
  );
  const { i18n } = useIntl();

  // const translations = mapTranslations(value, defaultTranslation);

  const save = async () => {
    //     const newValue = value; // Validate JSON format
    //     setValue(newValue);
    //     await update(newValue);
    //     // Note - this is still requires the component in question to
    //     // re-render to pick up the new translations
    //     // TODO: Could trigger full refresh on modal save?
    //     i18n.reloadResources(undefined, CUSTOM_TRANSLATIONS_NAMESPACE);
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
        okButton={
          <DialogButton
            // disabled={}
            variant="ok"
            onClick={save}
          />
        }
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
  //   updatePatch,
}: {
  translations: Translation[];
  setTranslations: (translations: Translation[]) => void;
  //   updatePatch: (newData: Partial<DraftVaccineCourse>) => void;
}) => {
  const t = useTranslation();

  //   const deleteDose = (id: string) => {
  //     updatePatch({
  //       vaccineCourseDoses: doses.filter(dose => dose.id !== id),
  //     });
  //   };

  //   const updateDose: ColumnDataSetter<VaccineCourseDoseFragment> = newData => {
  //     updatePatch({
  //       vaccineCourseDoses: doses.map(dose =>
  //         dose.id === newData.id ? { ...dose, ...newData } : dose
  //       ),
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

//  <TextArea
//           onChange={async e => {
//             const newValue = JSON.parse(e.target.value); // Validate JSON format
//             setValue(newValue);
//             await update(newValue);
//             // Note - this is still requires the component in question to
//             // re-render to pick up the new translations
//             // TODO: Could trigger full refresh on modal save?
//             i18n.reloadResources(undefined, CUSTOM_TRANSLATIONS_NAMESPACE);
//           }}
//           value={JSON.stringify(value)}
//           maxRows={10}
//           minRows={10}
//           style={{ padding: '0 0 0 50px' }}
//           slotProps={{
//             input: {
//               sx: {
//                 border: theme => `1px solid ${theme.palette.gray.main}`,
//                 borderRadius: '5px',
//                 padding: '3px',
//               },
//             },
//           }}
//         />
