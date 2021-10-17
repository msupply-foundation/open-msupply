import React, { FC, ReactNode } from 'react';
import { act } from 'react-dom/test-utils';
import { waitFor } from '@testing-library/dom';
import { renderHook } from '@testing-library/react-hooks';
import AppBar from '@openmsupply-client/host/src/AppBar';
import { useTheme } from '../../styles';
import { TestingProvider, TestingRouter } from '../../utils';
import { useRowRenderCount } from './useRowRenderCount';
import { useAppBarRectStore } from '../useAppBarRect';

type ThemeChangererProps = {
  paginationRowHeight: number;
  dataRowHeight: number;
  headerRowHeight: number;
  footerHeight: number;
  saveButtonRowHeight: number;
};

describe('useRowRenderCount', () => {
  const ThemeChangerer: FC<ThemeChangererProps> = ({
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
      saveButtonRowHeight = 0,
      footerHeight = 0
    ) =>
    ({ children }: { children: ReactNode[] }) => {
      return (
        <TestingProvider>
          <TestingRouter initialEntries={['']}>
            <ThemeChangerer
              paginationRowHeight={paginationRowHeight}
              dataRowHeight={dataRowHeight}
              headerRowHeight={headerRowHeight}
              footerHeight={footerHeight}
              saveButtonRowHeight={saveButtonRowHeight}
            >
              {children}
            </ThemeChangerer>
          </TestingRouter>
        </TestingProvider>
      );
    };

  it('Returns the correct value initially', () => {
    window.resizeTo(1000, 1000);
    const { result } = renderHook(useRowRenderCount, { wrapper: getWrapper() });

    // The window has a height of 1000. header 0, pagination row 0, footer 0, Rows 10 each.
    expect(result.current).toBe(100);
  });

  it('Returns the correct value when there is a header', () => {
    window.resizeTo(1000, 1000);
    const { result } = renderHook(useRowRenderCount, {
      wrapper: getWrapper(10, 10),
    });

    // The window has a height of 1000. header 10, pagination row 0, Rows 10 each.
    expect(result.current).toBe(99);
  });

  it('Returns the correct value when there is a header and pagination row', () => {
    window.resizeTo(1000, 1000);
    const { result } = renderHook(useRowRenderCount, {
      wrapper: getWrapper(10, 10, 10),
    });

    // The window has a height of 1000. header 10, pagination 10, rows 10 each.
    expect(result.current).toBe(98);
  });

  it('Returns the correct value when there is a header, pagination row and footer', () => {
    window.resizeTo(1000, 1000);
    const { result } = renderHook(useRowRenderCount, {
      wrapper: getWrapper(10, 10, 10, 10),
    });

    // The window has a height of 1000. header 10, pagination 10, footer 10 and rows 10 each.
    expect(result.current).toBe(97);
  });

  it('Returns the correct value when there is a header and pagination row', () => {
    window.resizeTo(1000, 1000);

    const Wrapper = getWrapper();

    const WithAppBar: FC = ({ children }) => {
      return (
        <Wrapper>
          <AppBar />
          {children}
        </Wrapper>
      );
    };

    const { result } = renderHook(useRowRenderCount, {
      wrapper: WithAppBar,
    });

    waitFor(() => {
      act(() => {
        useAppBarRectStore.getState().setAppBarRect({
          height: 10,
          width: 0,
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          x: 0,
          y: 0,
          toJSON: jest.fn(),
        });
      });
    });

    // Window 1000, AppBar 10, header 0, pagination row, 0 and each row 10
    expect(result.current).toBe(99);
  });
});
