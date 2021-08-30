import { Theme } from '@material-ui/core';
import { CreateCSSProperties } from '@material-ui/core/styles/withStyles';
import { TextTransformProperty } from 'csstype';

const defaultStyles = {
  backgroundColor: '#fff',
  borderRadius: 24,
  fontWeight: 700,
  height: 40,
  marginLeft: 5,
  marginRight: 5,
  textTransform: 'none' as TextTransformProperty,
};

export const getButtonStyles = ({
  theme,
}: {
  theme: Theme;
}): CreateCSSProperties => ({
  ...defaultStyles,
  boxShadow: theme.shadows[1],
  color: theme.palette.primary.main,
  minWidth: 115,
});

export const getIconButtonStyles = ({
  theme,
}: {
  theme: Theme;
}): CreateCSSProperties => ({
  ...defaultStyles,
  boxShadow: theme.shadows[1],
  color: theme.palette.primary.main,
});

export const getTextButtonStyles = ({
  theme,
}: {
  theme: Theme;
}): CreateCSSProperties => ({
  ...defaultStyles,
  boxShadow: theme.shadows[1],
  color: theme.palette.primary.main,
  minWidth: 115,
});
