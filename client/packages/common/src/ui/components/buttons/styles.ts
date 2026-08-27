import { Property } from 'csstype';

export const DefaultButtonStyles = {
  backgroundColor: '#fff',
  borderRadius: 24,
  fontWeight: 700,
  height: 40,
  marginLeft: 5,
  marginRight: 5,
  textTransform: 'none' as Property.TextTransform,
  '&:hover': { color: '#fff' },
  '&:hover svg': { color: '#fff' },
};
