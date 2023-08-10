import React, { FC } from 'react';
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
  StatusCrumbs,
  ContactTraceNodeStatus,
  LocaleKey,
  TypedTFunction,
  noOtherVariants,
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

export const traceStatusTranslation = (
  status: ContactTraceNodeStatus,
  t: TypedTFunction<LocaleKey>
): string => {
  switch (status) {
    case ContactTraceNodeStatus.Pending:
      return t('label.trace-status-pending');
    case ContactTraceNodeStatus.Done:
      return t('label.trace-status-done');
    default:
      return noOtherVariants(status);
  }
};

const ContactTraceStatusCrumbs: FC<{ trace: ContactTraceRowFragment }> = ({
  trace,
}) => {
  const t = useTranslation('common');
  // TODO StatusCrumbs shows "Order History" in the logs pop up -> make this configurable
  return (
    <StatusCrumbs
      statuses={[ContactTraceNodeStatus.Pending, ContactTraceNodeStatus.Done]}
      statusLog={{
        [ContactTraceNodeStatus.Pending]:
          trace.status === ContactTraceNodeStatus.Pending ? trace.datetime : '',
        [ContactTraceNodeStatus.Done]:
          trace.status === ContactTraceNodeStatus.Done ? trace.datetime : '',
      }}
      statusFormatter={(status: ContactTraceNodeStatus) =>
        traceStatusTranslation(status, t)
      }
    />
  );
};

export const Footer: FC<FooterProps> = ({
  documentName,
  isDisabled,
  onCancel,
  onSave,
  contactTrace,
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
          {contactTrace ? (
            <ContactTraceStatusCrumbs trace={contactTrace} />
          ) : null}
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
