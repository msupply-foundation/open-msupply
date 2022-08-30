import React, { FC } from 'react';
import {
  Box,
  useTranslation,
  AppFooterPortal,
  ButtonWithIcon,
  CheckIcon,
  XCircleIcon,
  useNavigate,
  RouteBuilder,
  Typography,
  DetailContainer,
  DialogButton,
  ClockIcon,
  useDialog,
} from '@openmsupply-client/common';
import { AppRoute } from 'packages/config/src';
import { DocumentHistory } from '../../Patient/DocumentHistory';

interface FooterProps {
  documentName?: string;
  isDisabled: boolean;
  onCancel: () => void;
  onSave: () => void;
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
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Encounter)
                    .build()
                );
              }}
              label={t('button.cancel')}
            />
            <ButtonWithIcon
              variant="outlined"
              color="secondary"
              Icon={<CheckIcon />}
              onClick={onSave}
              label={t('button.save')}
              disabled={isDisabled}
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
