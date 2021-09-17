// import React, { FC, ReactNode } from 'react';
// import { renderHook } from '@testing-library/react-hooks';
// import { TestingProvider } from '../../utils/testing';
// import { useListData } from './useListData';
// import { useTheme } from '../../styles';

// type ThemeChangererProps = {
//   paginationRowHeight: number;
//   dataRowHeight: number;
//   headerRowHeight: number;
// };
// describe('useListViewData', () => {
//   const ThemeChangerer: FC<ThemeChangererProps> = ({
//     children,
//     paginationRowHeight,
//     dataRowHeight,
//     headerRowHeight,
//   }) => {
//     const theme = useTheme();
//     theme.mixins.table.dataRow = { height: dataRowHeight };
//     theme.mixins.table.paginationRow = { height: paginationRowHeight };
//     theme.mixins.table.headerRow = { height: headerRowHeight };

//     return <>{children}</>;
//   };

//   const getWrapper =
//     (dataRowHeight = 10, headerRowHeight = 0, paginationRowHeight = 0) =>
//     ({ children }: { children: ReactNode[] }) => {
//       return (
//         <TestingProvider>
//           <ThemeChangerer
//             paginationRowHeight={paginationRowHeight}
//             dataRowHeight={dataRowHeight}
//             headerRowHeight={headerRowHeight}
//           >
//             {children}
//           </ThemeChangerer>
//         </TestingProvider>
//       );
//     };

//   it('returns the correct first', () => {
//     window.resizeTo(1000, 1000);
//     const { result } = renderHook(useListData, { wrapper: getWrapper() });

//     expect(result.current).toBe(100);
//   });
// });
