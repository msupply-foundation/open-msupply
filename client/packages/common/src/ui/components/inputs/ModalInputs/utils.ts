import { Theme } from '@openmsupply-client/common';

export const commonInputContainerSx = {
  marginBottom: 1,
  flex: 1,
};

export const inputSlotProps = (disabled: boolean) => ({
  input: {
    sx: {
      boxShadow: (theme: Theme) => (!disabled ? theme.shadows[2] : 'none'),
      borderRadius: 2,
      background: (theme: Theme) =>
        disabled
          ? theme.palette.background.toolbar
          : theme.palette.background.white,
    },
  },
});

export const createLabelRowSx = (isVerticalScreen: boolean) => ({
  justifyContent: 'space-between',
  flexDirection: {
    xs: isVerticalScreen ? 'column' : 'row',
    md: 'row',
  },
  alignItems: { xs: 'flex-start', md: 'center' },
});

export const commonLabelProps = (showExtraFields: boolean = false) => ({
  sx: {
    width: {
      xs: '100%',
      md: showExtraFields ? '400px' : '600px',
      lg: showExtraFields ? '370px' : '550px',
    },
  },
});
