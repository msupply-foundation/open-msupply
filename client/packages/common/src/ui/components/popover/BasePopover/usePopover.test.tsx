import React from 'react';
import { Box } from '@mui/material';
import {
  fireEvent,
  render,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { BaseButton } from '../../buttons';
import { usePopover } from './usePopover';
import { TestingProvider } from '@common/utils';

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
    const { getByRole, queryByRole } = render(
      <TestingProvider>
        <Example />
      </TestingProvider>
    );

    fireEvent.click(getByRole('button', { name: /show/i }));

    return waitFor(() => expect(queryByRole('tooltip')).toBeInTheDocument());
  });

  it('does not have visible content before opening', () => {
    const { queryByRole } = render(
      <TestingProvider>
        <Example />
      </TestingProvider>
    );
    const content = queryByRole('tooltip');
    expect(content).not.toBeInTheDocument();
  });

  it('has no visible children after being hidden', async () => {
    const { queryByRole, getByRole } = render(
      <TestingProvider>
        <Example />
      </TestingProvider>
    );

    const show = getByRole('button', { name: /show/i });
    const hide = getByRole('button', { name: /hide/i });

    fireEvent.click(show);

    await waitFor(() => expect(queryByRole('tooltip')).toBeVisible());

    fireEvent.click(hide);

    await waitForElementToBeRemoved(queryByRole('tooltip'));

    expect(queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
