import { useWindowDimensions } from '@common/hooks';
import { CheckIcon, ChevronDownIcon } from '@common/icons';
import {
  List,
  ListItemIcon,
  ListItem,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import React from 'react';

export type ListOptionValues = {
  id: string;
  value: string;
};

interface ListProps {
  onClick: (id: string) => void;
  options: ListOptionValues[];
  currentId?: string;
  enteredLineIds?: string[];
}

export const ListOptions = ({
  onClick,
  options,
  currentId,
  enteredLineIds,
}: ListProps) => {
  const { height } = useWindowDimensions();
  const startIcon = (
    <CheckIcon
      style={{
        backgroundColor: '#33A901',
        borderRadius: '50%',
        padding: '2px',
        color: 'white',
        height: 18,
        width: 18,
      }}
    />
  );

  const endIcon = (
    <ChevronDownIcon
      style={{ width: 17, height: 17, transform: 'rotate(-90deg)' }}
    />
  );

  return (
    <List
      sx={{
        padding: 0,
        maxHeight: height * 0.6,
        overflow: 'auto',
        scrollBehavior: 'smooth',
        // position: 'fixed',
      }}
    >
      {options?.map((option, _) => (
        <React.Fragment key={option.id}>
          <ListItem
            sx={{ padding: '5px 0px', cursor: 'pointer' }}
            onClick={() => onClick(option.id)}
            ref={
              option.id === currentId
                ? l =>
                    l?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                : null
            }
          >
            <ListItemIcon sx={{ padding: 0, minWidth: 25 }}>
              <Box
                style={{
                  visibility: enteredLineIds?.includes(option.id)
                    ? 'visible'
                    : 'hidden',
                }}
              >
                {startIcon}
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  style={{
                    fontWeight: option.id === currentId ? 'bold' : 'normal',
                  }}
                >
                  {option.value}
                </Typography>
              }
              sx={{ margin: 0, padding: 0 }}
            />
            <ListItemIcon sx={{ padding: 0, minWidth: 15 }}>
              <Box
                style={{
                  visibility: option.id === currentId ? 'visible' : 'hidden',
                }}
              >
                {endIcon}
              </Box>
            </ListItemIcon>
          </ListItem>
          <Divider component="li" />
        </React.Fragment>
      ))}
    </List>
  );
};
