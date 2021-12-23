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

const getListItemCommonStyles = () => ({
  height: 40,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
});

const StyledListItem = styled<FC<ListItemProps & { to: string }>>(ListItem)(
  ({ theme }) => ({
    ...getListItemCommonStyles(),
    backgroundColor: 'transparent',
    boxShadow: 'none',
    marginTop: 5,
    '&:hover': {
      boxShadow: theme.shadows[8],
    },
  })
);

export interface ExternalNavLinkProps {
  icon?: JSX.Element;
  text?: string;
  to: string;
}

export const ExternalNavLink: FC<ExternalNavLinkProps> = props => {
  const { icon = <span style={{ width: 2 }} />, text, to } = props;

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) => (
        <a
          {...linkProps}
          ref={ref}
          href={to}
          role="link"
          aria-label={text}
          title={text}
        />
      )),
    [to]
  );

  return (
    <Tooltip title={text || ''}>
      <StyledListItem to={to}>
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
