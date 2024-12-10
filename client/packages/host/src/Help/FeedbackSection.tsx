import {
  DetailContainer,
  Grid,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';
import { FeedbackForm } from './FeedbackForm';

export const FeedbackSection = () => {
  const t = useTranslation();
  return (
    <DetailContainer>
      <Grid
        display="flex"
        flex={1}
        flexDirection="column"
        container
        paddingTop={2}
        paddingBottom={1}
        width="100%"
        flexWrap="nowrap"
        maxWidth={800}
        gap={2}
      >
        <Typography variant="h5" style={{ paddingBottom: 10 }}>
          {t('heading.contact-us')}
        </Typography>
        <FeedbackForm />
      </Grid>
    </DetailContainer>
  );
};
