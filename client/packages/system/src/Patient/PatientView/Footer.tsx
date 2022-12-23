import React, { FC } from 'react';
import {
  Box,
  useTranslation,
  AppFooterPortal,
  ButtonWithIcon,
  Typography,
  DetailContainer,
  DialogButton,
  ClockIcon,
  useDialog,
  LoadingButton,
} from '@openmsupply-client/common';
import { CreateDocument, DocumentHistory } from '@openmsupply-client/programs';

interface FooterProps {
  documentName?: string;
  isSaving: boolean;
  isDirty?: boolean;
  validationError?: string | boolean;
  createDoc?: CreateDocument;
  showSaveConfirmation: () => void;
  showCancelConfirmation: () => void;
}

export const Footer: FC<FooterProps> = ({
  documentName,
  isSaving,
  isDirty,
  validationError,
  createDoc,
  showSaveConfirmation,
  showCancelConfirmation,
}) => {
  const t = useTranslation('common');
  const { Modal, showDialog, hideDialog } = useDialog();

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
            <DialogButton
              variant="cancel"
              disabled={!isDirty || isSaving}
              onClick={() => {
                showCancelConfirmation();
              }}
            />
            <LoadingButton
              color="secondary"
              disabled={!isDirty || !!validationError}
              isLoading={isSaving}
              onClick={() => showSaveConfirmation()}
            >
              {createDoc ? t('button.create') : t('button.save')}
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
