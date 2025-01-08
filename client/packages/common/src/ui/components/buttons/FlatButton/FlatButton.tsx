import React from 'react';
import { Button as MuiButton, styled, SxProps, Theme } from '@mui/material';
import { Property } from 'csstype';
import { useIntlUtils } from '@common/intl';
import { useIsScreen } from '@common/hooks';
interface ButtonProps {
  color?: 'inherit' | 'primary' | 'secondary';
  endIcon?: React.ReactNode;
  startIcon?: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  sx?: SxProps<Theme>;
  disabled?: boolean;
  name?: string;
  shouldShrink?: boolean;
  shrinkThreshold?: 'sm' | 'md' | 'lg' | 'xl';
}

const StyledButton = styled(MuiButton, {
  shouldForwardProp: prop => prop !== 'shrink' && prop !== 'isRtl',
})<{ isRtl: boolean; shrink: boolean }>(({ isRtl, color, theme, disabled }) => {
  const iconColor = theme.palette.primary.main;

  return {
    fontWeight: 500,
    marginLeft: 5,
    marginRight: 5,
    textTransform: 'none' as Property.TextTransform,
    color: color === 'primary' ? 'black' : color,
    isRtl,

    '& .MuiButton-startIcon, .MuiSvgIcon-root': {
      color: color === 'primary' && !disabled ? iconColor : color,
      isRtl: {
        marginRight: -4,
        marginLeft: 8,
      },
    },
  };
});

export const FlatButton: React.FC<ButtonProps> = ({
  color = 'primary',
  endIcon,
  label,
  onClick,
  startIcon,
  sx,
  name,
  disabled = false,
  shouldShrink = true,
  shrinkThreshold = 'md',
}) => {
  const { isRtl } = useIntlUtils();
  const isShrinkThreshold: boolean = useIsScreen(shrinkThreshold);

  // On small screens, if the button shouldShrink, then
  // only display a centred icon, with no text.
  const shrink = isShrinkThreshold && shouldShrink;
  const regularIcon = shrink ? null : startIcon;
  const centredIcon = shrink ? startIcon : null;
  const text = shrink ? null : label;

  return (
    <StyledButton
      disabled={disabled}
      shrink={shrink}
      onClick={onClick}
      endIcon={endIcon}
      startIcon={regularIcon}
      variant="text"
      color={color}
      isRtl={isRtl}
      sx={sx}
      name={name}
    >
      {centredIcon}
      {text}
    </StyledButton>
  );
};
