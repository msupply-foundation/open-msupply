import React, { useState } from 'react';
import { EquipmentReviewTab } from './ReviewTab';
import { EquipmentUploadTab } from './UploadTab';
import { EquipmentImportTab } from './ImportTab';
import {
  QueryParamsProvider,
  createQueryParamsStore,
  useDialog,
  useNotification,
} from '@common/hooks';
import {
  DialogButton,
  TabContext,
  useTabs,
  Grid,
  Alert,
  ClickableStepper,
  AssetLogStatusInput,
  FnUtils,
  useIsCentralServerApi,
  StatusType,
  useExportCSV,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { useAssets } from '../api';
import { importEquipmentToCsvWithErrors } from '../utils';
import {
  AssetCatalogueItemFragment,
  StoreRowFragment,
  useAssetList,
  useAssetProperties,
} from '@openmsupply-client/system';
import { DraftAsset } from '../types';

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
  serialNumber: string | null | undefined;
  installationDate: string | null | undefined;
  replacementDate: string | null | undefined;
  warrantyStart: string | null | undefined;
  warrantyEnd: string | null | undefined;
  status: StatusType;
  needsReplacement: boolean;
  id: string;
  notes: string;
  errorMessage: string;
  warningMessage: string;
  store: StoreRowFragment | null | undefined;
  properties: Record<string, string>;
};

export type LineNumber = {
  lineNumber: number;
};

export const toInsertEquipmentInput = (
  row: ImportRow,
  catalogueItemData: AssetCatalogueItemFragment[] | undefined
): Partial<DraftAsset> => {
  const catalogueItemId = catalogueItemData?.find(
    item => item.code === row.catalogueItemCode
  )?.id;
  const { properties: parsedProperties, store, ...rest } = row;

  return {
    ...rest,
    needsReplacement: !!row.needsReplacement,
    catalogueItemId,
    store: store ? { ...store, __typename: 'StoreNode', storeName: '' } : null,
    parsedProperties,
  };
};

export const toStatusTypeInput = (status: StatusType): AssetLogStatusInput => {
  switch (status) {
    case StatusType.Functioning:
      return AssetLogStatusInput.Functioning;
    case StatusType.Decommissioned:
      return AssetLogStatusInput.Decommissioned;
    case StatusType.FunctioningButNeedsAttention:
      return AssetLogStatusInput.FunctioningButNeedsAttention;
    case StatusType.NotFunctioning:
      return AssetLogStatusInput.NotFunctioning;
    case StatusType.NotInUse:
      return AssetLogStatusInput.NotInUse;
    case StatusType.Unserviceable:
      return AssetLogStatusInput.Unserviceable;
  }
};

export const toExportEquipment = (
  row: ImportRow,
  index: number
): Partial<ImportRow & LineNumber> => ({
  ...row,
  lineNumber: index + 2,
});

export const toUpdateEquipmentInput = (
  row: ImportRow,
  catalogueItemData: AssetCatalogueItemFragment[] | undefined
): Partial<DraftAsset> => ({
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

export const EquipmentImportModal = ({
  isOpen,
  onClose,
}: EquipmentImportModalProps) => {
  const t = useTranslation();
  const { success } = useNotification();
  const { currentTab, onChangeTab } = useTabs(Tabs.Upload);
  const [activeStep, setActiveStep] = useState(0);
  const { Modal } = useDialog({ isOpen, onClose });

  const [errorMessage, setErrorMessage] = useState<string>(() => '');
  const [warningMessage, setWarningMessage] = useState<string>(() => '');

  const [importProgress, setImportProgress] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);

  const exportCSV = useExportCSV();
  const {
    query: { data: catalogueItemData, isLoading },
  } = useAssetList();
  const { data: properties } = useAssetProperties();
  const { mutateAsync: insertAssets } = useAssets.document.insert();
  const { insertLog, invalidateQueries } = useAssets.log.insert();
  const isCentralServer = useIsCentralServerApi();

  const [bufferedEquipment, setBufferedEquipment] = useState<ImportRow[]>(
    () => []
  );

  const csvExport = async () => {
    const csv = importEquipmentToCsvWithErrors(
      bufferedEquipment.map((row: ImportRow, index: number) =>
        toExportEquipment(row, index)
      ),
      t,
      isCentralServer,
      properties?.map(p => p.key) ?? []
    );
    exportCSV(csv, t('filename.cce-failed-uploads'));
  };

  const importErrorRows: ImportRow[] = [];
  const insertAsset = async (row: ImportRow) => {
    try {
      await insertAssets(toInsertEquipmentInput(row, catalogueItemData?.nodes));
      await insertLog({
        id: FnUtils.generateUUID(),
        assetId: row.id,
        comment: t('message.asset-created'),
        status: toStatusTypeInput(row.status),
      });
    } catch (e) {
      const errorMessage = (e as Error).message ?? t('messages.unknown-error');

      importErrorRows.push({
        ...row,
        errorMessage,
      });
    }
  };

  const importAction = async () => {
    onChangeTab(Tabs.Import);
    const numberImportRecords = bufferedEquipment?.length ?? 0;
    if (bufferedEquipment && numberImportRecords > 0) {
      importErrorRows.length = 0;
      // Import count can be quite large, we break this into blocks of 100 to avoid too much concurrency
      const remainingRecords = bufferedEquipment;
      while (remainingRecords.length) {
        await Promise.all(
          remainingRecords.splice(0, 100).map(insertAsset)
        ).then(() => {
          invalidateQueries();
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
  const showWarnings = errorMessage.length == 0 && warningMessage.length > 0;

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
          variant="next-and-ok"
          disabled={importNotReady}
          onClick={importAction}
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
          onClick={csvExport}
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
        />
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <TabContext value={currentTab}>
          <Grid container flex={1} flexDirection="column" gap={1}>
            <QueryParamsProvider
              createStore={createQueryParamsStore<StoreRowFragment>({
                initialSortBy: { key: 'code' },
              })}
            >
              <EquipmentUploadTab
                tab={Tabs.Upload}
                catalogueItemData={catalogueItemData?.nodes}
                setEquipment={setBufferedEquipment}
                setErrorMessage={setErrorMessage}
                setWarningMessage={setWarningMessage}
                onUploadComplete={() => {
                  changeTab(Tabs.Review);
                }}
              />
            </QueryParamsProvider>
            <EquipmentReviewTab
              showWarnings={showWarnings}
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
