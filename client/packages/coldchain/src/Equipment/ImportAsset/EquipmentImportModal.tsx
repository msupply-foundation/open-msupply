import React, { FC, useState } from 'react';
import { EquipmentReviewTab } from './ReviewTab';
import { EquipmentUploadTab } from './UploadTab';
import { EquipmentImportTab } from './ImportTab';
import { useDialog, useNotification } from '@common/hooks';
import {
  DialogButton,
  TabContext,
  useTabs,
  Box,
  Grid,
  Alert,
  InsertAssetInput,
  ClickableStepper,
  FileUtils,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { AssetFragment, useAssets } from '../api';
import { importEquipmentToCsv } from '../utils';
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
  catalogueItemId: string | null | undefined;
  id: string;
  notes: string;
  errorMessage: string;
  isUpdate: boolean;
};

export const toInsertEquipmentInput = (row: ImportRow): InsertAssetInput => ({
  assetNumber: row.assetNumber,
  catalogueItemId: row.catalogueItemId,
  id: row.id,
  notes: row.notes,
});

export const toUpdateEquipmentInput = (row: ImportRow): AssetFragment => ({
  assetNumber: row.assetNumber,
  catalogueItemId: row.catalogueItemId,
  id: row.id,
  // Assigning default values here as the parser in the API will ignore.
  // Better type management would be gelpful here
  __typename: 'AssetNode',
  createdDatetime: undefined,
  modifiedDatetime: undefined,
});

export const EquipmentImportModal: FC<EquipmentImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslation('coldchain');
  const { success } = useNotification();
  const { currentTab, onChangeTab } = useTabs(Tabs.Upload);
  const [activeStep, setActiveStep] = useState(0);
  const { Modal } = useDialog({ isOpen, onClose });

  const [errorMessage, setErrorMessage] = useState<string>(() => '');
  const [importProgress, setImportProgress] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);

  const { mutateAsync: insertAssets } = useAssets.document.insert();
  const { mutateAsync: updateAssets } = useAssets.document.update();

  const [bufferedEquipment, setBufferedEquipment] = useState<ImportRow[]>(
    () => []
  );

  console.info('buffered equipment:', bufferedEquipment);

  const csvExport = async () => {
    const csv = importEquipmentToCsv(
      bufferedEquipment.map((row: ImportRow): any => {
        return toInsertEquipmentInput(row);
      }),
      t
    );
    FileUtils.exportCSV(csv, t('filename.cce-failed-uploads'));
    success(t('success'))();
  };

  const importAction = async () => {
    onChangeTab(Tabs.Import);
    const numberImportRecords = bufferedEquipment?.length ?? 0;
    if (bufferedEquipment && numberImportRecords > 0) {
      const importErrorRows: ImportRow[] = [];
      // Import count can be quite large, we break this into blocks of 100 to avoid too much concurency
      // A dedicated endpoint for this should probably be created on the backend
      const remainingRecords = bufferedEquipment;
      while (remainingRecords.length) {
        await Promise.all(
          remainingRecords.splice(0, 100).map(async asset => {
            if (asset.isUpdate) {
              await updateAssets(toUpdateEquipmentInput(asset)).catch(err => {
                if (!err) {
                  err = { message: t('messages.unknown-error') };
                }
                console.info(err.message);
                importErrorRows.push({
                  ...asset,
                  errorMessage: err.message,
                });
              });
            } else {
              await insertAssets(toInsertEquipmentInput(asset)).catch(err => {
                if (!err) {
                  err = { message: t('messages.unknown-error') };
                }
                importErrorRows.push({
                  ...asset,
                  errorMessage: err.message,
                });
              });
            }
          })
        ).then(() => {
          // Update Progress Bar
          const percentComplete =
            100 - (remainingRecords.length / numberImportRecords) * 100.0;
          setImportProgress(percentComplete);
          setImportErrorCount(importErrorRows.length);
        });
      }
      if (importErrorRows.length === 0) {
        const importMessage = t('messages.import-generic', {
          count: numberImportRecords,
        });
        const successSnack = success(importMessage);
        successSnack();
        onChangeTab(Tabs.Upload);
        setBufferedEquipment([]);
        setErrorMessage('');
        onClose();
      } else {
        // Load the error rows in to the component for review
        setErrorMessage(t('messages.import-error'));
        setBufferedEquipment(importErrorRows);
        setImportErrorCount(importErrorRows.length);
        onChangeTab(Tabs.Review);
      }
    }
  };

  const onClickStep = (tabName: string) => {
    switch (tabName) {
      case Tabs.Upload:
        changeTab(tabName as Tabs);
        break;
      case Tabs.Review:
        changeTab(tabName as Tabs);
        break;
      case Tabs.Import:
        // Do nothing, user can't get to the import page without clicking the import button
        break;
    }
  };

  const changeTab = (tabName: Tabs) => {
    switch (tabName) {
      case Tabs.Upload:
        setErrorMessage('');
        setBufferedEquipment([]);
        setActiveStep(0);
        break;
      case Tabs.Review:
        setActiveStep(1);
        break;
      case Tabs.Import:
        setActiveStep(2);
        break;
    }
    onChangeTab(tabName);
  };

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

  console.info('current tab', currentTab);

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={importNotReady}
          onClick={async () => {
            importAction();
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
            changeTab(Tabs.Upload);
            onClose();
          }}
        />
      }
      nextButton={
        <DialogButton
          variant="export"
          disabled={exportNotReady}
          onClick={async () => {
            console.info('csv export');
            csvExport();
          }}
        />
      }
      title={t('label.import-cce')}
      height={1000}
      width={1600}
    >
      <>
        <ClickableStepper
          steps={importSteps}
          activeStep={activeStep}
          onClickStep={onClickStep}
        ></ClickableStepper>
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
                changeTab(Tabs.Review);
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
