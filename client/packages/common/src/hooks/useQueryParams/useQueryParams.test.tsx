import React, { FC, PropsWithChildren, ReactNode } from 'react';
import { TestingRouterContext } from '@openmsupply-client/common';
import { TestingProvider } from '../../utils/testing';
import { useTheme } from '@common/styles';
import { renderHook } from '@testing-library/react-hooks';
import { useQueryParams } from './useQueryParams';

type TestSortBy = {
  id: string;
  quantity: number;
};

type ThemeChangererProps = {
  paginationRowHeight: number;
  dataRowHeight: number;
  headerRowHeight: number;
  footerHeight: number;
  saveButtonRowHeight: number;
};

describe('useQueryParams', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  const ThemeChangerer: FC<PropsWithChildren<ThemeChangererProps>> = ({
    children,
    paginationRowHeight,
    dataRowHeight,
    headerRowHeight,
    footerHeight,
    saveButtonRowHeight,
  }) => {
    const theme = useTheme();
    theme.mixins.table.dataRow = { height: dataRowHeight };
    theme.mixins.table.paginationRow = { height: paginationRowHeight };
    theme.mixins.table.headerRow = { height: headerRowHeight };
    theme.mixins.footer = { height: footerHeight };
    theme.mixins.saveButtonRow = { height: saveButtonRowHeight };

    return <>{children}</>;
  };

  const getWrapper =
    (
      dataRowHeight = 10,
      headerRowHeight = 0,
      paginationRowHeight = 0,
      footerHeight = 0,
      saveButtonRowHeight = 0
    ) =>
    ({ children }: { children: ReactNode[] }) => {
      return (
        <TestingProvider>
          <TestingRouterContext>
            <ThemeChangerer
              paginationRowHeight={paginationRowHeight}
              dataRowHeight={dataRowHeight}
              headerRowHeight={headerRowHeight}
              footerHeight={footerHeight}
              saveButtonRowHeight={saveButtonRowHeight}
            >
              {children}
            </ThemeChangerer>
          </TestingRouterContext>
        </TestingProvider>
      );
    };

  it('Returns the correct initial state', () => {
    window.resizeTo(1000, 1000);

    const { result } = renderHook(
      () => useQueryParams<TestSortBy>({ initialSortBy: { key: 'id' } }),
      {
        wrapper: getWrapper(),
      }
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        sortBy: { key: 'id', isDesc: false, direction: 'asc' },
        pagination: expect.objectContaining({ page: 0, offset: 0, first: 20 }),
        page: 0,
        offset: 0,
        first: 20,
      })
    );
  });
});
