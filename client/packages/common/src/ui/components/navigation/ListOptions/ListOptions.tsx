import {
  List,
  ListItemIcon,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from '@mui/material';
import React from 'react';

export type ListOptionValues = {
  id: string;
  value: string;
};

interface ListProps {
  startIcon?: JSX.Element;
  onClick: (id: string) => void;
  options: ListOptionValues[];
  endIcon?: JSX.Element;
  currentId?: string;
  enteredLineIds?: string[];
}

export const ListOptions = ({
  startIcon,
  onClick,
  options,
  endIcon,
  currentId,
  enteredLineIds,
}: ListProps) => {
  return (
    <List sx={{ padding: 0 }}>
      {options?.map((option, _) => (
        <React.Fragment key={option.id}>
          <ListItem
            sx={{ padding: '5px 0px' }}
            onClick={() => onClick(option.id)}
          >
            <ListItemIcon sx={{ padding: 0, minWidth: 25 }}>
              {enteredLineIds?.includes(option.id) ? (
                startIcon
              ) : (
                <Box style={{ visibility: 'hidden' }}>{startIcon}</Box>
              )}
            </ListItemIcon>
            <ListItemText
              primary={option.value}
              sx={{ margin: 0, padding: 0 }}
            />
            <ListItemIcon sx={{ padding: 0, minWidth: 15 }}>
              {option.id === currentId ? (
                endIcon
              ) : (
                <Box style={{ visibility: 'hidden' }}>{endIcon}</Box>
              )}
            </ListItemIcon>
          </ListItem>
          <Divider component="li" />
        </React.Fragment>
      ))}
    </List>
  );
};
