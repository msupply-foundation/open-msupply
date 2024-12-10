import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  EditIcon,
  Grid,
  LinkIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { useLinkPatientModal } from './LinkPatientModal';
import { ContactTrace } from './useContactTraceData';

interface AppBarButtonsProp {
  documentData: ContactTrace;
  onLinkContact: (patientId: string | undefined) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonsProp> = ({
  onLinkContact,
  documentData,
}) => {
  const t = useTranslation();

  const { LinkPatientModal, showDialog } = useLinkPatientModal(
    documentData,
    onLinkContact
  );
  const linked = !!documentData.contact?.id;
  return (
    <AppBarButtonsPortal>
      <LinkPatientModal />
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={linked ? <EditIcon /> : <LinkIcon />}
          label={
            linked
              ? t('button.edit-linked-patient')
              : t('button.link-contact-to-patient')
          }
          onClick={showDialog}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
