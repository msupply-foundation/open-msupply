import { useTheme } from '../../styles';
import { useWindowDimensions } from '../useWindowDimensions';
import { useAppBarRectStore } from '../useAppBarRect';

export const useRowRenderCount = (): number => {
  const { height } = useAppBarRectStore();
  const { height: windowHeight } = useWindowDimensions();
  const theme = useTheme();
  const { mixins } = theme;

  const dataRowHeight = mixins.table.dataRow.height;
  const headerRowHeight = mixins.table.headerRow.height;
  const paginationRowHeight = mixins.table.paginationRow.height;

  const numberOfRowsToRender = Math.floor(
    (windowHeight - (height ?? 0) - headerRowHeight - paginationRowHeight) /
      dataRowHeight
  );

  return numberOfRowsToRender;
};
