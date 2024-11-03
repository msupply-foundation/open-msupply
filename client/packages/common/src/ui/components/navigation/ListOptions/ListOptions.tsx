import {
  List,
  ListItemIcon,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from '@mui/material';
import React, { useState } from 'react';

export type ListOptionValues = {
  id: string;
  value: string;
};

interface ListProps {
  startIcon?: JSX.Element;
  onClick: (id: string) => void;
  options: ListOptionValues[];
  endIcon?: JSX.Element;
}

export const ListOptions = ({
  startIcon,
  onClick,
  options,
  endIcon,
}: ListProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setSelectedId(id);
    onClick(id);
  };

  return (
    <List sx={{ padding: 0 }}>
      {options?.map((option, _) => (
        <React.Fragment key={option.id}>
          <ListItem
            sx={{ padding: '5px 0px' }}
            onClick={() => handleClick(option.id)}
          >
            <ListItemIcon sx={{ padding: 0, minWidth: 25 }}>
              {startIcon}
            </ListItemIcon>
            <ListItemText
              primary={option.value}
              sx={{ margin: 0, padding: 0 }}
            />
            <ListItemIcon sx={{ padding: 0, minWidth: 15 }}>
              {selectedId === option.id ? (
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
