import React, { FC, useState } from 'react';
import { useDialog } from '@common/hooks';
import {
  DialogButton,
  TabContext,
  useTabs,
  Box,
  Grid,
  Alert,
  ClickableStepper,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { UploadTab } from './UploadTab';
import { ReviewTab } from './ReviewTab';
import { useNameProperties } from '../../api/hooks/document/useNameProperties';
import { FacilityNameRowFragment } from '../../api/operations.generated';
import { ImportTab } from './ImportTab';

interface PropertiesImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: FacilityNameRowFragment[] | undefined;
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

export const PropertiesImportModal: FC<PropertiesImportModalProps> = ({
  isOpen,
  onClose,
  facilities,
}) => {
  const t = useTranslation('coldchain');
  const { currentTab, onChangeTab } = useTabs(Tabs.Upload);
  const [activeStep, setActiveStep] = useState(0);
  const { Modal } = useDialog({ isOpen, onClose });

  const [errorMessage, setErrorMessage] = useState<string>(() => '');
  const [importProgress] = useState(0);
  const [importErrorCount] = useState(0);

  const [warningMessage] = useState<string>(() => '');
  const { data: properties } = useNameProperties();

  const [bufferedFacilityProperties, setBufferedFacilityProperties] = useState<
    ImportRow[]
  >(() => []);

  const importAction = async () => {
    onChangeTab(Tabs.Import);
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

  const showWarnings = errorMessage.length == 0 && warningMessage.length > 0;

  console.info('showWarnings', showWarnings);

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
            onClose();
          }}
        />
      }
      nextButton={
        <DialogButton variant="export" disabled={false} onClick={() => {}} />
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
            <UploadTab
              tab={Tabs.Upload}
              setErrorMessage={setErrorMessage}
              facilities={facilities}
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
