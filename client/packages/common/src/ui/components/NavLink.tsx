import React, { FC } from 'react';

import {
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  ListItemButton,
  Box,
} from '@material-ui/core';
import { useMatch, Link } from 'react-router-dom';
import { useDrawer } from '../../hooks/useDrawer';
import { styled } from '@material-ui/core/styles';
import { ListItemProps } from 'material-ui';

const useSelectedNavMenuItem = (to: string, end: boolean): boolean => {
  // This nav menu item should be selected when lower level elements
  // are selected. For example, the route /customer-invoices/{id} should
  // highlight the nav menu item for customer-invoices.
  const highlightLowerLevels = !end || to.endsWith('*');
  // If we need to highlight the higher levels append a wildcard to the match path.
  const path = highlightLowerLevels ? to : `${to}/*`;
  const selected = useMatch({ path });
  return !!selected;
};

const getListItemCommonStyles = (isOpen: boolean) => ({
  height: 40,
  borderRadius: 20,
  width: isOpen ? 160 : 40,
  justifyContent: 'center',
  alignItems: 'center',
});

const StyledListItem = styled<
  FC<ListItemProps & { isOpen: boolean; isSelected: boolean; to: string }>
>(ListItem, {
  shouldForwardProp: prop => prop !== 'isSelected' && prop !== 'isOpen',
})(({ theme, isOpen, isSelected }) => ({
  ...getListItemCommonStyles(isOpen),
  backgroundColor: isSelected ? theme.palette.background.white : 'transparent',
  boxShadow: isSelected ? theme.shadows[2] : 'none',
  marginTop: 5,
  '&:hover': {
    boxShadow: theme.shadows[8],
  },
}));

interface ListItemLinkProps {
  end?: boolean; // denotes lowest level menu item, using terminology from useMatch
  icon?: JSX.Element;
  text?: string;
  to: string;
}

export const AppNavLink: FC<ListItemLinkProps> = props => {
  const { end, icon = <span style={{ width: 2 }} />, text, to } = props;
  const drawer = useDrawer();
  const selected = useSelectedNavMenuItem(to, !!end);

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) => (
        <Link ref={ref} to={to} {...linkProps} />
      )),
    [to]
  );

  return (
    <Tooltip disableHoverListener={drawer.isOpen} title={text || ''}>
      <StyledListItem isOpen={drawer.isOpen} isSelected={selected} to={to}>
        <ListItemButton
          sx={{
            ...getListItemCommonStyles(drawer.isOpen),
            '&.MuiListItemButton-root:hover': {
              backgroundColor: 'transparent',
            },
          }}
          disableGutters
          component={CustomLink}
        >
          <ListItemIcon sx={{ minWidth: 20 }}>{icon}</ListItemIcon>
          {drawer.isOpen && <Box width={10} />}
          {drawer.isOpen && <ListItemText primary={text} />}
        </ListItemButton>
      </StyledListItem>
    </Tooltip>
  );
};
