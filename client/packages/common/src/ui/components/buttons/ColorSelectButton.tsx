import React, { FC, useState } from 'react';
import { ColorMenu, Color } from '../menus';
import { IconButton } from './IconButton';
import { CircleIcon } from '../../icons';

interface ColorSelectButtonProps {
  color: string;
  onChange: (color: Color) => void;
  colors?: Color[];
}

export const ColorSelectButton: FC<ColorSelectButtonProps> = ({
  onChange,
  colors,
  color,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

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
        labelKey="button.select-a-color"
        height="16px"
        icon={
          <CircleIcon
            htmlColor={color}
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
