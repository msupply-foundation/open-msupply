// Icons sourced from https://feathericons.com/

import React, { ChangeEvent, useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Box, Paper, styled, TextField, Typography } from '@mui/material';
import { Grid } from '@openmsupply-client/common';
import { SvgIconProps } from '.';

import { AlertIcon } from './Alert';
import { ArrowLeftIcon } from './ArrowLeft';
import { ArrowRightIcon } from './ArrowRight';
import { BarChartIcon } from './BarChart';
import { BarIcon } from './Bar';
import { BookIcon } from './Book';
import { CameraIcon } from './Camera';
import { CentralIcon } from './Central';
import { CheckCircleIcon } from './CheckCircle';
import { CheckIcon } from './Check';
import { CheckboxCheckedIcon } from './CheckboxChecked';
import { CheckboxEmptyIcon } from './CheckboxEmpty';
import { CheckboxIndeterminateIcon } from './CheckboxIndeterminate';
import { ChevronDownIcon } from './ChevronDown';
import { ChevronsDownIcon } from './ChevronsDown';
import { CircleAlertIcon } from './CircleAlert';
import { CircleIcon } from './Circle';
import { ClockIcon } from './Clock';
import { CloseIcon } from './Close';
import { ColumnsIcon } from './Columns';
import { CopyIcon } from './Copy';
import { CustomersIcon } from './Customers';
import { DashboardIcon } from './Dashboard';
import { DeleteIcon } from './Delete';
import { DownloadIcon } from './Download';
import { EditIcon } from './Edit';
import { EmergencyIcon } from './Emergency';
import { ExternalLinkIcon } from './ExternalLink';
import { EyeIcon } from './Eye';
import { EyeOffIcon } from './EyeOff';
import { FileIcon } from './File';
import { FileUploadIcon } from './FileUpload';
import { FilterIcon } from './Filter';
import { HelpIcon } from './Help';
import { HomeIcon } from './Home';
import { InfoIcon } from './Info';
import { InfoOutlineIcon } from './InfoOutline';
import { InvoiceIcon } from './Invoice';
import { LinkIcon } from './Link';
import { ListIcon } from './List';
import { LocationIcon } from './Location';
import { MSupplyGuy, AnimatedMSupplyGuy } from './MSupplyGuy';
import { MailIcon } from './Mail';
import { MaximiseIcon } from './Maximise';
import { MenuDotsIcon } from './MenuDots';
import { MessageSquareIcon } from './MessageSquare';
import { MinimiseIcon } from './Minimise';
import { MinusCircleIcon } from './MinusCircle';
import { PlusCircleIcon } from './PlusCircle';
import { PowerIcon } from './Power';
import { PrinterIcon } from './Printer';
import { RadioIcon } from './Radio';
import { RefreshIcon } from './Refresh';
import { ReportsIcon } from './Reports';
import { RewindIcon } from './Rewind';
import { SaveIcon } from './Save';
import { ScanIcon } from './Scan';
import { SearchIcon } from './Search';
import { SettingsCircleIcon } from './SettingsCircle';
import { SettingsIcon } from './Settings';
import { SidebarIcon } from './Sidebar';
import { SlidersIcon } from './Sliders';
import { SnowflakeIcon } from './Snowflake';
import { SortAscIcon } from './SortAsc';
import { SortDescIcon } from './SortDesc';
import { StockIcon } from './Stock';
import { SunIcon } from './Sun';
import { SuppliersIcon } from './Suppliers';
import { SwipeIcon } from './Swipe';
import { ThermometerIcon } from './Thermometer';
import { TranslateIcon } from './Translate';
import { TruckIcon } from './Truck';
import { UploadIcon } from './Upload';
import { UserCircleIcon } from './UserCircle';
import { UserIcon } from './User';
import { XCircleIcon } from './XCircle';
import { ZapIcon } from './Zap';

export default {
  title: 'Assets/Svg Icon',
  component: Grid,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof Grid>;

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

const Template: StoryFn<React.FC<SvgIconProps>> = args => {
  const icons: Icon[] = [
    { icon: <AlertIcon double {...args} />, name: 'Alert (double)' },
    { icon: <AlertIcon {...args} />, name: 'Alert' },
    {
      icon: <AnimatedMSupplyGuy {...args} size="medium" />,
      name: 'AnimatedMSupplyGuy',
    },
    { icon: <ArrowLeftIcon {...args} />, name: 'ArrowLeft' },
    { icon: <ArrowRightIcon {...args} />, name: 'ArrowRight' },
    { icon: <BarChartIcon {...args} />, name: 'BarChart' },
    { icon: <BarIcon {...args} />, name: 'Bar' },
    { icon: <BookIcon {...args} />, name: 'Book' },
    { icon: <CameraIcon {...args} />, name: 'Camera' },
    { icon: <CentralIcon {...args} />, name: 'Central' },
    { icon: <CheckCircleIcon {...args} />, name: 'CheckCircle' },
    { icon: <CheckIcon {...args} />, name: 'Check' },
    { icon: <CheckboxCheckedIcon {...args} />, name: 'CheckboxChecked' },
    { icon: <CheckboxEmptyIcon {...args} />, name: 'CheckboxEmpty' },
    {
      icon: <CheckboxIndeterminateIcon {...args} />,
      name: 'Checkbox Indeterminate',
    },
    { icon: <ChevronDownIcon {...args} />, name: 'ChevronDown' },
    { icon: <ChevronsDownIcon {...args} />, name: 'ChevronsDown' },
    { icon: <CircleAlertIcon {...args} />, name: 'CircleAlert' },
    { icon: <CircleIcon {...args} />, name: 'Circle' },
    { icon: <ClockIcon {...args} />, name: 'Clock' },
    { icon: <CloseIcon {...args} />, name: 'Close' },
    { icon: <ColumnsIcon {...args} />, name: 'Columns' },
    { icon: <CopyIcon {...args} />, name: 'Copy' },
    { icon: <CustomersIcon {...args} />, name: 'Customers' },
    { icon: <DashboardIcon {...args} />, name: 'Dashboard' },
    { icon: <DeleteIcon {...args} />, name: 'Delete' },
    { icon: <DownloadIcon {...args} />, name: 'Download' },
    { icon: <EditIcon {...args} />, name: 'Edit' },
    { icon: <EmergencyIcon {...args} />, name: 'Emergency' },
    { icon: <ExternalLinkIcon {...args} />, name: 'External Link' },
    { icon: <EyeIcon {...args} />, name: 'Eye' },
    { icon: <EyeOffIcon {...args} />, name: 'EyeOff' },
    { icon: <FileIcon {...args} />, name: 'File' },
    { icon: <FileUploadIcon {...args} />, name: 'File Upload' },
    { icon: <FilterIcon {...args} />, name: 'Filter' },
    { icon: <HelpIcon {...args} />, name: 'Help' },
    { icon: <HomeIcon {...args} />, name: 'Home' },
    { icon: <InfoIcon {...args} />, name: 'Info' },
    { icon: <InfoOutlineIcon {...args} />, name: 'InfoOutline' },
    { icon: <InvoiceIcon {...args} />, name: 'Invoice' },
    { icon: <LinkIcon {...args} />, name: 'Link' },
    { icon: <ListIcon {...args} />, name: 'List' },
    { icon: <LocationIcon {...args} />, name: 'Location' },
    { icon: <MSupplyGuy {...args} size="medium" />, name: 'MSupplyGuy' },
    { icon: <MailIcon {...args} />, name: 'Mail' },
    { icon: <MaximiseIcon {...args} />, name: 'Maximise' },
    { icon: <MenuDotsIcon {...args} />, name: 'MenuDots' },
    { icon: <MessageSquareIcon {...args} />, name: 'MessageSquare' },
    { icon: <MinimiseIcon {...args} />, name: 'Minimise' },
    { icon: <MinusCircleIcon {...args} />, name: 'MinusCircle' },
    { icon: <PlusCircleIcon {...args} />, name: 'PlusCircle' },
    { icon: <PowerIcon {...args} />, name: 'Power' },
    { icon: <PrinterIcon {...args} />, name: 'Printer' },
    { icon: <RadioIcon {...args} />, name: 'Radio' },
    { icon: <RefreshIcon {...args} />, name: 'Refresh' },
    { icon: <ReportsIcon {...args} />, name: 'Reports' },
    { icon: <RewindIcon {...args} />, name: 'Rewind' },
    { icon: <SaveIcon {...args} />, name: 'Save' },
    { icon: <ScanIcon {...args} />, name: 'Scan' },
    { icon: <SearchIcon {...args} />, name: 'Search' },
    { icon: <SettingsCircleIcon {...args} />, name: 'SettingsCircle' },
    { icon: <SettingsIcon {...args} />, name: 'Settings' },
    { icon: <SidebarIcon {...args} />, name: 'Sidebar' },
    { icon: <SlidersIcon {...args} />, name: 'Sliders' },
    { icon: <SnowflakeIcon {...args} />, name: 'Snowflake' },
    { icon: <SortAscIcon {...args} />, name: 'SortAsc' },
    { icon: <SortDescIcon {...args} />, name: 'SortDesc' },
    { icon: <StockIcon {...args} />, name: 'Stock' },
    { icon: <SunIcon {...args} />, name: 'Sun' },
    { icon: <SuppliersIcon {...args} />, name: 'Suppliers' },
    { icon: <SwipeIcon {...args} />, name: 'Swipe' },
    { icon: <ThermometerIcon {...args} />, name: 'Thermometer' },
    { icon: <TranslateIcon {...args} />, name: 'Translate' },
    { icon: <TruckIcon {...args} />, name: 'Truck' },
    { icon: <UploadIcon {...args} />, name: 'Upload' },
    { icon: <UserCircleIcon {...args} />, name: 'UserCircle' },
    { icon: <UserIcon {...args} />, name: 'User' },
    { icon: <XCircleIcon {...args} />, name: 'XCircle' },
    { icon: <ZapIcon {...args} />, name: 'Zap' },
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
      <Grid>
        <Grid container spacing={1}>
          {filteredIcons.map(i => (
            <Grid key={i.name}>
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

export const Primary = Template.bind({});
export const Secondary = Template.bind({});
export const Small = Template.bind({});
export const DefaultValues = Template.bind({});

Primary.args = { color: 'primary' } as SvgIconProps;
Secondary.args = { color: 'secondary' } as SvgIconProps;
Small.args = { fontSize: 'small', color: 'primary' } as SvgIconProps;
