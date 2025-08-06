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
import { useTranslation } from '@common/intl';
import { Grid, useExportCSV } from '@openmsupply-client/common/src';
import { StoreRowFragment } from '@openmsupply-client/system/src';
import React, { useState } from 'react';
import { UploadTab } from './UploadTab';
import { ReviewTab } from './ReviewTab';
import {
  PurchaseOrderLineInsertFromCsvInput,
  usePurchaseOrder,
} from '../../api/hooks/usePurchaseOrder';
import { usePurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { importPurchaseOrderLinesToCSVWithErrors } from '../utils';

interface PurchaseOrderLineImportModalProps {
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
  itemCode: string;
  requestedPackSize?: number;
  requestedNumberOfUnits?: number;
  errorMessage: string;
  warningMessage: string;
  // TODO add remaining fields as needed
};

export type LineNumber = {
  lineNumber: number;
};

export const toInsertPurchaseOrderLine = (
  row: ImportRow,
  purchaseOrderId: string
): PurchaseOrderLineInsertFromCsvInput => {
  return {
    purchaseOrderId,
    itemCode: row.itemCode,
    requestedPackSize: row.requestedPackSize,
    requestedNumberOfUnits: row.requestedNumberOfUnits,
  };
};

export const toExportLines = (
  row: ImportRow,
  index: number
): Partial<ImportRow & LineNumber> => ({
  ...row,
  lineNumber: index + 2,
});

export const PurchaseOrderLineImportModal = ({
  isOpen,
  onClose,
}: PurchaseOrderLineImportModalProps) => {
  const t = useTranslation();
  const { success } = useNotification();
  const { currentTab, onChangeTab } = useTabs(Tabs.Upload);
  const [activeStep, setActiveStep] = useState(0);
  const { Modal } = useDialog({ isOpen, onClose });
  const exportCSV = useExportCSV();

  const {
    createFromCSV: { mutateAsync, invalidateQueries },
  } = usePurchaseOrderLine();
  const {
    query: { data },
  } = usePurchaseOrder();

  const [errorMessage, setErrorMessage] = useState<string>(() => '');
  const [warningMessage, setWarningMessage] = useState<string>(() => '');

  const [importProgress, setImportProgress] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);

  const [bufferedLines, setBufferedLines] = useState<ImportRow[]>(() => []);

  const csvExport = async () => {
    const csv = importPurchaseOrderLinesToCSVWithErrors(
      bufferedLines.map((row: ImportRow, index: number) =>
        toExportLines(row, index)
      ),
      t
    );
    exportCSV(csv, t('filename.purchase-order-line-failed-uploads'));
  };

  const importErrorRows: ImportRow[] = [];
  const insertFromCSV = async (row: ImportRow) => {
    try {
      await mutateAsync(toInsertPurchaseOrderLine(row, data?.id ?? ''));
    } catch (e) {
      console.error(e);

      const errorMessage = (e as Error).message || t('messages.unknown-error');
      importErrorRows.push({
        ...row,
        errorMessage: t('error.import-failed', { error: errorMessage }),
      });
    }
  };

  const importAction = async () => {
    onChangeTab(Tabs.Import);
    const numberImportRecords = bufferedLines?.length ?? 0;
    if (bufferedLines && numberImportRecords > 0) {
      importErrorRows.length = 0;
      const remainingRecords = bufferedLines;
      while (remainingRecords.length) {
        await Promise.all(
          remainingRecords.splice(0, 100).map(insertFromCSV)
        ).then(() => {
          invalidateQueries();
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
        setBufferedLines([]);
        setErrorMessage('');
        onClose();
      } else {
        // Load the error rows in to the component for review
        setErrorMessage(t('messages.import-error'));
        setBufferedLines(importErrorRows);
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

  const importNotReady = bufferedLines.length == 0 || errorMessage.length > 0;
  const exportNotReady = !(
    bufferedLines.length >= 0 && errorMessage.length > 0
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
          onClick={csvExport}
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
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        <TabContext value={currentTab}>
          <Grid container flex={1} flexDirection="column" gap={1}>
            <QueryParamsProvider
              createStore={createQueryParamsStore<StoreRowFragment>({
                initialSortBy: { key: 'code' },
              })}
            >
              <UploadTab
                tab={Tabs.Upload}
                setEquipment={setBufferedLines}
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
