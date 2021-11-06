import React, { FC } from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  ListItemButton,
  Box,
  ListItemProps,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMatch, Link } from 'react-router-dom';
import { useDrawer } from '../../../../hooks/useDrawer';
import { useDebounceCallback } from '../../../..';

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

const getListItemCommonStyles = (isOpen: boolean) => ({
  height: 40,
  borderRadius: 20,
  width: isOpen ? 200 : 40,
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
  boxShadow: isSelected ? theme.shadows[3] : 'none',
  marginTop: 5,
  '&:hover': {
    boxShadow: theme.shadows[8],
  },
}));

export interface NavLinkProps {
  end?: boolean; // denotes lowest level menu item, using terminology from useMatch
  icon?: JSX.Element;
  expandOnHover?: boolean;
  text?: string;
  to: string;
}

export const NavLink: FC<NavLinkProps> = props => {
  const {
    end,
    icon = <span style={{ width: 2 }} />,
    expandOnHover,
    text,
    to,
  } = props;
  const drawer = useDrawer();
  const selected = useSelectedNavMenuItem(to, !!end);

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) =>
        expandOnHover && !end ? (
          <span
            {...linkProps}
            onClick={drawer.open}
            data-testid={`${to}_hover`}
          />
        ) : (
          <Link
            {...linkProps}
            ref={ref}
            to={to}
            role="link"
            aria-label={text}
          />
        )
      ),
    [to]
  );

  const debouncedHoverActive = useDebounceCallback(
    drawer.setHoverActive,
    [],
    300
  );

  const onHoverOver = () => {
    if (expandOnHover) {
      drawer.setHoverActive(to, true);
      if (!drawer.isOpen) {
        drawer.open();
        drawer.setHoverOpen(true);
      }
    }
  };

  const onHoverOut = () => {
    if (expandOnHover) {
      debouncedHoverActive(to, false);
    }
  };

  React.useEffect(() => {
    const isActive = Object.values(drawer.hoverActive).some(active => active);
    if (drawer.hoverOpen && !isActive) {
      drawer.close();
      drawer.setHoverOpen(false);
    }
  }, [drawer.hoverActive]);

  return (
    <Tooltip
      disableHoverListener={drawer.isOpen && !expandOnHover}
      title={text || ''}
      onClose={onHoverOut}
      onOpen={onHoverOver}
      PopperProps={expandOnHover ? { style: { display: 'none' } } : {}}
    >
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
