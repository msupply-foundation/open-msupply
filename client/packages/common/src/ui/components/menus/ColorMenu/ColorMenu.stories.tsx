import React, { useState } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { ColorMenu } from './ColorMenu';
import { TestingProvider } from '../../../../utils';
import { UnstyledIconButton } from '../../buttons';
import { Circle } from '../../../icons';

export default {
  title: 'Menus/ColorMenu',
  component: ColorMenu,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof ColorMenu>;

const Template: ComponentStory<typeof ColorMenu> = ({ onClick }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <TestingProvider>
      <ColorMenu onClose={handleClose} anchorEl={anchorEl} onClick={onClick} />
      <UnstyledIconButton
        titleKey="app.admin"
        icon={
          <Circle
            htmlColor="red"
            sx={{
              width: '12px',
              margin: 'margin: 0 9px 0 10px',
              overflow: 'visible',
              cursor: 'pointer',
            }}
          />
        }
        onClick={handleClick}
      />
    </TestingProvider>
  );
};

export const Primary = Template.bind({});
Primary.args = {
  onClick: () => {},
};
