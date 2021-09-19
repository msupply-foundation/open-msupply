import MuiTabPanel from '@material-ui/lab/TabPanel';
import MuiTab from '@material-ui/core/Tab';
import MuiTabContext from '@material-ui/lab/TabContext';
import MuiTabList from '@material-ui/lab/TabList';
import { styled } from '@material-ui/system';

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
  fontSize: '14px',
  fontWeight: 'bold',
  textTransform: 'none',
});
