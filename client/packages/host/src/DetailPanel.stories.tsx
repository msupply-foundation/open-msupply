import React, { useEffect } from 'react';
import { Story, ComponentMeta } from '@storybook/react';
import DetailPanel from './DetailPanel';
import {
  Action,
  Section,
  useDetailPanel,
} from '@openmsupply-client/common/src/hooks/useDetailPanel';
import { Typography } from '@openmsupply-client/common/src/ui/components/index';
import { TestingProvider } from '@openmsupply-client/common/src/utils/testing';
import Grid from '@material-ui/core/Grid';

export default {
  title: 'Host/DetailPanel',
  component: DetailPanel,
} as ComponentMeta<typeof DetailPanel>;

interface DetailPanelArgs {
  actions: Action[];
  sections: Section[];
}

const Template: Story<DetailPanelArgs> = args => {
  const { OpenButton, setActions, setSections } = useDetailPanel();
  const { actions, sections } = args;

  useEffect(() => setActions(actions), []);
  useEffect(() => setSections(sections), []);

  return (
    <TestingProvider locale="en">
      <Grid container>
        <Grid item flex={1}>
          {OpenButton}
        </Grid>
        <Grid item>
          <DetailPanel />
        </Grid>
      </Grid>
    </TestingProvider>
  );
};

export const Demo = Template.bind({});
export const Empty = Template.bind({});

Demo.args = {
  actions: [{ titleKey: 'link.backorders', onClick: () => {} }],
  sections: [
    {
      titleKey: 'heading.comment',
      children: [
        <Typography key="0">comments to be shown in here...</Typography>,
      ],
    },
    {
      titleKey: 'heading.additional-info',
      children: [<Typography key="0">additional info...</Typography>],
    },
  ],
};

Empty.args = { actions: [], sections: [] };
