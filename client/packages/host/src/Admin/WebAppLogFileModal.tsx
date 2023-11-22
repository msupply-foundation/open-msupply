import React from 'react';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { BasicSpinner, DialogButton, Typography } from '@common/components';
import { useLog } from '@openmsupply-client/system';
import { Box } from 'packages/common/src';
export const WebAppLogFileModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslation('common');

  const { Modal } = useDialog({ isOpen });

  const { data, isError, isLoading } = useLog.document.listFileNames();
  console.log('data', data?.fileNames);
  if (isError) {
    return (
      <Modal
        title={t('heading.server-log')}
        okButton={<DialogButton variant="ok" onClick={onClose} />}
      >
        <Box sx={{ padding: 2 }}>
          <Typography sx={{ color: 'error.main' }}>
            {t('error.unable-to-load-data')}
          </Typography>
        </Box>
      </Modal>
    );
  }
  return (
    <Modal
      title={t('heading.server-log')}
      okButton={<DialogButton variant="ok" onClick={onClose} />}
    >
      {!isLoading && data ? (
        <div>
          {data.fileNames?.map((fileName, i) => (
            <Typography
              sx={{ overflow: 'wrap', whiteSpace: 'pre' }}
              component="div"
              key={i}
            >{`${fileName}`}</Typography>
          ))}
        </div>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
