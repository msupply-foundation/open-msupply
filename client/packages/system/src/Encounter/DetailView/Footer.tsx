import React, { FC } from 'react';
import {
  Box,
  useTranslation,
  AppFooterPortal,
  ButtonWithIcon,
  SaveIcon,
  XCircleIcon,
  useNavigate,
  Typography,
  DetailContainer,
  DialogButton,
  ClockIcon,
  useDialog,
  StatusCrumbs,
  EncounterNodeStatus,
  LoadingButton,
} from '@openmsupply-client/common';
import {
  DocumentHistory,
  EncounterFragment,
} from '@openmsupply-client/programs';
import { encounterStatusTranslation } from '../utils';

interface FooterProps {
  documentName?: string;
  isDisabled: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  encounter?: EncounterFragment;
}

const EncounterStatusCrumbs: FC<{ encounter: EncounterFragment }> = ({
  encounter,
}) => {
  const t = useTranslation();
  // TODO StatusCrumbs shows "Order History" in the logs pop up -> make this configurable
  return (
    <StatusCrumbs
      statuses={
        encounter.status === EncounterNodeStatus.Cancelled
          ? [EncounterNodeStatus.Pending, EncounterNodeStatus.Cancelled]
          : [EncounterNodeStatus.Pending, EncounterNodeStatus.Visited]
      }
      statusLog={{
        [EncounterNodeStatus.Pending]: encounter.createdDatetime,
        [EncounterNodeStatus.Visited]:
          encounter.status === EncounterNodeStatus.Visited
            ? encounter.startDatetime
            : '',
        [EncounterNodeStatus.Cancelled]:
          encounter.status === EncounterNodeStatus.Cancelled
            ? encounter.startDatetime
            : '',
      }}
      statusFormatter={(status: EncounterNodeStatus) =>
        encounterStatusTranslation(status, t)
      }
    />
  );
};

export const Footer: FC<FooterProps> = ({
  documentName,
  isDisabled,
  isSaving,
  onCancel,
  onSave,
  encounter,
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
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
          {encounter ? <EncounterStatusCrumbs encounter={encounter} /> : null}
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
              color="secondary"
              loadingStyle={{ iconColor: 'secondary.main' }}
              variant="outlined"
              disabled={isDisabled || isSaving}
              isLoading={isSaving}
              onClick={onSave}
              startIcon={<SaveIcon />}
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
