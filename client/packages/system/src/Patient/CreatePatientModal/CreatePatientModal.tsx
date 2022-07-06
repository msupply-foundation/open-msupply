import React, { FC, useEffect, useState } from 'react';
import {
  DetailContainer,
  DetailSection,
  Typography,
  Box,
  BufferedTextInput,
  InputWithLabelRow,
  FnUtils,
  useTranslation,
  DocumentRegistryNodeContext,
} from '@openmsupply-client/common';
import { CreateNewPatient, useCreatePatientStore } from '../hooks';
import { useDocumentRegistryByContext } from 'packages/common/src/ui/forms/JsonForms/api/hooks/document/useDocumentRegistryByContext';
import { DocumentRegistryFragment } from 'packages/common/src/ui/forms/JsonForms/api/operations.generated';

function newPatient(
  documentRegistry: DocumentRegistryFragment
): CreateNewPatient {
  return {
    id: FnUtils.generateUUID(),
    documentRegistry,
  };
}
export const CreatePatientView: FC = () => {
  const { data: documentRegistryResponse } = useDocumentRegistryByContext(
    DocumentRegistryNodeContext.Patient
  );
  const [documentRegistry, setDocumentRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();

  useEffect(() => {
    if (documentRegistryResponse?.[0]) {
      setDocumentRegistry(documentRegistryResponse?.[0]);
    }
  }, [documentRegistryResponse]);

  const { patient, setNewPatient } = useCreatePatientStore();
  useEffect(() => {
    // clear old patient
    setNewPatient(undefined);
  }, []);
  const t = useTranslation('common');

  if (documentRegistry === undefined) {
    return null;
  }
  return (
    <DetailContainer>
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          Create New Patient
        </Typography>
        <DetailSection title="">
          <InputWithLabelRow
            label={t('label.first-name')}
            Input={
              <BufferedTextInput
                size="small"
                sx={{ width: 250 }}
                value={patient?.firstName ?? ''}
                onChange={event => {
                  setNewPatient({
                    ...(patient ?? newPatient(documentRegistry)),
                    firstName: event.target.value,
                  });
                }}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.last-name')}
            Input={
              <BufferedTextInput
                size="small"
                sx={{ width: 250 }}
                value={patient?.lastName ?? ''}
                onChange={event => {
                  setNewPatient({
                    ...(patient ?? newPatient(documentRegistry)),
                    lastName: event.target.value,
                  });
                }}
              />
            }
          />
        </DetailSection>
      </Box>
    </DetailContainer>
  );
};
