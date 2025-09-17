import {
  useTabs,
  DialogButton,
  ClickableStepper,
  Alert,
  TabContext,
  ImportTab,
} from '@common/components';
import {
  useNotification,
  useDialog,
  QueryParamsProvider,
  createQueryParamsStore,
} from '@common/hooks';
import { DateUtils, useTranslation } from '@common/intl';
import {
  FnUtils,
  Formatter,
  Grid,
  InsertPurchaseOrderLineInput,
  useExportCSV,
} from '@openmsupply-client/common/src';
import { StoreRowFragment } from '@openmsupply-client/system/src';
import React, { useState } from 'react';
import { UploadTab } from './UploadTab';
import { ReviewTab } from './ReviewTab';
import { usePurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { importPurchaseOrderLinesToCSVWithErrors } from '../utils';
import { PurchaseOrderLineFragment, usePurchaseOrder } from '../../api';

export type ImportRow = Omit<
  PurchaseOrderLineFragment,
  '__typename' | 'item' | 'lineNumber'
> & {
  itemCode: string;
  discountPercentage: number;
  errorMessage: string;
  warningMessage: string;
};

export type LineNumber = {
  lineNumber: number;
};

enum Tabs {
  Upload = 'Upload',
  Review = 'Review',
  Import = 'Import',
}

interface PurchaseOrderLineImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseOrderLineImportModal = ({
  isOpen,
  onClose,
}: PurchaseOrderLineImportModalProps) => {
  const t = useTranslation();
  const exportCSV = useExportCSV();
  const { success } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });
  const { currentTab, onChangeTab } = useTabs(Tabs.Upload);
  const {
    create: { create },
  } = usePurchaseOrderLine();
  const {
    query: { data },
  } = usePurchaseOrder();

  const [activeStep, setActiveStep] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [bufferedLines, setBufferedLines] = useState<ImportRow[]>([]);

  const importSteps = [
    {
      label: t('label.upload'),
      description: '',
      clickable: true,
      tab: Tabs.Upload,
    },
    {
      label: t('label.review'),
      description: '',
      clickable: true,
      tab: Tabs.Review,
    },
    {
      label: t('label.import'),
      description: '',
      clickable: false,
      tab: Tabs.Import,
    },
  ];

  const importNotReady = bufferedLines.length == 0 || errorMessage.length > 0;
  const exportNotReady = !(
    bufferedLines.length >= 0 && errorMessage.length > 0
  );
  const showWarnings = errorMessage.length == 0 && warningMessage.length > 0;

  const changeTab = (tabName: Tabs) => {
    switch (tabName) {
      case Tabs.Upload:
        setErrorMessage('');
        setBufferedLines([]);
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

  const handleCsvExportClick = async () => {
    const csv = importPurchaseOrderLinesToCSVWithErrors(
      bufferedLines.map((row: ImportRow, index: number) => ({
        ...row,
        lineNumber: index + 2,
      })),
      t
    );
    exportCSV(csv, t('filename.purchase-order-line-failed-uploads'));
  };

  const insertFromCSV = async (row: ImportRow, errorRows: ImportRow[]) => {
    if (!data) return;
    try {
      const {
        errorMessage: _errorMessage,
        warningMessage: _warningMEssage,
        ...input
      } = row;

      const csvInput: InsertPurchaseOrderLineInput = {
        id: FnUtils.generateUUID(),
        itemIdOrCode: input.itemCode,
        purchaseOrderId: data?.id,
        requestedPackSize: input.requestedPackSize,
        requestedNumberOfUnits: input.requestedNumberOfUnits,
        requestedDeliveryDate: Formatter.naiveDate(
          DateUtils.getNaiveDate(input.requestedDeliveryDate)
        ),
        expectedDeliveryDate: Formatter.naiveDate(
          DateUtils.getNaiveDate(input.expectedDeliveryDate)
        ),
        pricePerUnitAfterDiscount: input.pricePerUnitAfterDiscount,
        pricePerUnitBeforeDiscount: input.pricePerUnitBeforeDiscount,
        manufacturerId: input.manufacturer?.id,
        note: input.note,
        unit: input.unit,
        supplierItemCode: input.supplierItemCode,
        comment: input.comment,
      };

      await create(csvInput);
    } catch (e) {
      const errorMessage = (e as Error).message || t('messages.unknown-error');
      errorRows.push({
        ...row,
        errorMessage: t('error.import-failed', { error: errorMessage }),
      });
    }
  };

  const importSuccess = (numberImportRecords: number) => {
    const importMessage = t('messages.import-generic', {
      count: numberImportRecords,
    });

    success(importMessage)();
    onChangeTab(Tabs.Upload);
    setBufferedLines([]);
    setErrorMessage('');
    onClose();
  };

  const importFailure = (errorRows: ImportRow[]) => {
    setErrorMessage(t('messages.import-error'));
    setBufferedLines(errorRows);
    setImportErrorCount(errorRows.length);
    onChangeTab(Tabs.Review);
  };

  const importAction = async () => {
    onChangeTab(Tabs.Import);
    const numberImportRecords = bufferedLines.length;

    if (numberImportRecords === 0) return;

    const importErrorRows: ImportRow[] = [];
    const remainingRecords = [...bufferedLines];

    while (remainingRecords.length > 0) {
      const batch = remainingRecords.splice(0, 100);
      await Promise.all(batch.map(row => insertFromCSV(row, importErrorRows)));

      const percentComplete =
        100 - (remainingRecords.length / numberImportRecords) * 100;
      setImportProgress(percentComplete);
      setImportErrorCount(importErrorRows.length);
    }

    if (importErrorRows.length === 0) {
      importSuccess(numberImportRecords);
    } else {
      importFailure(importErrorRows);
    }
  };

  const onClickStep = (tabName: Tabs) => {
    if (tabName === Tabs.Import) return;
    changeTab(tabName);
  };

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
            setBufferedLines([]);
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
          onClick={handleCsvExportClick}
        />
      }
      title={t('label.import-purchase-order-lines')}
      height={1000}
      width={1600}
    >
      <>
        <ClickableStepper
          steps={importSteps}
          activeStep={activeStep}
          onClickStep={onClickStep}
        />
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <TabContext value={currentTab}>
          <Grid container flex={1} flexDirection="column" gap={1}>
            <QueryParamsProvider
              createStore={createQueryParamsStore<StoreRowFragment>({
                initialSortBy: { key: 'code' },
              })}
            >
              <UploadTab
                tab={Tabs.Upload}
                setLines={setBufferedLines}
                setErrorMessage={setErrorMessage}
                setWarningMessage={setWarningMessage}
                onUploadComplete={() => {
                  changeTab(Tabs.Review);
                }}
              />
            </QueryParamsProvider>
            <ReviewTab
              showWarnings={showWarnings}
              tab={Tabs.Review}
              uploadedRows={bufferedLines}
            />
            <ImportTab
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
