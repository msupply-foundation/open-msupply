import { Box, styled } from '@material-ui/system';
import { Portal } from '@material-ui/core';
import React, { FC } from 'react';
import { useHostContext } from '../../../hooks';

// TODO: Create a function which creates the two below components?
// createPortalPair(refName) => { Container, Portal }
// we seem to be using this pattern a bit

const Container = styled('div')({
  display: 'flex',
  flex: 1,
  justifyContent: 'flex-end',
});

// TODO: Some sort of registry/state to ensure that there is only one of these
// mounted at any one time as mounting this in multiple locations would cause
// some pretty weird behaviour
export const AppBarContent: FC = () => {
  const { appBarContentRef } = useHostContext();

  return <Container ref={appBarContentRef} />;
};

export const AppBarContentPortal: FC = props => {
  const { appBarContentRef } = useHostContext();

  return (
    <Portal container={appBarContentRef.current}>
      <Box {...props} />
    </Portal>
  );
};
