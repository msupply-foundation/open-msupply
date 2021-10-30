import React from 'react';
import { Box } from '@mui/system';
import { act, render, waitForElementToBeRemoved } from '@testing-library/react';
import { BaseButton, usePopover } from '../..';
import userEvent from '@testing-library/user-event';

describe('usePopover', () => {
  const Example = () => {
    const { show, hide, Popover } = usePopover();

    return (
      <Box>
        <BaseButton onClick={show}>Show</BaseButton>
        <BaseButton onClick={hide}>Hide</BaseButton>
        <Popover>
          <div />
        </Popover>
      </Box>
    );
  };

  it('Has visible content when opened', () => {
    const { queryByRole } = render(<Example />);

    const open = queryByRole('button', { name: /show/i });

    act(() => {
      if (open) userEvent.click(open);
    });

    const content = queryByRole('tooltip');

    expect(content).toBeInTheDocument();
  });

  it('does not have visible content before opening', () => {
    const { queryByRole } = render(<Example />);
    const content = queryByRole('tooltip');
    expect(content).not.toBeInTheDocument();
  });

  it('has no visible children after being hidden', async () => {
    const { queryByRole, getByRole } = render(<Example />);

    const show = getByRole('button', { name: /show/i });
    const hide = getByRole('button', { name: /hide/i });

    userEvent.click(show);

    const content = queryByRole('tooltip');
    expect(content).toBeVisible();

    userEvent.click(hide);

    await waitForElementToBeRemoved(queryByRole('tooltip'));

    expect(queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
