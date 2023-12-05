import React, { FC, useState } from 'react';
import {
  Box,
  useTranslation,
  AppFooterPortal,
  ButtonWithIcon,
  CheckIcon,
  XCircleIcon,
  useNavigate,
  Typography,
  DetailContainer,
  DialogButton,
  ClockIcon,
  useDialog,
  LoadingButton,
} from '@openmsupply-client/common';
import {
  DocumentHistory,
  ContactTraceRowFragment,
} from '@openmsupply-client/programs';

interface FooterProps {
  documentName?: string;
  isDisabled: boolean;
  onCancel: () => void;
  onSave: () => void;
  contactTrace?: ContactTraceRowFragment;
}

export const Footer: FC<FooterProps> = ({
  documentName,
  isDisabled,
  onCancel,
  onSave,
}) => {
  const t = useTranslation('common');
  const navigate = useNavigate();
  const { Modal, showDialog, hideDialog } = useDialog();
  const [isSaving, setIsSaving] = useState(false);

  return (
    <AppFooterPortal
      Content={
        <Box
          gap={2}
          display="flex"
          flexDirection="row"
          alignItems="center"
          height={64}
        >
          <ButtonWithIcon
            Icon={<ClockIcon />}
            color="secondary"
            label={'History'}
            disabled={documentName === undefined}
            onClick={showDialog}
          />
          <Box
            flex={1}
            display="flex"
            justifyContent="flex-end"
            gap={2}
            marginLeft="auto"
          >
            <ButtonWithIcon
              variant="outlined"
              color="secondary"
              Icon={<XCircleIcon />}
              onClick={() => {
                onCancel();
                navigate(-1);
              }}
              label={t('button.cancel')}
            />
            <LoadingButton
              variant="outlined"
              color="secondary"
              startIcon={<CheckIcon />}
              onClick={async () => {
                setIsSaving(true);
                try {
                  await onSave();
                } catch (error) {
                  // to do add error handling
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isDisabled}
              isLoading={isSaving}
            >
              {t('button.save')}
            </LoadingButton>
          </Box>

          <Modal
            title=""
            sx={{ maxWidth: '90%', minHeight: '95%' }}
            okButton={<DialogButton variant="ok" onClick={hideDialog} />}
            slideAnimation={false}
          >
            <DetailContainer>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                gap={2}
              >
                <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                  Document Edit History
                </Typography>
                {documentName ? (
                  <DocumentHistory documentName={documentName} />
                ) : null}
              </Box>
            </DetailContainer>
          </Modal>
        </Box>
      }
    />
  );
};
