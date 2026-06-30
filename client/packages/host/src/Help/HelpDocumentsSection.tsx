import React from 'react';
import { Box, Typography } from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { HelpDocumentLink, useHelpDocuments } from '@openmsupply-client/system';

export const HelpDocumentsSection = () => {
  const t = useTranslation();
  const {
    query: { data },
  } = useHelpDocuments();

  // Hide the whole section until the central server has uploaded something —
  // most sites won't have any docs and an empty heading would be noise.
  if (!data || data.nodes.length === 0) return null;

  return (
    <>
      <Typography variant="h5" paddingTop={4} paddingBottom={1}>
        {t('heading.help-documents')}
      </Typography>
      <Box display="flex" flexDirection="column" gap={1}>
        {data.nodes.map(doc => {
          // One file per row by design — but the schema allows multiple, so we
          // pick the first and skip rows whose file hasn't arrived on this site yet.
          const file = doc.files.nodes[0];
          if (!file) return null;
          return (
            <HelpDocumentLink key={doc.id} docId={doc.id} file={file}>
              {doc.title}
            </HelpDocumentLink>
          );
        })}
      </Box>
    </>
  );
};
