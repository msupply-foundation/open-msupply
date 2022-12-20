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
import { ExternalLinkIcon } from '@common/icons';

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
  trustedSite?: boolean; // only set this if you trust the destination site, eg is a site which you control
}

export const ExternalNavLink: FC<ExternalNavLinkProps> = props => {
  const { icon = <span style={{ width: 2 }} />, text, to, trustedSite } = props;

  const CustomLink = React.useMemo(
    () =>
      React.forwardRef<HTMLAnchorElement>((linkProps, ref) => (
        // rel should be set to 'noreferrer' when target="_blank", due to a security risk in older browsers
        // eslint-disable-next-line react/jsx-no-target-blank
        <a
          {...linkProps}
          ref={ref}
          href={to}
          role="link"
          aria-label={text}
          title={text}
          target="_blank"
          rel={trustedSite ? 'noopener' : 'noreferrer'}
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
            <ListItemText
              primary={
                <>
                  {text}
                  <sup>
                    <ExternalLinkIcon
                      sx={{
                        height: '16px',
                        marginLeft: 2,
                        stroke: theme => theme.palette.gray.main,
                        strokeWidth: '1px',
                        width: '16px',
                      }}
                    />
                  </sup>
                </>
              }
            />
          </Box>
        </ListItemButton>
      </StyledListItem>
    </Tooltip>
  );
};
