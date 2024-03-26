import React, { FC, useEffect, useState } from 'react';
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
  ClickableStepper,
  FileUtils,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { AssetFragment, useAssets } from '../api';
import { importEquipmentToCsv } from '../utils';
import {
  AssetCatalogueItemFragment,
  useAssetData,
} from '@openmsupply-client/system';
import { LocationIds } from '../DetailView';

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
  catalogueItemCode: string | null | undefined;
  id: string;
  notes: string;
  errorMessage: string;
  isUpdate: boolean;
};

export type LineNumber = {
  lineNumber: number;
};
export const toInsertEquipmentInput = (
  row: ImportRow,
  catalogueItemData: AssetCatalogueItemFragment[] | undefined
): Partial<AssetFragment & LocationIds> => ({
  assetNumber: row.assetNumber,
  catalogueItemId: catalogueItemData
    ?.filter(
      (item: { code: string | null | undefined }) =>
        item.code == row.catalogueItemCode
    )
    ?.map((item: { id: string }) => item.id)
    .pop(),
  id: row.id,
  notes: row.notes,
});

export const toExportEquipment = (
  row: ImportRow,
  index: number
): Partial<ImportRow> & LineNumber => ({
  assetNumber: row.assetNumber,
  catalogueItemCode: row.catalogueItemCode,
  id: row.id,
  notes: row.notes,
  lineNumber: index + 2,
});

export const toUpdateEquipmentInput = (
  row: ImportRow,
  catalogueItemData: AssetCatalogueItemFragment[] | undefined
): Partial<AssetFragment & LocationIds> => ({
  assetNumber: row.assetNumber,
  catalogueItemId: catalogueItemData
    ?.filter(
      (item: { code: string | null | undefined }) =>
        item.code == row.catalogueItemCode
    )
    ?.map((item: { id: string }) => item.id)
    .pop(),
  id: row.id,
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
  const {
    data: catalogueItemData,
    fetchAsync,
    isLoading,
  } = useAssetData.document.listAll();

  const { mutateAsync: insertAssets } = useAssets.document.insert();
  const { mutateAsync: updateAssets } = useAssets.document.update();

  const [bufferedEquipment, setBufferedEquipment] = useState<ImportRow[]>(
    () => []
  );

  useEffect(() => {
    fetchAsync();
  }, [fetchAsync]);

  const csvExport = async () => {
    const csv = importEquipmentToCsv(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bufferedEquipment.map((row: ImportRow, index: number) =>
        toExportEquipment(row, index)
      ),
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
      const remainingRecords = bufferedEquipment;
      while (remainingRecords.length) {
        await Promise.all(
          remainingRecords.splice(0, 100).map(async asset => {
            if (asset.isUpdate) {
              await updateAssets(
                toUpdateEquipmentInput(asset, catalogueItemData?.nodes)
              ).catch(err => {
                if (!err) {
                  err = { message: t('messages.unknown-error') };
                }
                importErrorRows.push({
                  ...asset,
                  errorMessage: err.message,
                });
              });
            } else {
              await insertAssets(
                toInsertEquipmentInput(asset, catalogueItemData?.nodes)
              ).catch(err => {
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
    bufferedEquipment.length == 0 || errorMessage.length > 0 || isLoading;
  const exportNotReady = !(
    bufferedEquipment.length >= 0 && errorMessage.length > 0
  );

  const importSteps = [
    { label: t('label.upload'), description: '', clickable: true },
    { label: t('label.review'), description: '', clickable: true },
    {
      label: t('label.import'),
      description: '',
      clickable: false,
    },
  ];

  return (
    <Modal
      okButton={
        <DialogButton
          variant="next"
          disabled={importNotReady}
          onClick={() => {
            importAction();
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
              catalogueItemData={catalogueItemData?.nodes}
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
