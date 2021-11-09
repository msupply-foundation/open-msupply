import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { StatsPanel, Stat } from './StatsPanel';
import { Box } from '@mui/material';

const Template: ComponentStory<typeof StatsPanel> = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const stats: Stat[] = [
    { labelKey: 'label.expired', value: 8 },
    {
      labelKey: 'label.expiring-soon',
      value: 88,
    },
  ];

  React.useEffect(() => {
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  return (
    <Box>
      <Box>Sample StatsPanel using the this as the Stats value:</Box>
      <Box
        style={{
          backgroundColor: '#eee',
          borderRadius: 6,
          fontFamily: 'Courier New',
          margin: '20px 60px 0 20px',
          padding: 15,
          whiteSpace: 'pre-wrap',
        }}
      >
        {JSON.stringify(stats, null, 4)}
      </Box>
      <Box style={{ width: 350 }}>
        <StatsPanel
          isLoading={isLoading}
          stats={stats}
          titleKey="heading.expiring-stock"
        />
      </Box>
    </Box>
  );
};

export const Primary = Template.bind({});

export default {
  title: 'Components/StatsPanel',
  component: StatsPanel,
} as ComponentMeta<typeof StatsPanel>;
