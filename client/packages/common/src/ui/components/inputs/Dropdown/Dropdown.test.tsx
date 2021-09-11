import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { Dropdown, DropdownItem } from '.';
import { TestingProvider } from '../../../../utils';

describe('Dropdown', () => {
  it('Renders the dropdown item children when the dropdown is clicked', () => {
    const { getByRole, getByText } = render(
      <TestingProvider>
        <Dropdown label="dropdown">
          <DropdownItem>One</DropdownItem>
        </Dropdown>
      </TestingProvider>
    );

    const button = getByRole('button');

    act(() => {
      userEvent.click(button);
    });

    const node = getByText(/one/i);

    expect(node).toBeInTheDocument();
  });

  it('Renders the dropdown item children when the dropdown is clicked', () => {
    const TestDropdown = () => {
      const [text, setText] = React.useState('one');

      return (
        <TestingProvider>
          <Dropdown label="dropdown">
            <DropdownItem onClick={() => setText('two')}>{text}</DropdownItem>
          </Dropdown>
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

    node = screen.getByText(/two/i);

    expect(node).toBeInTheDocument();
  });
});
