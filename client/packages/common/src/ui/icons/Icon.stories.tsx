import React, { ChangeEvent, useState } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { ArrowLeft } from './ArrowLeft';
import { Book } from './Book';
import { CheckboxChecked } from './CheckboxChecked';
import { CheckboxIndeterminate } from './CheckboxIndeterminate';
import { CheckboxEmpty } from './CheckboxEmpty';
import { ChevronDown } from './ChevronDown';
import { Customers } from './Customers';
import { Dashboard } from './Dashboard';
import { Download } from './Download';
import { Invoice } from './Invoice';
import { MSupplyGuy } from './MSupplyGuy';
import { MenuDots } from './MenuDots';
import { Messages } from './Messages';
import { PlusCircle } from './PlusCircle';
import { Power } from './Power';
import { Printer } from './Printer';
import { Radio } from './Radio';
import { Reports } from './Reports';
import { Settings } from './Settings';
import { SortAsc } from './SortAsc';
import { SortDesc } from './SortDesc';
import { Stock } from './Stock';
import { Suppliers } from './Suppliers';
import { Tools } from './Tools';
import { Translate } from './Translate';
import { Circle } from './Circle';
import {
  Box,
  Grid,
  Paper,
  styled,
  TextField,
  Typography,
} from '@material-ui/core';

export default {
  title: 'Assets/Svg Icon',
  component: Grid,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof Grid>;

const StyledPaper = styled(Paper)({
  textAlign: 'center',
  height: 90,
  padding: 10,
  width: 150,
});
type Icon = {
  icon: JSX.Element;
  name: string;
};

const Template: ComponentStory<React.FC<SvgIconProps>> = args => {
  const icons: Icon[] = [
    { icon: <ArrowLeft {...args} />, name: 'ArrowLeft' },
    { icon: <Book {...args} />, name: 'Book' },
    { icon: <CheckboxChecked {...args} />, name: 'CheckboxChecked' },
    {
      icon: <CheckboxIndeterminate {...args} />,
      name: 'Checkbox Indeterminate',
    },
    { icon: <CheckboxEmpty {...args} />, name: 'CheckboxEmpty' },
    { icon: <ChevronDown {...args} />, name: 'ChevronDown' },
    { icon: <Customers {...args} />, name: 'Customers' },
    { icon: <Dashboard {...args} />, name: 'Dashboard' },
    { icon: <Download {...args} />, name: 'Download' },
    { icon: <Invoice {...args} />, name: 'Invoice' },
    { icon: <MSupplyGuy {...args} size="medium" />, name: 'MSupplyGuy' },
    { icon: <MenuDots {...args} />, name: 'MenuDots' },
    { icon: <Messages {...args} />, name: 'Messages' },
    { icon: <PlusCircle {...args} />, name: 'PlusCircle' },
    { icon: <Power {...args} />, name: 'Power' },
    { icon: <Printer {...args} />, name: 'Printer' },
    { icon: <Radio {...args} />, name: 'Radio' },
    { icon: <Reports {...args} />, name: 'Reports' },
    { icon: <Settings {...args} />, name: 'Settings' },
    { icon: <SortAsc {...args} />, name: 'SortAsc' },
    { icon: <SortDesc {...args} />, name: 'SortDesc' },
    { icon: <Stock {...args} />, name: 'Stock' },
    { icon: <Suppliers {...args} />, name: 'Suppliers' },
    { icon: <Tools {...args} />, name: 'Tools' },
    { icon: <Translate {...args} />, name: 'Translate' },
    { icon: <Circle {...args} />, name: 'Circle' },
  ];
  const [filteredIcons, setFilteredIcons] = useState(icons);
  const filterIcons = (event: ChangeEvent<HTMLInputElement>) => {
    const re = new RegExp(event.target.value, 'i');
    setFilteredIcons(icons.filter(i => re.test(i.name)));
  };
  return (
    <>
      <Box padding={1}>
        <TextField
          onChange={filterIcons}
          label="Filter icons"
          variant="outlined"
        />
      </Box>
      <Grid item>
        <Grid container spacing={1}>
          {filteredIcons.map(i => (
            <Grid item xs key={i.name}>
              <StyledPaper>
                {i.icon}
                <Typography>{i.name}</Typography>
              </StyledPaper>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </>
  );
};

type Color =
  | 'inherit'
  | 'action'
  | 'disabled'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

interface SvgIconProps {
  color: Color;
}
export const Primary = Template.bind({});
export const Secondary = Template.bind({});

Secondary.args = { color: 'secondary' } as SvgIconProps;
