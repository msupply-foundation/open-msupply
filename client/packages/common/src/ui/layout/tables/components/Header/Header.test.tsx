import React, { FC } from 'react';
import { render } from '@testing-library/react';
import { HeaderCell, HeaderRow } from './Header';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { ColumnSetBuilder, useColumns } from '../..';
import { Item } from '../../../../..';

describe('HeaderRow', () => {
  const Example: FC<{
    onChangeSortBy: () => void;
    sortBy: { key: keyof Item; direction: 'asc' | 'desc' };
  }> = ({ onChangeSortBy, sortBy }) => {
    const [column1, column2] = useColumns(
      new ColumnSetBuilder<Item>()
        .addColumn('name')
        .addColumn('packSize')
        .build(),
      { onChangeSortBy }
    );

    if (!column1 || !column2) return null;

    return (
      <table>
        <thead>
          <HeaderRow>
            <HeaderCell column={column1} sortBy={sortBy}>
              Header1
            </HeaderCell>
            <HeaderCell column={column2} sortBy={sortBy}>
              Header2
            </HeaderCell>
          </HeaderRow>
        </thead>
      </table>
    );
  };

  it('renders the cells passed', () => {
    const onSortBy = jest.fn();
    const sortBy = { key: 'packSize', direction: 'asc' as 'asc' | 'desc' };

    const { getByRole } = render(
      <Example onChangeSortBy={onSortBy} sortBy={sortBy} />
    );

    const idHeader = getByRole('columnheader', { name: /id/i });
    const quantityHeader = getByRole('columnheader', { name: /quantity/i });

    expect(idHeader).toBeInTheDocument();
    expect(quantityHeader).toBeInTheDocument();
  });

  it('renders a button when the header is sortable, and no button otherwise', () => {
    const onSortBy = jest.fn();
    const sortBy = { key: 'packSize', direction: 'asc' as 'asc' | 'desc' };

    const { getByRole, queryByRole } = render(
      <Example onChangeSortBy={onSortBy} sortBy={sortBy} />
    );

    const idHeader = getByRole('button', { name: /header1/i });
    const quantityHeader = queryByRole('button', { name: /header2/i });

    expect(idHeader).toBeInTheDocument();
    expect(quantityHeader).not.toBeInTheDocument();
  });

  it('calls the provided sortBy function when the sort button is pressed', () => {
    const onSortBy = jest.fn();
    const sortBy = { key: 'packSize', direction: 'asc' as 'asc' | 'desc' };

    const { getByRole } = render(
      <Example onChangeSortBy={onSortBy} sortBy={sortBy} />
    );

    const idHeader = getByRole('button', { name: /header1/i });

    act(() => userEvent.click(idHeader));

    expect(onSortBy).toBeCalledTimes(1);
  });

  it('calls the provided sortBy function with the values of the column', () => {
    const onSortBy = jest.fn();
    const sortBy = { key: 'packSize', direction: 'asc' as 'asc' | 'desc' };

    const { getByRole } = render(
      <Example onChangeSortBy={onSortBy} sortBy={sortBy} />
    );

    const idHeader = getByRole('button', { name: /header1/i });

    act(() => userEvent.click(idHeader));

    expect(onSortBy).toBeCalledWith({ key: 'id' });
  });
});
