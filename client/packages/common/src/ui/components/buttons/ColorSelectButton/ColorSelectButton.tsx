import React, { FC, useState } from 'react';
import { ColorMenu, Color } from '../../menus';
import { IconButton } from '../IconButton';
import { CircleIcon } from '@common/icons';
import { useTranslation } from '@common/intl';

interface ColorSelectButtonProps {
  color?: string | null;
  onChange: (color: Color) => void;
  colors?: Color[];
  disabled?: boolean;
}

export const ColorSelectButton: FC<ColorSelectButtonProps> = ({
  onChange,
  colors,
  color,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const t = useTranslation();
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <ColorMenu
        colors={colors}
        onClose={handleClose}
        anchorEl={anchorEl}
        onClick={color => {
          handleClose();
          onChange(color);
        }}
      />
      <IconButton
        label={t('button.select-a-color')}
        height="16px"
        disabled={disabled}
        icon={
          <CircleIcon
            htmlColor={color ?? '#8f90a6'}
            sx={{
              width: '12px',
              margin: 'margin: 0 9px 0 10px',
              overflow: 'visible',
              cursor: 'pointer',
            }}
          />
        }
        onClick={e => {
          e.stopPropagation();
          handleClick(e);
        }}
      />
    </>
  );
};
