import React, { FC } from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  ListItemProps,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMatch, Link } from 'react-router-dom';
import { useDrawer } from '@common/hooks';

const useSelectedNavMenuItem = (to: string, end: boolean): boolean => {
  // This nav menu item should be selected when lower level elements
  // are selected. For example, the route /outbound-shipment/{id} should
  // highlight the nav menu item for outbound-shipments.
  const highlightLowerLevels = !end || to.endsWith('*');
  // If we need to highlight the higher levels append a wildcard to the match path.
  const path = highlightLowerLevels ? to : `${to}/*`;
  const selected = useMatch({ path });
  return !!selected;
};

const getListItemCommonStyles = () => ({
  height: 40,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
});

const StyledListItem = styled<
  FC<ListItemProps & { isSelected: boolean; to: string }>
>(ListItem, {
  shouldForwardProp: prop => prop !== 'isSelected',
})(({ theme, isSelected }) => ({
  ...getListItemCommonStyles(),
  backgroundColor: isSelected
    ? theme.mixins.drawer.selectedBackgroundColor
    : 'transparent',
  boxShadow: isSelected ? theme.shadows[3] : 'none',
  marginTop: 5,
  '&:hover': {
    boxShadow: theme.shadows[8],
  },
}));

export interface AppNavLinkProps {
  end?: boolean; // denotes lowest level menu item, using terminology from useMatch
  icon?: JSX.Element;
  inactive?: boolean;
  text?: string;
  to: string;
  onClick?: () => void;
}

export const AppNavLink: FC<AppNavLinkProps> = props => {
  const {
    end,
    inactive,
    icon = <span style={{ width: 2 }} />,
    text,
    to,
    onClick,
  } = props;
  const drawer = useDrawer();

  const selected = useSelectedNavMenuItem(to, !!end);

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) =>
        !end && !!inactive ? (
          <span
            {...linkProps}
            onClick={expandChildren}
            data-testid={`${to}_hover`}
          />
        ) : (
          <Link
            {...linkProps}
            ref={ref}
            to={to}
            role="link"
            aria-label={text}
            title={text}
            onClick={onClick}
          />
        )
      ),
    [to]
  );

  const expandChildren = () => {
    drawer.setHoverOpen(true);
    drawer.open();
    drawer.setClickedNavPath(to);
  };

  return (
    <StyledListItem isSelected={selected} to={to}>
      <ListItemButton
        sx={{
          ...getListItemCommonStyles(),
          '&.MuiListItemButton-root:hover': {
            backgroundColor: 'transparent',
          },
          '& .MuiTypography-root': {
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          },
        }}
        disableGutters
        component={CustomLink}
      >
        <ListItemIcon sx={{ minWidth: 20 }}>{icon}</ListItemIcon>
        <Box className="navLinkText">
          <Box width={10} />
          <ListItemText primary={text} />
        </Box>
      </ListItemButton>
    </StyledListItem>
  );
};
