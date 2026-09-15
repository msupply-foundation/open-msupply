import React, { useState } from 'react';
import {
  Box,
  FileUtils,
  InlineSpinner,
  Link,
  MuiLink,
  useNotification,
} from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';
import { Environment } from '@openmsupply-client/config';

interface HelpDocumentLinkProps {
  docId: string;
  file: { id: string; fileName: string };
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

// On Android the file URL opens in the system browser, which isn't logged in
// and can't validate the local SSL cert — so the document never loads. Mirror
// the CCE FileList pattern: download via the native client and hand off to the
// OS file viewer. On web, a normal link to the inline-view URL still works.
export const HelpDocumentLink = ({
  docId,
  file,
  children,
  onClick,
}: HelpDocumentLinkProps) => {
  const { error } = useNotification();
  const [loading, setLoading] = useState(false);

  if (Capacitor.getPlatform() === 'android') {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <MuiLink
          component="button"
          onClick={async (e: React.MouseEvent) => {
            onClick?.(e);
            setLoading(true);
            try {
              await FileUtils.openAndroidFile({
                id: file.id,
                name: file.fileName,
                tableName: 'help_document',
                assetId: docId,
              });
            } catch (err) {
              error(`Error: ${(err as Error).message}`)();
            }
            setLoading(false);
          }}
        >
          {children}
        </MuiLink>
        {loading && <InlineSpinner />}
      </Box>
    );
  }

  const url = `${Environment.SYNC_FILES_URL}/help_document/${docId}/${file.id}`;
  return (
    <Link to={url} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {children}
    </Link>
  );
};
