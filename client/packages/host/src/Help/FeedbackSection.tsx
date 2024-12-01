import { DetailContainer, Grid } from '@openmsupply-client/common';
import React from 'react';
import { FeedbackForm } from './FeedbackForm';

export const FeedbackSection = () => {
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
        <FeedbackForm />
      </Grid>
    </DetailContainer>
  );
};
