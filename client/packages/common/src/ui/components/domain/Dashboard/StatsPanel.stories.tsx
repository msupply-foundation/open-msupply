import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { StatsPanel, Stat } from './StatsPanel';
import { Box } from '@mui/material';
import { useTranslation } from '@common/intl';

const Template: ComponentStory<typeof StatsPanel> = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const t = useTranslation();
  const stats: Stat[] = [
    { label: t('label.expired'), value: '8' },
    {
      label: t('label.expiring-soon'),
      value: '88',
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
          title={t('heading.expiring-stock')}
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
