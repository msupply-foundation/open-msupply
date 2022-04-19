import MuiTabPanel from '@mui/lab/TabPanel';
import MuiTab from '@mui/material/Tab';
import MuiTabContext from '@mui/lab/TabContext';
import MuiTabList from '@mui/lab/TabList';
import { styled } from '@mui/material/styles';

export const TabContext = MuiTabContext;

export const TabPanel = MuiTabPanel;

export const TabList = styled(MuiTabList)({
  minHeight: '42px',
  maxHeight: '42px',
  '& .MuiTabs-indicator': {
    borderBottom: '#555770 2px solid',
  },
});

export const Tab = styled(MuiTab)({
  color: '#8f90a6',
  fontSize: '12px',
  height: 50,
  fontWeight: 'bold',
  textTransform: 'none',
  whiteSpace: 'nowrap',
});
