import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';
import { TestingProvider } from '../../../../utils';

describe('Dropdown', () => {
  it('Renders the dropdown item children when the dropdown is clicked', () => {
    const { getByRole, getByText } = render(
      <TestingProvider>
        <DropdownMenu label="dropdown">
          <DropdownMenuItem>One</DropdownMenuItem>
        </DropdownMenu>
      </TestingProvider>
    );

    const button = getByRole('button');

    act(() => {
      userEvent.click(button);
    });

    const node = getByText(/one/i);

    expect(node).toBeInTheDocument();
  });

  it('Renders the dropdown item children when the dropdown is clicked and triggers the callback when an item is selected', () => {
    const TestDropdown = () => {
      const [text, setText] = React.useState('one');

      return (
        <TestingProvider>
          <DropdownMenu label="dropdown">
            <DropdownMenuItem onClick={() => setText('two')}>
              {text}
            </DropdownMenuItem>
          </DropdownMenu>
        </TestingProvider>
      );
    };

    const { getByRole, getByText } = render(<TestDropdown />);

    const button = getByRole('button');

    act(() => {
      userEvent.click(button);
    });

    let node = getByText(/one/i);

    act(() => {
      userEvent.click(node);
    });

    node = getByText(/two/i);

    expect(node).toBeInTheDocument();
  });
});
