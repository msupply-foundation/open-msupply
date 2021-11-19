import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button as MuiButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DefaultButtonStyles } from './styles';

interface NavigationButtonProps {
  icon: React.ReactNode;
  label: string;
  to: string;
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  ...DefaultButtonStyles,
  boxShadow: theme.shadows[2],
  color: theme.palette.primary.main,
  minWidth: 115,
}));

export const NavigationButton: FC<NavigationButtonProps> = props => {
  const { icon, label, to } = props;
  const navigate = useNavigate();

  return (
    <StyledButton
      onClick={() => navigate(to)}
      startIcon={icon}
      variant="contained"
    >
      {label}
    </StyledButton>
  );
};
