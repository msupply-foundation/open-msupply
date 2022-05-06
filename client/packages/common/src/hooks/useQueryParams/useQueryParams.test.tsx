// import React, { FC, PropsWithChildren, ReactNode } from 'react';
// import { TestingRouterContext } from '@openmsupply-client/common';
// import { TestingProvider } from '../../utils/testing';
// import { useTheme } from '@common/styles';
// import { renderHook } from '@testing-library/react';
// import { useQueryParams } from './useQueryParams';

// type TestSortBy = {
//   id: string;
//   quantity: number;
// };

// type ThemeChangererProps = {
//   paginationRowHeight: number;
//   dataRowHeight: number;
//   headerRowHeight: number;
//   footerHeight: number;
//   saveButtonRowHeight: number;
// };

// describe('useQueryParams', () => {
//   beforeEach(() => {
//     jest.useFakeTimers();
//   });

//   const ThemeChangerer: FC<PropsWithChildren<ThemeChangererProps>> = ({
//     children,
//     paginationRowHeight,
//     dataRowHeight,
//     headerRowHeight,
//     footerHeight,
//     saveButtonRowHeight,
//   }) => {
//     const theme = useTheme();
//     theme.mixins.table.dataRow = { height: dataRowHeight };
//     theme.mixins.table.paginationRow = { height: paginationRowHeight };
//     theme.mixins.table.headerRow = { height: headerRowHeight };
//     theme.mixins.footer = { height: footerHeight };
//     theme.mixins.saveButtonRow = { height: saveButtonRowHeight };

//     return <>{children}</>;
//   };

//   const getWrapper =
//     (
//       dataRowHeight = 10,
//       headerRowHeight = 0,
//       paginationRowHeight = 0,
//       footerHeight = 0,
//       saveButtonRowHeight = 0
//     ) =>
//     ({ children }: { children: ReactNode }) => {
//       return (
//         <TestingProvider>
//           <TestingRouterContext>
//             <ThemeChangerer
//               paginationRowHeight={paginationRowHeight}
//               dataRowHeight={dataRowHeight}
//               headerRowHeight={headerRowHeight}
//               footerHeight={footerHeight}
//               saveButtonRowHeight={saveButtonRowHeight}
//             >
//               {children}
//             </ThemeChangerer>
//           </TestingRouterContext>
//         </TestingProvider>
//       );
//     };

//   it('Returns the correct initial state', () => {
//     window.resizeTo(1000, 1000);

//     const { result } = renderHook(
//       () => useQueryParams<TestSortBy>({ initialSortBy: { key: 'id' } }),
//       {
//         wrapper: getWrapper(),
//       }
//     );

//     expect(result.current).toEqual(
//       expect.objectContaining({
//         sortBy: { key: 'id', isDesc: false, direction: 'asc' },
//         pagination: expect.objectContaining({ page: 0, offset: 0, first: 20 }),
//         page: 0,
//         offset: 0,
//         first: 20,
//       })
//     );
//   });
// });

// describe('useFilterBy', () => {
//   it('returns the correct initial state', () => {
//     const { result } = renderHook(() =>
//       useFilterBy({
//         comment: { equalTo: 'a' },
//         allocatedDatetime: { equalTo: '1/1/2020' },
//       })
//     );

//     expect(result.current.filterBy).toEqual({
//       comment: { equalTo: 'a' },
//       allocatedDatetime: { equalTo: '1/1/2020' },
//     });
//   });

//   it('updates date filter values', () => {
//     const { result } = renderHook(() =>
//       useFilterBy({
//         comment: { equalTo: 'a' },
//         allocatedDatetime: { equalTo: '1/1/2020' },
//       })
//     );

//     const now = new Date();

//     act(() => {
//       result.current.onChangeDateFilterRule(
//         'allocatedDatetime',
//         'beforeOrEqualTo',
//         now
//       );
//     });

//     expect(
//       result.current.filterBy?.['allocatedDatetime']?.beforeOrEqualTo
//     ).toEqual(now);
//   });

//   it('updates date filters', () => {
//     const { result } = renderHook(() =>
//       useFilterBy({
//         comment: { equalTo: 'a' },
//         allocatedDatetime: { equalTo: '1/1/2020' },
//       })
//     );

//     const now = new Date();

//     act(() => {
//       result.current.onChangeDateFilterRule(
//         'allocatedDatetime',
//         'beforeOrEqualTo',
//         now
//       );
//     });

//     expect(result.current.filterBy).toEqual({
//       comment: { equalTo: 'a' },
//       allocatedDatetime: { beforeOrEqualTo: now },
//     });
//   });

//   it('updates string filter values', () => {
//     const { result } = renderHook(() =>
//       useFilterBy({ comment: { equalTo: 'a' } })
//     );

//     act(() => {
//       result.current.onChangeStringFilterRule('comment', 'equalTo', 'josh');
//     });

//     expect(result.current.filterBy?.['comment']?.equalTo).toEqual('josh');
//   });

//   it('updates string filters', () => {
//     const { result } = renderHook(() =>
//       useFilterBy({
//         comment: { equalTo: 'a' },
//         allocatedDatetime: { equalTo: '1/1/2020' },
//       })
//     );

//     act(() => {
//       result.current.onChangeStringFilterRule('comment', 'like', 'josh');
//     });

//     expect(result.current.filterBy).toEqual({
//       comment: { like: 'josh' },
//       allocatedDatetime: { equalTo: '1/1/2020' },
//     });
//   });

//   it('clears string filters', () => {
//     const { result } = renderHook(() =>
//       useFilterBy({
//         comment: { equalTo: 'a' },
//         allocatedDatetime: { equalTo: '1/1/2020' },
//       })
//     );

//     act(() => {
//       result.current.onClearFilterRule('comment');
//     });

//     expect(result.current.filterBy).toEqual({
//       allocatedDatetime: { equalTo: '1/1/2020' },
//     });
//   });
// });

// interface TestSortBy {
//   id: string;
//   quantity: number;
// }

// describe('useSortBy', () => {
//   it('Has the correct initial value', () => {
//     const idColumn = createColumnWithDefaults<TestSortBy>({ key: 'id' });
//     const { result } = renderHook(() => useSortBy<TestSortBy>(idColumn), {
//       wrapper: TestingRouterContext,
//     });

//     expect(result.current.sortBy).toEqual({
//       key: 'id',
//       isDesc: false,
//       direction: 'asc',
//     });
//   });

//   it('has the correct values after triggering a sort by', () => {
//     const quantityColumn = createColumnWithDefaults<TestSortBy>({
//       key: 'quantity',
//     });
//     const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }), {
//       wrapper: TestingRouterContext,
//     });

//     act(() => {
//       result.current.onChangeSortBy(quantityColumn);
//     });

//     expect(result.current.sortBy).toEqual({
//       key: 'quantity',
//       isDesc: false,
//       direction: 'asc',
//     });
//   });

//   it('has the correct values after triggering a sort by for the same column that is set', () => {
//     const idColumn = createColumnWithDefaults<TestSortBy>({ key: 'id' });
//     const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }), {
//       wrapper: TestingRouterContext,
//     });

//     act(() => {
//       result.current.onChangeSortBy(idColumn);
//     });

//     expect(result.current.sortBy).toEqual({
//       key: 'id',
//       isDesc: true,
//       direction: 'desc',
//     });
//   });

//   it('has the correct values after triggering a few sort bys in sequence', () => {
//     const idColumn = createColumnWithDefaults<TestSortBy>({ key: 'id' });
//     const quantityColumn = createColumnWithDefaults<TestSortBy>({
//       key: 'quantity',
//     });
//     const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }), {
//       wrapper: TestingRouterContext,
//     });

//     act(() => {
//       // initially: id/asc
//       result.current.onChangeSortBy(idColumn);
//       // should be: id/desc
//       result.current.onChangeSortBy(idColumn);
//       // should be: quantity/asc
//       result.current.onChangeSortBy(quantityColumn);
//       // should be: id/asc
//       result.current.onChangeSortBy(idColumn);
//       // should be: quantity/asc
//       result.current.onChangeSortBy(quantityColumn);
//       // should be: quantity/desc
//       result.current.onChangeSortBy(quantityColumn);
//     });

//     expect(result.current.sortBy).toEqual({
//       key: 'quantity',
//       isDesc: true,
//       direction: 'desc',
//     });
//   });
// });

// describe('usePagination', () => {
//   it('has first correctly set to the initial value passed', () => {
//     const { result } = renderHook(() => usePagination(10), {
//       wrapper: TestingRouterContext,
//     });

//     expect(result.current.first).toEqual(10);
//   });

//   it('has correct offset, first and page values When the page is changed', () => {
//     const { result } = renderHook(() => usePagination(10), {
//       wrapper: TestingRouterContext,
//     });

//     act(() => {
//       result.current.onChangePage(3);
//     });

//     expect(result.current.offset).toEqual(30);
//     expect(result.current.first).toEqual(10);
//     expect(result.current.page).toEqual(3);
//   });

//   it('still has correct state after a series of page changes', () => {
//     const { result } = renderHook(() => usePagination(10), {
//       wrapper: TestingRouterContext,
//     });

//     act(() => {
//       result.current.onChangePage(3);
//       result.current.onChangePage(1);
//       result.current.onChangePage(99);
//       result.current.onChangePage(32);
//       result.current.onChangePage(7);
//     });

//     expect(result.current.offset).toEqual(70);
//     expect(result.current.first).toEqual(10);
//     expect(result.current.page).toEqual(7);
//   });
// });
