import Link, { LinkProps } from '@mui/material/Link';
import { styled } from '@mui/material/styles';

export const StyleFreeLink = styled(Link)<LinkProps>(({}) => ({
  textDecoration: 'inherit',
  color: 'inherit',
  style: 'inherit',
}));
