import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  ClockIcon,
  DialogButton,
  useDialog,
  useUrlQuery,
  DetailContainer,
  Box,
  Typography,
  EditIcon,
} from '@openmsupply-client/common';
import { DocumentHistory } from '../DocumentHistory';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from 'packages/config/src';

export const AppBarButtons: FC = ({}) => {
  const {
    urlQuery: { doc },
  } = useUrlQuery();
  const { Modal, showDialog, hideDialog } = useDialog();
  const navigate = useNavigate();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<EditIcon />}
          label={'Programs'}
          onClick={() => {
            navigate(AppRoute.Programs);
          }}
        />

        <ButtonWithIcon
          Icon={<ClockIcon />}
          label={'History'}
          disabled={doc === undefined}
          onClick={showDialog}
        />
      </Grid>
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
            <DocumentHistory documentName={doc} />
          </Box>
        </DetailContainer>
      </Modal>
    </AppBarButtonsPortal>
  );
};
