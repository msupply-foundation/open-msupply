import React, { useState } from 'react';
import {
  useTranslation,
  useDialog,
  DialogButton,
  useNotification,
  Box,
  DetailContainer,
  InsertAssetLogInput,
  FnUtils,
  DateTimePickerInput,
  InputWithLabelRow,
  Typography,
  useIsExtraSmallScreen,
  DateUtils,
  BasicTextInput,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { useAssets } from '../api';

type Draft = Partial<InsertAssetLogInput> & { files?: File[] };

const getEmptyDraft = (assetId: string): Draft => ({
  id: FnUtils.generateUUID(),
  assetId,
  type: 'Temperature Mapping',
  logDatetime: new Date().toISOString(),
});

const Row = ({
  children,
  label,
  isExtraSmallScreen,
}: {
  children: React.ReactNode;
  label: string;
  isExtraSmallScreen: boolean;
}) => {
  if (!isExtraSmallScreen)
    return (
      <Box paddingTop={1.5}>
        <InputWithLabelRow
          labelWidth="160px"
          label={label}
          labelProps={{
            sx: {
              fontSize: '16px',
              paddingRight: 2,
              textAlign: 'right',
            },
          }}
          Input={<Box flex={1}>{children}</Box>}
        />
      </Box>
    );

  return (
    <Box paddingTop={1.5}>
      <Typography sx={{ fontSize: '1em', fontWeight: 'bold' }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
};

export const RecordMappingModal = ({
  assetId,
  isOpen,
  onClose,
}: {
  assetId: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const { insertLog, invalidateQueries } = useAssets.log.insert();
  const [draft, setDraft] = useState<Draft>(getEmptyDraft(assetId));

  const debouncedSetComment = useDebounceCallback(
    (comment: string) => setDraft(prev => ({ ...prev, comment })),
    [setDraft],
    500
  );

  const { Modal } = useDialog({ onClose, isOpen });

  const onOk = async () => {
    await insertLog(draft)
      .then(() => {
        invalidateQueries();
        success(t('messages.log-saved-successfully'))();
        setDraft(getEmptyDraft(assetId));
        onClose();
      })
      .catch(e => error(`${t('error.unable-to-save-log')}: ${e.message}`)());
  };

  const today = DateUtils.endOfDay(new Date());

  return (
    <Modal
      width={600}
      sx={{ '& .MuiDialogContent-root': { paddingTop: 0 } }}
      title={t('label.temperature-mapping')}
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            setDraft(getEmptyDraft(assetId));
            onClose();
          }}
        />
      }
      okButton={<DialogButton variant="ok" onClick={onOk} />}
    >
      <DetailContainer paddingTop={1}>
        <Box
          display="flex"
          flex={1}
          flexDirection="column"
          gap={2}
          width="100%"
        >
          <Row
            label={t('label.date')}
            isExtraSmallScreen={isExtraSmallScreen}
          >
            <DateTimePickerInput
              value={
                draft.logDatetime
                  ? DateUtils.getDateOrNull(draft.logDatetime)
                  : new Date()
              }
              format="P"
              maxDate={today}
              onChange={date =>
                setDraft(prev => ({
                  ...prev,
                  logDatetime: date
                    ? date.toISOString()
                    : undefined,
                }))
              }
            />
          </Row>
          <Row
            label={t('label.observations')}
            isExtraSmallScreen={isExtraSmallScreen}
          >
            <BasicTextInput
              multiline
              rows={3}
              fullWidth
              onChange={e => debouncedSetComment(e.target.value)}
            />
          </Row>
        </Box>
      </DetailContainer>
    </Modal>
  );
};
