import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Switch } from './Switch';
import { Box } from '@mui/material';

export default {
  title: 'Inputs/Switch',
  component: Switch,
} as ComponentMeta<typeof Switch>;

const Template: ComponentStory<typeof Switch> = args => {
  const [checked, setChecked] = React.useState(false);
  return (
    <Box>
      <Switch
        label="this is a pointless label"
        onChange={() => setChecked(!checked)}
        checked={checked}
        {...args}
      />
      <div style={{ marginTop: 50, fontStyle: 'italic' }}>
        Current state is {checked ? 'on' : 'off'}
      </div>
    </Box>
  );
};

export const Medium = Template.bind({});
export const Small = Template.bind({});
export const Bottom = Template.bind({});
export const End = Template.bind({});
export const Top = Template.bind({});
export const Disabled = Template.bind({});

Medium.args = { size: 'medium' };
Small.args = { size: 'small' };
Bottom.args = { labelPlacement: 'bottom' };
End.args = { labelPlacement: 'end' };
Top.args = { labelPlacement: 'top' };
Disabled.args = { disabled: true };

// .rtl-3z030n-MuiButtonBase-root-MuiSwitch-switchBase {

//     /* right: 0; */
