import React, { FC } from 'react';
import {
  // useTranslation,
  // useBreadcrumbs,
  DetailContainer,
  // Checkbox,
  // useFormatDateTime,
  Box,
  BasicSpinner,
  // MuiLink,
} from '@openmsupply-client/common';
// import { usePatient } from '../api';5
import { useJsonForms } from '@openmsupply-client/common';

interface DetailModalProps {
  docId: string | undefined;
}

export const DetailModal: FC<DetailModalProps> = ({ docId }) => {
  const { JsonForm, loading, error } = useJsonForms(docId);

  if (loading) return <BasicSpinner />;

  return error ? null : (
    <DetailContainer>
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        {!error ? JsonForm : error}
      </Box>
    </DetailContainer>
  );
};
