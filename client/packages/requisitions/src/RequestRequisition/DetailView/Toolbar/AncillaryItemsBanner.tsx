import React from 'react';
import {
  Alert,
  AncillaryStateNode,
  FlatButton,
  useTranslation,
  Box,
} from '@openmsupply-client/common';
import { useRequest } from '../../api';

/**
 * Toolbar banner that surfaces missing or stale ancillary item lines on a
 * request requisition. `NeedsAdd` takes priority; once added, any remaining
 * stale quantities surface as `NeedsUpdate`.
 */
export const AncillaryItemsBanner = () => {
  const t = useTranslation();
  const { data } = useRequest.document.get();
  const { add, update, isLoading } = useRequest.line.refreshAncillaryItems();

  const ancillaryState = data?.ancillaryState;
  if (!ancillaryState || ancillaryState.state === AncillaryStateNode.None) {
    return null;
  }

  const isAdd = ancillaryState.state === AncillaryStateNode.NeedsAdd;
  const message = isAdd
    ? t('messages.ancillary-items-available', { count: ancillaryState.count })
    : t('messages.ancillary-items-need-update', {
        count: ancillaryState.count,
      });

  return (
    <Alert
      severity="info"
      sx={{ maxWidth: 1000, alignItems: 'center' }}
      action={
        <Box>
          <FlatButton
            label={isAdd ? t('button.add') : t('button.update')}
            onClick={() => (isAdd ? add() : update())}
            disabled={isLoading}
            color="primary"
          />
        </Box>
      }
    >
      {message}
    </Alert>
  );
};
