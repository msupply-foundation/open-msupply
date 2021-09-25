import React, { FC } from 'react';
import { render } from '@testing-library/react';
import { HeaderCell, HeaderRow } from './Header';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

describe('HeaderRow', () => {
  const Example: FC<{ onSortBy: () => void }> = ({ onSortBy }) => (
    <table>
      <thead>
        <HeaderRow>
          <HeaderCell
            width={100}
            minWidth={100}
            onSortBy={onSortBy}
            isSortable
            isSorted
            columnKey="id"
            direction="asc"
          >
            Header1
          </HeaderCell>
          <HeaderCell
            width={100}
            minWidth={100}
            onSortBy={onSortBy}
            isSortable={false}
            isSorted={false}
            columnKey="quantity"
            direction="asc"
          >
            Header2
          </HeaderCell>
        </HeaderRow>
      </thead>
    </table>
  );

  it('renders the cells passed', () => {
    const onSortBy = jest.fn();

    const { getByRole } = render(<Example onSortBy={onSortBy} />);

    const idHeader = getByRole('columnheader', { name: /id/i });
    const quantityHeader = getByRole('columnheader', { name: /quantity/i });

    expect(idHeader).toBeInTheDocument();
    expect(quantityHeader).toBeInTheDocument();
  });

  it('renders a button when the header is sortable, and no button otherwise', () => {
    const onSortBy = jest.fn();

    const { getByRole, queryByRole } = render(<Example onSortBy={onSortBy} />);

    const idHeader = getByRole('button', { name: /header1/i });
    const quantityHeader = queryByRole('button', { name: /header2/i });

    expect(idHeader).toBeInTheDocument();
    expect(quantityHeader).not.toBeInTheDocument();
  });

  it('calls the provided sortBy function when the sort button is pressed', () => {
    const onSortBy = jest.fn();

    const { getByRole } = render(<Example onSortBy={onSortBy} />);

    const idHeader = getByRole('button', { name: /header1/i });

    act(() => userEvent.click(idHeader));

    expect(onSortBy).toBeCalledTimes(1);
  });

  it('calls the provided sortBy function with the values of the column', () => {
    const onSortBy = jest.fn();

    const { getByRole } = render(<Example onSortBy={onSortBy} />);

    const idHeader = getByRole('button', { name: /header1/i });

    act(() => userEvent.click(idHeader));

    expect(onSortBy).toBeCalledWith({ key: 'id' });
  });
});
