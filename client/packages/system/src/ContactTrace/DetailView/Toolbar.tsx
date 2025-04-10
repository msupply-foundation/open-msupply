import React, { FC, ReactNode } from 'react';
import {
  Box,
  Grid,
  UserIcon,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import {
  AppBarContentPortal,
  BasicTextInput,
  InfoTooltipIcon,
  InputWithLabelRow,
} from '@common/components';
import { ContactTrace, ContactTraceData } from './useContactTraceData';
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
    if (linkedPatient.name) {
      return getLocalisedFullName(
        linkedPatient.firstName,
        linkedPatient.lastName
      );
    }
    return linkedPatient.id;
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

const recordedDiffersFromLinkedPatient = (
  documentData: ContactTrace,
  linkedPatient: PatientRowFragment | undefined
) => {
  if (!linkedPatient) {
    return false;
  }
  if (
    !!documentData.contact?.firstName &&
    !!linkedPatient.firstName &&
    documentData.contact?.firstName !== linkedPatient.firstName
  ) {
    return true;
  }
  if (
    !!documentData.contact?.lastName &&
    !!linkedPatient.lastName &&
    documentData.contact?.lastName !== linkedPatient.lastName
  ) {
    return true;
  }

  return false;
};

interface ToolbarProps {
  data: ContactTraceData;
  documentData: ContactTrace;
}

export const Toolbar: FC<ToolbarProps> = ({ data, documentData }) => {
  const t = useTranslation();

  // mSupply patient linked to the contact
  const { data: contactPatient } = usePatient.document.get(
    documentData?.contact?.id
  );

  const contactName = useContactName(documentData, contactPatient);
  const { getLocalisedFullName } = useIntlUtils();
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
        <Grid display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={0.5}>
            <Box display="flex">
              <Row
                label={t('label.contact')}
                Input={<BasicTextInput disabled value={contactName} />}
              />
              {recordedDiffersFromLinkedPatient(
                documentData,
                contactPatient
              ) ? (
                <Box
                  display="flex"
                  sx={{ color: 'error.main' }}
                  gap={1}
                  justifyContent="center"
                >
                  <InfoTooltipIcon
                    iconSx={{ color: 'gray.main' }}
                    title={t('label.recorded-contact-differs', {
                      recordedName: getLocalisedFullName(
                        documentData?.contact?.firstName,
                        documentData.contact?.lastName
                      ),
                    })}
                  />
                </Box>
              ) : null}
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
