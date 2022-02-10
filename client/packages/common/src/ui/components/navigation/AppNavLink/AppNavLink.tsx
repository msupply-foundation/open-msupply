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
import { useDrawer, useDebounceCallback } from '@common/hooks';

const HOVER_DEBOUNCE_TIME = 500;
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
  expandOnHover?: boolean;
  text?: string;
  to: string;
  onClick?: () => void;
}

export const AppNavLink: FC<AppNavLinkProps> = props => {
  const {
    end,
    icon = <span style={{ width: 2 }} />,
    expandOnHover,
    text,
    to,
    onClick,
  } = props;
  const drawer = useDrawer();

  const selected = useSelectedNavMenuItem(to, !!end);
  const debouncedClearHoverActive = useDebounceCallback(
    drawer.clearHoverActive,
    [],
    HOVER_DEBOUNCE_TIME + 50
  );

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) =>
        expandOnHover && !end ? (
          <span
            {...linkProps}
            onClick={onHoverOver}
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
            onClick={onClick || debouncedClearHoverActive}
          />
        )
      ),
    [to]
  );

  const debouncedHoverActive = useDebounceCallback(
    drawer.setHoverActive,
    [],
    HOVER_DEBOUNCE_TIME
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
      drawer.clearHoverActive();
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
    </Tooltip>
  );
};
