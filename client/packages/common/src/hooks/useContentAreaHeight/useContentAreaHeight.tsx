import { useAppBarRectStore, useWindowDimensions } from '..';
import { useAppTheme } from '../../styles';

export const useContentAreaHeight = (): number => {
  const { height: appBarHeight } = useAppBarRectStore();
  const { height: windowHeight } = useWindowDimensions();
  const theme = useAppTheme();
  const { mixins } = theme;

  const pageFooterHeight = mixins.footer.height;

  const contentAreaHeight =
    windowHeight - (appBarHeight ?? 0) - pageFooterHeight;

  return contentAreaHeight;
};
