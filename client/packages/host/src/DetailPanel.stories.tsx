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
import Grid from '@mui/material/Grid';
import { Clock } from '@openmsupply-client/common/src/ui/icons/Clock';
import { Copy } from '@openmsupply-client/common/src/ui/icons/Copy';
import { Rewind } from '@openmsupply-client/common/src/ui/icons/Rewind';

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
export const SectionsOnly = Template.bind({});
export const AcionsOnly = Template.bind({});

Demo.args = {
  actions: [
    {
      titleKey: 'link.backorders',
      onClick: () => {
        alert('back orders');
      },
      icon: <Rewind />,
    },
  ],
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

AcionsOnly.args = {
  actions: [
    {
      titleKey: 'link.history',
      onClick: () => {
        alert('history');
      },
      icon: <Clock />,
    },
    {
      titleKey: 'link.copy-to-clipboard',
      onClick: () => {
        alert('copy to clipboard');
      },
      icon: <Copy />,
    },
  ],
  sections: [],
};

SectionsOnly.args = {
  actions: [],
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
