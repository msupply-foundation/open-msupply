import Link, { LinkProps } from '@mui/material/Link';
import { styled } from '@mui/material/styles';

export const SimpleLink = styled(Link)<LinkProps>(({}) => ({
  textDecoration: 'inherit',
  color: 'inherit',
  style: 'inherit',
  '&:hover': { textDecoration: 'underline' },
}));
