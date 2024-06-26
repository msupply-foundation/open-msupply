import React, { FC, useState } from 'react';
import { useDialog, useNotification } from '@common/hooks';
import {
  DialogButton,
  TabContext,
  useTabs,
  Box,
  Grid,
  Alert,
  ClickableStepper,
  UpdateNamePropertiesInput,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { UploadTab } from './UploadTab';
import { ReviewTab } from './ReviewTab';
import { useNameProperties } from '../../api/hooks/document/useNameProperties';
import { ImportTab } from './ImportTab';
import { useName } from '../../api';

interface PropertiesImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type ImportRow = {
  code: string;
  name: string;
  properties: Record<string, string>;
  id: string;
  errorMessage?: string;
};

enum Tabs {
  Upload = 'Upload',
  Review = 'Review',
  Import = 'Import',
}

export type LineNumber = {
  lineNumber: number;
};

const toUpdateNamePropertiesInput = (
  row: ImportRow
): UpdateNamePropertiesInput => {
  return { id: row.id, properties: JSON.stringify(row.properties) };
};

export const PropertiesImportModal: FC<PropertiesImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslation();
  const { success } = useNotification();
  const { currentTab, onChangeTab } = useTabs(Tabs.Upload);
  const [activeStep, setActiveStep] = useState(0);
  const { Modal } = useDialog({ isOpen, onClose });

  const [errorMessage, setErrorMessage] = useState<string>(() => '');
  const [importProgress, setImportProgress] = useState(0);
  const [importErrorCount, setImportErrorCount] = useState(0);

  const { data: properties } = useNameProperties();
  const { mutateAsync } = useName.document.updateProperties('');

  const [bufferedFacilityProperties, setBufferedFacilityProperties] = useState<
    ImportRow[]
  >(() => []);

  const handleClose = () => {
    setActiveStep(0);
    onClose();
  };

  const importAction = async () => {
    onChangeTab(Tabs.Import);
    const numberImportRecords = bufferedFacilityProperties?.length ?? 0;
    if (bufferedFacilityProperties && numberImportRecords > 0) {
      const importErrorRows: ImportRow[] = [];
      // Import count can be quite large, we break this into blocks of 10 to avoid too much concurrency
      const remainingRecords = bufferedFacilityProperties;
      while (remainingRecords.length) {
        await Promise.all(
          remainingRecords.splice(0, 10).map(async facility => {
            await mutateAsync(toUpdateNamePropertiesInput(facility))
              .then(async result => {
                // Map structured Errors
                if (result?.__typename === 'Mutations') {
                  // const errorMessage = mapStructuredErrors(result);
                  const errorMessage = result;
                  importErrorRows.push({
                    ...facility,
                    errorMessage: errorMessage.__typename,
                  });
                  return;
                }
              })
              .catch((err: { message: string }) => {
                if (!err) {
                  err = { message: t('messages.unknown-error') };
                }
                importErrorRows.push({
                  ...facility,
                  errorMessage: err.message,
                });
              });
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
        setBufferedFacilityProperties([]);
        setErrorMessage('');
        handleClose();
      } else {
        // Load the error rows in to the component for review
        setErrorMessage(t('messages.import-generic'));
        setBufferedFacilityProperties(importErrorRows);
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
        <DialogButton variant="next" disabled={false} onClick={importAction} />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={async () => {
            setErrorMessage('');
            changeTab(Tabs.Upload);
            handleClose();
          }}
        />
      }
      nextButton={
        <DialogButton variant="export" disabled={false} onClick={() => {}} />
      }
      title={t('label.import-facility-properties')}
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
            <UploadTab
              tab={Tabs.Upload}
              setErrorMessage={setErrorMessage}
              setFacilityProperties={setBufferedFacilityProperties}
              onUploadComplete={() => {
                changeTab(Tabs.Review);
              }}
              properties={properties}
            />
            <ReviewTab
              tab={Tabs.Review}
              uploadedRows={bufferedFacilityProperties}
              properties={properties}
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
