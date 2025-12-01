import React, { FC } from 'react';
import { PropsWithChildrenOnly } from '@common/types';
import { Grid } from '@openmsupply-client/common';

export const DetailContainer: FC<
  PropsWithChildrenOnly & {
    paddingTop?: number;
    paddingLeft?: number;
    paddingRight?: number;
  }
> = ({ children, paddingTop, paddingLeft, paddingRight }) => (
  <Grid
    container
    height="100%"
    width="100%"
    gap={4}
    padding={4}
    paddingTop={paddingTop}
    paddingLeft={paddingLeft}
    paddingRight={paddingRight}
    justifyContent="center"
  >
    {children}
  </Grid>
);
