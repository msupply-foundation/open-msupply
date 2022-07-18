import React, { FC } from 'react';
import {
  PlusCircleIcon,
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
} from '@openmsupply-client/common';
import { DocumentHistory } from '../DocumentHistory';

export const AppBarButtons: FC = ({}) => {
  const {
    urlQuery: { doc },
  } = useUrlQuery();
  const { Modal, showDialog, hideDialog } = useDialog();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={'Add Program'}
          onClick={() => {}}
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
