import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { TestingProvider } from '@common/utils';
import { EnumFilter, EnumFilterDefinition } from './EnumFilter';

const filterDefinition: EnumFilterDefinition = {
  type: 'enum',
  name: 'Status',
  urlParameter: 'status',
  isMultiSelect: true,
  options: [
    { label: 'New', value: 'NEW' },
    { label: 'Allocated', value: 'ALLOCATED' },
    { label: 'Picked', value: 'PICKED' },
  ],
};

const getWrapper =
  (initialEntries: string[] = ['/testing']) =>
    ({ children }: { children: ReactNode }) => (
      <TestingProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </TestingProvider>
    );

describe('EnumFilter (multi-select)', () => {
  it('renders the labels of the values selected in the URL', () => {
    const { getByText } = render(
      <EnumFilter filterDefinition={filterDefinition} />,
      { wrapper: getWrapper(['/testing?status=NEW,PICKED']) }
    );

    expect(getByText('New, Picked')).toBeInTheDocument();
  });

  it('renders nothing selected when the URL param is absent', () => {
    const { queryByText } = render(
      <EnumFilter filterDefinition={filterDefinition} />,
      { wrapper: getWrapper(['/testing']) }
    );

    expect(queryByText('New')).not.toBeInTheDocument();
    expect(queryByText('Allocated')).not.toBeInTheDocument();
  });
});
