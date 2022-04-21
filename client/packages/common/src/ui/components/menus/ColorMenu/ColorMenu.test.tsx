import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Color, ColorMenu } from './ColorMenu';
import { IconButton } from '../../buttons';
import { TestingProvider } from '../../../../utils';
import { CircleIcon } from '@common/icons';
import { useTranslation } from '@common/intl';

describe('ColorMenu', () => {
  const TestColorMenu = ({ onClick }: { onClick: (color: Color) => void }) => {
    const t = useTranslation('app');
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
          onClose={handleClose}
          anchorEl={anchorEl}
          onClick={onClick}
        />
        <IconButton
          label={t('admin')}
          icon={
            <CircleIcon
              htmlColor="red"
              sx={{
                width: '12px',
                margin: 'margin: 0 9px 0 10px',
                cursor: 'pointer',
              }}
            />
          }
          onClick={handleClick}
        />
      </>
    );
  };

  it('Renders all the colors after clicking to open the menu', async () => {
    const fn = jest.fn();

    const { getByRole, getByLabelText } = render(
      <TestingProvider>
        <TestColorMenu onClick={fn} />
      </TestingProvider>
    );

    const button = getByRole('button');

    fireEvent.click(button);

    const red = getByLabelText('red');
    const blue = getByLabelText('blue');
    const green = getByLabelText('green');
    const yellow = getByLabelText('yellow');
    const grey = getByLabelText('grey');
    const aqua = getByLabelText('aqua');

    expect(red).toBeInTheDocument();
    expect(blue).toBeInTheDocument();
    expect(green).toBeInTheDocument();
    expect(yellow).toBeInTheDocument();
    expect(grey).toBeInTheDocument();
    expect(aqua).toBeInTheDocument();
  });

  it('Triggers the callback provided when clicking on a color', async () => {
    const fn = jest.fn();

    const { getByRole, getByLabelText } = render(
      <TestingProvider>
        <TestColorMenu onClick={fn} />
      </TestingProvider>
    );

    const button = getByRole('button');
    fireEvent.click(button);

    const red = getByLabelText('red');
    fireEvent.click(red);

    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ name: 'red', hex: '#ff3b3b' });
  });
});
