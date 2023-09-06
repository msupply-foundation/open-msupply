import { styled, Popper } from '@mui/material';

export const StyledPopper = styled(Popper)(({ theme }) => ({
  boxShadow: theme.shadows[2],
}));
