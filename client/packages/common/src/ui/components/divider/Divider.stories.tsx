import React from 'react';
import { Grid } from '@openmsupply-client/common';
import { StoryFn, Meta } from '@storybook/react';
import { Divider } from './Divider';

const Template: StoryFn<typeof Divider> = ({ margin = 0 }) => (
  <Grid container>
    <Grid
      size={{ xs: 2 }}
      sx={{ backgroundColor: 'aliceblue', textAlign: 'center' }}
    >
      Top left
    </Grid>
    <Grid size={{ xs: 8 }} sx={{ textAlign: 'center' }}>
      Top Middle
    </Grid>
    <Grid
      size={{ xs: 2 }}
      sx={{ backgroundColor: 'aliceblue', textAlign: 'center' }}
    >
      Top right
    </Grid>
    <Grid size={{ xs: 2 }} />
    <Grid size={{ xs: 2 }} sx={{ height: `${2 * margin}px` }}>
      <Divider margin={margin} />
    </Grid>
    <Grid size={{ xs: 2 }} />
    <Grid
      size={{ xs: 2 }}
      sx={{ backgroundColor: 'aliceblue', textAlign: 'center' }}
    >
      Bottom left
    </Grid>
    <Grid size={{ xs: 8 }} sx={{ textAlign: 'center' }}>
      Bottom Middle
    </Grid>
    <Grid
      size={{ xs: 2 }}
      sx={{ backgroundColor: 'aliceblue', textAlign: 'center' }}
    >
      Bottom right
    </Grid>
  </Grid>
);

export const Default = Template.bind({});
export const Margin10 = Template.bind({});
export const Margin40 = Template.bind({});

Margin10.args = { margin: 10 };
Margin40.args = { margin: 40 };

export default {
  title: 'Components/Divider',
  component: Divider,
} as Meta<typeof Divider>;
