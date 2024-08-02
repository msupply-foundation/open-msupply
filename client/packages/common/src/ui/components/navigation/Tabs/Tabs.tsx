import MuiTabPanel from '@mui/lab/TabPanel';
import MuiTab from '@mui/material/Tab';
import MuiTabContext from '@mui/lab/TabContext';
import MuiTabList from '@mui/material/Tabs';
import { styled } from '@mui/material/styles';

export const Tab = MuiTab;
export const TabContext = MuiTabContext;
export const TabPanel = MuiTabPanel;

const TAB_HEIGHT = '42px';
const TAB_HEIGHT_SHORT = '32px';

const tabListStyles = {
  '& .MuiTabs-indicator': {
    borderBottom: '#555770 2px solid',
  },
};

const tabStyles = {
  color: '#8f90a6',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'none',
  whiteSpace: 'nowrap',
};

export const TabList = styled(MuiTabList)({
  minHeight: TAB_HEIGHT,
  maxHeight: TAB_HEIGHT,
  '& .MuiTab-root': {
    height: 50,
    ...tabStyles,
  },
  ...tabListStyles,
});

export const ShortTabList = styled(MuiTabList)({
  minHeight: TAB_HEIGHT_SHORT,
  maxHeight: TAB_HEIGHT_SHORT,
  '& .MuiTab-root': {
    minHeight: TAB_HEIGHT_SHORT,
    maxHeight: TAB_HEIGHT_SHORT,
    ...tabStyles,
  },
  ...tabListStyles,
});
