import {
  Grid,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';
import { FeedbackForm } from './FeedbackForm';

export const FeedbackSection = () => {
  const t = useTranslation();
  return (
    <Grid
      gap={2}
      flex={1}
      display="flex"
      flexDirection="column"
      maxWidth={800}
      paddingTop={4}
    >
      <Typography variant="h5" style={{ paddingBottom: 10 }}>
        {t('heading.contact-us')}
      </Typography>
      <FeedbackForm />
    </Grid>
  );
};
