import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { BasePopover } from './BasePopover';
import { TestingProvider } from '@common/utils';

type VirtualElement = { getBoundingClientRect: () => DOMRect };

describe('BasePopover', () => {
  const Example = () => {
    const [anchorEl, setAnchorEl] = useState<VirtualElement | null>(null);

    return (
      <>
        <BasePopover isOpen={!!anchorEl} anchorEl={anchorEl}>
          <div />
        </BasePopover>
        <button
          onClick={e => {
            const rect = {
              top: e.clientY,
              left: e.clientX,
              bottom: e.clientY,
              right: e.clientX,
              width: 0,
              height: 0,
            } as DOMRect;

            setAnchorEl({ getBoundingClientRect: () => rect });
          }}
        />
      </>
    );
  };

  it('Displays the tooltip content when opened', () => {
    const { queryByRole } = render(
      <TestingProvider>
        <Example />
      </TestingProvider>
    );

    const notTooltip = queryByRole('tooltip');

    const button = queryByRole('button');

    if (button) fireEvent.click(button);

    const tooltip = queryByRole('tooltip');

    expect(notTooltip).not.toBeInTheDocument();
    expect(tooltip).toBeInTheDocument();
  });
});
