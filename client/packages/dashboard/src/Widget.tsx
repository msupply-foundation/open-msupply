import React from 'react';
import {
  CircularProgress,
  Paper,
  Box,
  styled,
} from '@openmsupply-client/common';

const Loading = () => (
  <Box display="flex" flex={1} justifyContent="center" alignItems="center">
    <CircularProgress />
  </Box>
);

interface WidgetProps {
  children: JSX.Element | JSX.Element[];
  height?: number | string;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  overflow: 'auto',
  height: '240px',
}));

const Widget: React.FC<WidgetProps> = props => (
  <StyledPaper>
    <React.Suspense fallback={<Loading />}>{props.children}</React.Suspense>
  </StyledPaper>
);

export default Widget;
