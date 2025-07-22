import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { TableBody, Table } from '@mui/material';
import { DataRow } from './DataRow';
import { TestingProvider } from '../../../../../utils';
import { Column } from '../../columns';
import { MemoryRouter } from 'react-router-dom';

describe('DataRow', () => {
  const t = () => '';
  const localisedDate = () => '';
  const columns = [
    {
      label: 'label.type',
      key: 'id',
      width: 150,
      Cell: () => <div>id</div>,
    },
  ] as unknown as Column<{ id: string }>[]; // Technique to avoid TS error in test

  it('does nothing when neither onClick nor rowLinkBuilder is provided', () => {
    const { getByRole } = render(
      <TestingProvider>
        <Table>
          <TableBody>
            <DataRow
              columns={columns}
              rowKey="rowKey"
              rowIndex={0}
              rowData={{ id: 'id' }}
              generateRowTooltip={() => ''}
              isAnimated={false}
              localisedText={t}
              localisedDate={localisedDate}
            />
          </TableBody>
        </Table>
      </TestingProvider>
    );
    expect(() => fireEvent.click(getByRole('row'))).not.toThrow();
  });

  it('calls the onClick handler when the row is clicked', () => {
    const onClick = jest.fn();

    const { getByText, getByRole } = render(
      <TestingProvider>
        <Table>
          <TableBody>
            <DataRow
              columns={columns}
              rowKey="rowKey"
              rowIndex={0}
              rowData={{ id: 'id' }}
              onClick={onClick}
              generateRowTooltip={() => ''}
              isAnimated={false}
              localisedText={t}
              localisedDate={localisedDate}
            />
          </TableBody>
        </Table>
      </TestingProvider>
    );

    expect(getByText(/id/)).toBeInTheDocument();
    fireEvent.click(getByRole('row'));
    expect(onClick).toHaveBeenCalledWith({ id: 'id' });
  });

  it('calls rowLinkBuilder instead of onClick and wraps cell content in a Link when both are provided and customLinkRendering is false', () => {
    const onClick = jest.fn();
    const rowLinkBuilder = jest.fn(() => '/test-link');

    const { container, getByRole } = render(
      <MemoryRouter>
        <TestingProvider>
          <Table>
            <TableBody>
              <DataRow
                columns={columns}
                rowKey="rowKey"
                rowIndex={0}
                rowData={{ id: 'id' }}
                onClick={onClick}
                generateRowTooltip={() => ''}
                isAnimated={false}
                localisedText={t}
                localisedDate={localisedDate}
                rowLinkBuilder={rowLinkBuilder}
              />
            </TableBody>
          </Table>
        </TestingProvider>
      </MemoryRouter>
    );

    const link = container.querySelector('a[href="/test-link"]');
    expect(link).toBeInTheDocument();
    fireEvent.click(getByRole('row'));
    expect(onClick).not.toHaveBeenCalled();
    expect(rowLinkBuilder).toHaveBeenCalledWith({ id: 'id' });
  });

  it('calls rowLinkBuilder and does not wrap cell content in a Link when customLinkRendering is true', () => {
    const rowLinkBuilder = jest.fn(() => '/test-link');

    const columnsWithLink = [
      {
        label: 'label.type',
        key: 'id',
        width: 150,
        Cell: () => <div>id</div>,
        align: 'left',
        customLinkRendering: true,
      },
    ] as unknown as Column<{ id: string }>[];

    const { container, getByRole } = render(
      <MemoryRouter>
        <TestingProvider>
          <Table>
            <TableBody>
              <DataRow
                columns={columnsWithLink}
                rowKey="rowKey"
                rowIndex={0}
                rowData={{ id: 'id' }}
                generateRowTooltip={() => ''}
                isAnimated={false}
                localisedText={t}
                localisedDate={localisedDate}
                rowLinkBuilder={rowLinkBuilder}
              />
            </TableBody>
          </Table>
        </TestingProvider>
      </MemoryRouter>
    );

    const link = container.querySelector('a[href="/test-link"]');
    expect(link).not.toBeInTheDocument();
    fireEvent.click(getByRole('row'));
    expect(rowLinkBuilder).toHaveBeenCalledWith({ id: 'id' });
  });
});
