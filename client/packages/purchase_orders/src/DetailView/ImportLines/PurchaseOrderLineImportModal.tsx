import {
  useTabs,
  DialogButton,
  ClickableStepper,
  Alert,
  TabContext,
} from '@common/components';
import {
  useNotification,
  useDialog,
  QueryParamsProvider,
  createQueryParamsStore,
} from '@common/hooks';
import { useTranslation } from '@common/intl';
import { Grid } from '@openmsupply-client/common/src';
import { StoreRowFragment } from '@openmsupply-client/system/src';
import React, { useState } from 'react';
import { UploadTab } from './UploadTab';
import { ReviewTab } from './ReviewTab';
import { ImportTab } from './ImportTab';
import {
  PurchaseOrderBatchLineInput,
  usePurchaseOrder,
} from '../../api/hooks/usePurchaseOrder';

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
  purchaseOrderId: string;
  itemId: string;
  errorMessage: string;
  warningMessage: string;
  // TODO add remaining fields as needed
};

export type LineNumber = {
  lineNumber: number;
};

export const toInsertPurchaseOrderLine = (
  row: ImportRow
): PurchaseOrderBatchLineInput => {
  return {
    id: row.id,
    purchaseOrderId: row.purchaseOrderId,
    itemId: row.itemId,
    // TODO map remaining fields as needed
  };
};

export const PurchaseOrderLineImportModal = ({
  isOpen,
  onClose,
}: PurchaseOrderLineImportModalProps) => {
  const t = useTranslation();
  const { success } = useNotification();
  const { currentTab, onChangeTab } = useTabs(Tabs.Upload);
  const [activeStep, setActiveStep] = useState(0);
  const { Modal } = useDialog({ isOpen, onClose });
  const {
    batch: { saveBatch },
  } = usePurchaseOrder();

  const [errorMessage, setErrorMessage] = useState<string>(() => '');
  const [warningMessage, setWarningMessage] = useState<string>(() => '');

  const [importProgress, setImportProgress] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);

  // const exportCSV = useExportCSV();

  const [bufferedLines, setBufferedLines] = useState<ImportRow[]>(() => []);

  const csvExport = async () => {
    // const csv = importEquipmentToCsvWithErrors(
    //   bufferedLines.map((row: ImportRow, index: number) =>
    //     toExportEquipment(row, index)
    //   ),
    //   t,
    //   isCentralServer,
    //   properties?.map(p => p.key) ?? []
    // );
    // exportCSV(csv, t('filename.cce-failed-uploads'));
    console.log('CSV export not implemented yet');
  };

  const importErrorRows: ImportRow[] = [];

  const importAction = async () => {
    onChangeTab(Tabs.Import);
    const numberImportRecords = bufferedLines?.length ?? 0;
    if (bufferedLines && numberImportRecords > 0) {
      importErrorRows.length = 0;
      // Import count can be quite large, we break this into blocks of 100 to avoid too much concurrency
      const remainingRecords = bufferedLines;
      while (remainingRecords.length) {
        // TODO do these need to be in 100 line chunks?
        const linesChunk = remainingRecords.splice(0, 100);
        await saveBatch(linesChunk.map(toInsertPurchaseOrderLine)).then(() => {
          // TODO invalidateQueries();
          // invalidateQueries();
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

  // TODO || isLoading
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
