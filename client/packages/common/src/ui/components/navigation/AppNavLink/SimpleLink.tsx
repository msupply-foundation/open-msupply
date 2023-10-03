import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';

export const SimpleLink = styled(Link)(({}) => ({
  textDecoration: 'inherit',
  color: 'inherit',
  style: 'inherit',
  '&:hover': { textDecoration: 'underline' },
}));
