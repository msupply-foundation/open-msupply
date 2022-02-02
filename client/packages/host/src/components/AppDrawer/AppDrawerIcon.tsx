import React from 'react';
import {
  MSupplyGuy,
  useDrawer,
  useLocalStorage,
  useTheme,
} from '@openmsupply-client/common';

export const AppDrawerIcon: React.FC = () => {
  const drawer = useDrawer();
  const theme = useTheme();
  const [customLogo] = useLocalStorage('/theme/logo');

  if (!customLogo)
    return <MSupplyGuy size={drawer.isOpen ? 'large' : 'medium'} />;

  const matches = customLogo.match(/<svg([^>]*)>([\w\W]*)<\/svg>/i);
  if (matches?.length || 0 > 2) {
    const paths = matches?.[2] || '';
    const viewBox = (matches?.[1] || '').match(/viewBox=['"]([^'"]+)['"]/i);
    const style = drawer.isOpen
      ? { paddingTop: 20, width: 64 }
      : { width: 30, fill: theme.mixins.drawer?.iconColor };

    return viewBox && viewBox.length > 1 ? (
      <svg
        dangerouslySetInnerHTML={{ __html: paths }}
        viewBox={viewBox[1]}
        style={style}
      />
    ) : (
      <svg dangerouslySetInnerHTML={{ __html: customLogo }} style={style} />
    );
  }
  return null;
};
