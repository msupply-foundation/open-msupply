import React, { FC, ReactNode, useCallback } from 'react';
import {
  Box,
  CheckIcon,
  EditIcon,
  Grid,
  UserIcon,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import {
  AppBarContentPortal,
  BasicTextInput,
  ButtonWithIcon,
  InputWithLabelRow,
} from '@common/components';
import { ContactTrace, ContactTraceData } from './useContactTraceData';
import { useLinkPatientModal } from './LinkPatientModal';
import { PatientRowFragment, usePatient } from '../../Patient';

const Row = ({ label, Input }: { label: string; Input: ReactNode }) => (
  <InputWithLabelRow labelWidth="90px" label={label} Input={Input} />
);

const useContactName = (
  documentData: ContactTrace,
  linkedPatient: PatientRowFragment | undefined
): string => {
  const { getLocalisedFullName } = useIntlUtils();
  if (!!linkedPatient) {
    return linkedPatient.name ?? linkedPatient.id;
  }
  if (documentData?.contact?.id && !linkedPatient) {
    return ''; // still loading
  }
  if (documentData?.contact?.firstName || documentData?.contact?.lastName) {
    return getLocalisedFullName(
      documentData?.contact?.firstName,
      documentData?.contact?.lastName
    );
  }
  return documentData?.contact?.name ?? documentData?.contact?.id ?? '';
};

interface ToolbarProps {
  /** Makes a change to the contact trace */
  onChange: (patch: Partial<ContactTrace>) => void;
  data: ContactTraceData;
  documentData: ContactTrace;
}

export const Toolbar: FC<ToolbarProps> = ({ onChange, data, documentData }) => {
  const t = useTranslation('dispensary');

  const patientLinked = useCallback(
    (patientId: string) => {
      onChange({ contact: { ...documentData.contact, id: patientId } });
    },
    [onChange, documentData.contact]
  );

  // mSupply patient linked to the contact
  const { data: contactPatient } = usePatient.document.get(
    documentData?.contact?.id
  );
  const contactName = useContactName(documentData, contactPatient);

  const { LinkPatientModal, showDialog } = useLinkPatientModal(patientLinked);
  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="center"
      >
        <Grid
          item
          sx={{
            alignItems: 'center',
            backgroundColor: 'background.menu',
            borderRadius: '50%',
            display: 'flex',
            height: '100px',
            justifyContent: 'center',
            marginRight: 2,
            width: '100px',
          }}
        >
          <Box>
            <UserIcon fontSize="large" style={{ flex: 1 }} />
          </Box>
        </Grid>
        <Grid item display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={0.5}>
            <Box display="flex">
              <Row
                label={t('label.contact')}
                Input={<BasicTextInput disabled value={contactName} />}
              />
              <ButtonWithIcon
                variant="outlined"
                color="secondary"
                Icon={
                  !!documentData?.contact?.id ? <CheckIcon /> : <EditIcon />
                }
                label={t('button.link-contact-to-patient')}
                onClick={showDialog}
              />
              <LinkPatientModal documentData={documentData} />
            </Box>
            <Box display="flex" gap={1.5}>
              <Row
                label={t('label.program')}
                Input={
                  <BasicTextInput disabled value={data.programName ?? ''} />
                }
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
