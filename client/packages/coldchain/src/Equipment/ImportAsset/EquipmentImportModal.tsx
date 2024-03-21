import React, { FC, useState } from 'react';
import { EquipmentReviewTab } from './ReviewTab';
import { EquipmentUploadTab } from './UploadTab';
import { EquipmentImportTab } from './ImportTab';
import { useDialog } from '@common/hooks';
import {
  DialogButton,
  HorizontalStepper,
  TabContext,
  useTabs,
  Box,
  Grid,
  Alert,
  InsertAssetInput,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
interface EquipmentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

enum Tabs {
  Upload = 'Upload',
  Review = 'Review',
  Import = 'Import',
}

export type ImportRow = {
  assetNumber: string;
  catalogueItemId: string;
  id: string;
  errorMessage: string;
  isUpdate: boolean;
};

export const toEquipmentInput = (row: ImportRow): InsertAssetInput => ({
  assetNumber: row.assetNumber,
  catalogueItemId: row.catalogueItemId,
  id: row.id,
});

export const EquipmentImportModal: FC<EquipmentImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslation('coldchain');
  // const { error, success } = useNotification();
  const { currentTab, onChangeTab } = useTabs(Tabs.Upload);
  const { Modal } = useDialog({ isOpen, onClose });

  const [errorMessage, setErrorMessage] = useState<string>(() => '');
  const [importProgress] = useState(0);
  const [importErrorCount] = useState(0);

  // const { mutateAsync: insertManufacturer } = useManufacturer.document.insert();
  // const { mutateAsync: updateManufacturer } = useManufacturer.document.update();

  const [bufferedEquipment, setBufferedEquipment] = useState<ImportRow[]>(
    () => []
  );

  // const csvExport = async () => {
  //   const csv = manufacturersToCsv(
  //     bufferedManufacturers.map((row: ImportRow): any => {
  //       return toManufacturerInput(row);
  //     }),
  //     t
  //   );
  //   FileUtils.exportCSV(csv, t('filename.manufacturers'));
  //   success(t('success'))();
  // };

  // const importAction = async () => {
  //   changeTab(Tabs.Import);
  //   const numberImportRecords = bufferedManufacturers?.length ?? 0;
  //   if (bufferedManufacturers && numberImportRecords > 0) {
  //     const importErrorRows: ImportRow[] = [];
  //     // Import count can be quite large, we break this into blocks of 100 to avoid too much concurency
  //     // A dedicated endpoint for this should probably be created on the backend
  //     const remainingRecords = bufferedManufacturers;
  //     while (remainingRecords.length) {
  //       await Promise.all(
  //         remainingRecords.splice(0, 100).map(async manufacturer => {
  //           if (manufacturer.isUpdate) {
  //             await updateManufacturer(toManufacturerInput(manufacturer)).catch(
  //               err => {
  //                 if (!err) {
  //                   err = { message: t('messages.unknown-error') };
  //                 }
  //                 importErrorRows.push({
  //                   ...manufacturer,
  //                   errorMessage: err.message,
  //                 });
  //               }
  //             );
  //           } else {
  //             await insertManufacturer(toManufacturerInput(manufacturer)).catch(
  //               err => {
  //                 if (!err) {
  //                   err = { message: t('messages.unknown-error') };
  //                 }
  //                 importErrorRows.push({
  //                   ...manufacturer,
  //                   errorMessage: err.message,
  //                 });
  //               }
  //             );
  //           }
  //         })
  //       ).then(() => {
  //         // Update Progress Bar
  //         const percentComplete =
  //           100 - (remainingRecords.length / numberImportRecords) * 100.0;
  //         setImportProgress(percentComplete);
  //         setImportErrorCount(importErrorRows.length);
  //       });
  //     }
  //     if (importErrorRows.length === 0) {
  //       const importMessage = t('messages.import-generic', {
  //         count: numberImportRecords,
  //       });
  //       const successSnack = success(importMessage);
  //       successSnack();
  //       changeTab(Tabs.Upload);
  //       setBufferedManufacturers([]);
  //       setErrorMessage('');
  //       onClose();
  //     } else {
  //       // Load the error rows in to the component for review
  //       setErrorMessage(t('messages.import-error'));
  //       setBufferedManufacturers(importErrorRows);
  //       setImportErrorCount(importErrorRows.length);
  //       changeTab(Tabs.Review);
  //     }
  //   }
  // };

  // const onClickStep = (tabName: string) => {
  //   switch (tabName) {
  //     case Tabs.Upload:
  //       changeTab(tabName as Tabs);
  //       break;
  //     case Tabs.Review:
  //       changeTab(tabName as Tabs);
  //       break;
  //     case Tabs.Import:
  //       // Do nothing, user can't get to the import page without clicking the import button
  //       break;
  //   }
  // };

  // const changeTab = (tabName: Tabs) => {
  //   switch (tabName) {
  //     case Tabs.Upload:
  //       setErrorMessage('');
  //       setBufferedManufacturers([]);
  //       setActiveStep(0);
  //       break;
  //     case Tabs.Review:
  //       setActiveStep(1);
  //       break;
  //     case Tabs.Import:
  //       setActiveStep(2);
  //       break;
  //   }
  //   onChangeTab(tabName);
  // };

  const importNotReady =
    bufferedEquipment.length == 0 || errorMessage.length > 0;
  const exportNotReady = !(
    bufferedEquipment.length >= 0 && errorMessage.length > 0
  );

  const importSteps = [
    { label: t('label.upload'), description: '', clickable: true },
    { label: t('label.review'), description: '', clickable: true },
    {
      label: t('label.import-cce'),
      description: '',
      clickable: false,
    },
  ];

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={importNotReady}
          onClick={async () => {
            // importAction();
            console.info('import');
          }}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={async () => {
            setBufferedEquipment([]);
            setErrorMessage('');
            onChangeTab(Tabs.Upload);
            onClose();
          }}
        />
      }
      nextButton={
        <DialogButton
          variant="next"
          disabled={exportNotReady}
          onClick={async () => {
            console.info('csv export');
            // csvExport();
          }}
        />
      }
      title={t('label.import-cce')}
      height={1000}
      width={1600}
    >
      <>
        <HorizontalStepper
          steps={importSteps}
          // onClickStep={onClickStep}
        ></HorizontalStepper>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <TabContext value={currentTab}>
          <Grid container flex={1} flexDirection="column" gap={1}>
            <Grid item display="flex">
              <Box flex={1} flexBasis="40%"></Box>
              <Box flex={1} flexBasis="60%"></Box>
            </Grid>
            <EquipmentUploadTab
              tab={Tabs.Upload}
              setEquipment={setBufferedEquipment}
              setErrorMessage={setErrorMessage}
              onUploadComplete={() => {
                onChangeTab(Tabs.Review);
              }}
            />
            <EquipmentReviewTab
              tab={Tabs.Review}
              uploadedRows={bufferedEquipment}
            />
            <EquipmentImportTab
              tab={Tabs.Import}
              importProgress={importProgress}
              importErrorCount={importErrorCount}
            />
          </Grid>
        </TabContext>
      </>
    </Modal>
  );
};
