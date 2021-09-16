import MuiTabs from '@material-ui/core/Tabs';
import { styled } from '@material-ui/system';

export const Tabs = styled(MuiTabs)({
  minHeight: '42px',
  maxHeight: '42px',
  '& .MuiTabs-indicator': {
    borderBottom: '#555770 2px solid',
  },
});
