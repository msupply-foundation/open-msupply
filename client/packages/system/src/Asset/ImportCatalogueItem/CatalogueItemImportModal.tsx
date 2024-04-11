import React, { FC, useState } from 'react';
import { AssetItemReviewTab } from './ReviewTab';
import { AssetItemUploadTab } from './UploadTab';
import { AssetItemImportTab } from './ImportTab';
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
  FnUtils,
  noOtherVariants,
  UniqueCombinationKey,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { importRowToCsv } from '../utils';
import {
  AssetCatalogueItemFragment,
  useAssetData,
} from '@openmsupply-client/system';

interface AssetItemImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

enum Tabs {
  Upload = 'Upload',
  Review = 'Review',
  Import = 'Import',
}

export type ImportRow = {
  id: string;
  subCatalogue: string;
  code: string;
  manufacturer?: string;
  model: string;
  class: string;
  classId?: string;
  category: string;
  categoryId?: string;
  type: string;
  typeId?: string;
  errorMessage?: string;
};

export type LineNumber = {
  lineNumber: number;
};
const toInsertAssetItemInput = (row: ImportRow): AssetCatalogueItemFragment => {
  return {
    __typename: 'AssetCatalogueItemNode',
    id: FnUtils.generateUUID(),
    subCatalogue: row.subCatalogue,
    code: row.code,
    manufacturer: row.manufacturer,
    model: row.model,
    assetClassId: row.classId ?? '',
    assetCategoryId: row.categoryId ?? '',
    assetTypeId: row.typeId ?? '',
  };
};

const toExportAssetItem = (
  row: ImportRow,
  index: number
): Partial<ImportRow & LineNumber> => ({
  ...row,
  lineNumber: index + 2,
});

export const AssetCatalogueItemImportModal: FC<AssetItemImportModalProps> = ({
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
  const { data: assetClasses, isLoading: isLoadingClasses } =
    useAssetData.utils.classes();

  const { data: assetCategories, isLoading: isLoadingCategories } =
    useAssetData.utils.categories();

  const { data: assetTypes, isLoading: isLoadingTypes } =
    useAssetData.utils.types();

  const { mutateAsync: insertAssetCatalogueItem } =
    useAssetData.document.insert();

  const [bufferedAssetItem, setBufferedAssetItem] = useState<ImportRow[]>(
    () => []
  );

  const csvExport = async () => {
    const csv = importRowToCsv(
      bufferedAssetItem.map((row: ImportRow, index: number) =>
        toExportAssetItem(row, index)
      ),
      t
    );
    FileUtils.exportCSV(csv, t('filename.failed-import-rows'));
    success(t('success'))();
  };

  const mapStructuredErrors = (
    result: Awaited<ReturnType<typeof insertAssetCatalogueItem>>
  ): string | undefined => {
    if (result.__typename === 'AssetCatalogueItemNode') {
      return undefined;
    }

    const { error: insertError } = result;

    switch (insertError.__typename) {
      case 'RecordAlreadyExist':
        return t('error.record-already-exists');
      case 'UniqueValueViolation': {
        switch (insertError.field) {
          case 'code':
            return t('error.unique-value-violation', {
              field: t('label.code'),
            });
          case 'serial':
            return t('error.unique-value-violation', {
              field: t('label.serial'),
            });
          default:
            return insertError.description;
        }
        break;
      }
      case 'UniqueCombinationViolation':
        if (
          insertError.fields.includes(UniqueCombinationKey.Manufacturer) &&
          insertError.fields.includes(UniqueCombinationKey.Model)
        ) {
          return t('error.manufacturer-model-unique');
        }
        return insertError.description;
      case 'DatabaseError':
        return insertError.description;
      case 'InternalError':
        return insertError.description;
      default:
        noOtherVariants(insertError);
    }
  };

  const importAction = async () => {
    onChangeTab(Tabs.Import);
    const numberImportRecords = bufferedAssetItem?.length ?? 0;
    if (bufferedAssetItem && numberImportRecords > 0) {
      const importErrorRows: ImportRow[] = [];
      // Import count can be quite large, we break this into blocks of 10 to avoid too much concurrency
      const remainingRecords = bufferedAssetItem;
      while (remainingRecords.length) {
        await Promise.all(
          remainingRecords.splice(0, 10).map(async asset => {
            const result = await insertAssetCatalogueItem(
              toInsertAssetItemInput(asset)
            ).catch(err => {
              if (!err) {
                err = { message: t('messages.unknown-error') };
              }
              importErrorRows.push({
                ...asset,
                errorMessage: err.message,
              });
            });
            // Map structured Errors
            if (result?.__typename === 'InsertAssetCatalogueItemError') {
              const errorMessage = mapStructuredErrors(result);
              importErrorRows.push({
                ...asset,
                errorMessage: errorMessage,
              });
            }
          })
        ).then(() => {
          // Update Progress Bar
          const percentComplete =
            10 - (remainingRecords.length / numberImportRecords) * 100.0;
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
        setBufferedAssetItem([]);
        setErrorMessage('');
        onClose();
      } else {
        // Load the error rows in to the component for review
        setErrorMessage(t('messages.import-error'));
        setBufferedAssetItem(importErrorRows);
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
        setBufferedAssetItem([]);
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
    bufferedAssetItem.length == 0 ||
    errorMessage.length > 0 ||
    isLoadingClasses ||
    isLoadingCategories ||
    isLoadingTypes;
  const exportNotReady = !(
    bufferedAssetItem.length >= 0 && errorMessage.length > 0
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
            setBufferedAssetItem([]);
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
      title={t('label.import')}
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
            <AssetItemUploadTab
              tab={Tabs.Upload}
              setAssetItem={setBufferedAssetItem}
              setErrorMessage={setErrorMessage}
              onUploadComplete={() => {
                changeTab(Tabs.Review);
              }}
              assetClasses={assetClasses?.nodes ?? []}
              assetCategories={assetCategories?.nodes ?? []}
              assetTypes={assetTypes?.nodes ?? []}
            />
            <AssetItemReviewTab
              tab={Tabs.Review}
              uploadedRows={bufferedAssetItem}
            />
            <AssetItemImportTab
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
