import React, { useState } from 'react';
import { render } from '@testing-library/react';
import { Color, ColorMenu } from './ColorMenu';
import { IconButton } from '../../buttons';
import { TestingProvider } from '../../../../utils';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { Circle } from '../../../icons';

describe('ColorMenu', () => {
  const TestColorMenu = ({ onClick }: { onClick: (color: Color) => void }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    return (
      <TestingProvider>
        <ColorMenu
          onClose={handleClose}
          anchorEl={anchorEl}
          onClick={onClick}
        />
        <IconButton
          labelKey="app.admin"
          icon={
            <Circle
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
      </TestingProvider>
    );
  };

  it('Renders all the colors after clicking to open the menu', async () => {
    const fn = jest.fn();

    const { getByRole, getByLabelText } = render(
      <TestColorMenu onClick={fn} />
    );

    const button = getByRole('button');

    await act(async () => {
      userEvent.click(button);
    });

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
      <TestColorMenu onClick={fn} />
    );

    const button = getByRole('button');

    await act(async () => {
      userEvent.click(button);
    });

    const red = getByLabelText('red');

    await act(async () => {
      userEvent.click(red);
    });

    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith({ name: 'red', hex: '#ff3b3b' });
  });
});
