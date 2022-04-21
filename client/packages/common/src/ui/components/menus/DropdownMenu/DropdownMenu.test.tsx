import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';
import { TestingProvider } from '../../../../utils';

describe('Dropdown', () => {
  it('Renders the dropdown item children when the dropdown is clicked', async () => {
    const { getByRole, findByText } = render(
      <TestingProvider>
        <DropdownMenu label="dropdown">
          <DropdownMenuItem>One</DropdownMenuItem>
        </DropdownMenu>
      </TestingProvider>
    );

    const button = getByRole('button');

    fireEvent.mouseDown(button);

    const node = await findByText(/one/i);

    expect(node).toBeInTheDocument();
  });

  it('Renders the dropdown item children when the dropdown is clicked and triggers the callback when an item is selected', async () => {
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

    const { getByRole, findByText } = render(<TestDropdown />);

    const button = getByRole('button');

    fireEvent.mouseDown(button);

    let node = await findByText(/one/i);

    fireEvent.click(node);

    node = await findByText(/two/i);

    expect(node).toBeInTheDocument();
  });
});
