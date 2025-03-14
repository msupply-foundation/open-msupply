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
  useNavigate,
  useAuthContext,
  UserPermission,
  SaveIcon,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { FormInputData, DocumentHistory } from '@openmsupply-client/programs';

interface FooterProps {
  documentName?: string;
  isSaving: boolean;
  isDirty?: boolean;
  validationError?: string | boolean;
  inputData?: FormInputData;
  showSaveConfirmation: () => void;
}

export const Footer: FC<FooterProps> = ({
  documentName,
  isSaving,
  isDirty,
  validationError,
  inputData,
  showSaveConfirmation,
}) => {
  const t = useTranslation();
  const { Modal, showDialog, hideDialog } = useDialog();
  const navigate = useNavigate();
  const { userHasPermission } = useAuthContext();

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
              disabled={isSaving}
              onClick={() => {
                navigate(-1);
              }}
            />
            <LoadingButton
              color="secondary"
              disabled={
                !isDirty ||
                !!validationError ||
                !userHasPermission(UserPermission.PatientMutate)
              }
              isLoading={isSaving}
              onClick={showSaveConfirmation}
              label={
                inputData?.isCreating ? t('button.create') : t('button.save')
              }
              startIcon={
                inputData?.isCreating ? <PlusCircleIcon /> : <SaveIcon />
              }
            />
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
                  {t('label.document-edit-history')}
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
