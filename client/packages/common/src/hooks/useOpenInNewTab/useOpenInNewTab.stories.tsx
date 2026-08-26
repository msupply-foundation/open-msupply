import React, { useState } from 'react';
import { StoryFn } from '@storybook/react';
import { useOpenInNewTab } from './useOpenInNewTab';
import { Typography, BaseButton, BasicTextInput } from '@common/components';

export default {
  title: 'Hooks/useOpenInNewTab',
};

const Template: StoryFn = () => {
  const openInNewTab = useOpenInNewTab();
  const [url, setUrl] = useState('');

  return (
    <div>
      <Typography>Enter a relative URL</Typography>
      <BasicTextInput value={url} onChange={e => setUrl(e.target.value)} />
      <BaseButton onClick={() => openInNewTab(url)}>Click Me</BaseButton>
    </div>
  );
};

export const Primary = Template.bind({});
