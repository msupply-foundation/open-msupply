import React, { useState } from 'react';
import {
  Box,
  RandomLoader,
  useMigrationStatus,
} from '@openmsupply-client/common';
import { MigrationStatusIndicator } from './MigrationStatusIndicator';
import { ConnectionLostPage } from './ConnectionLostPage';

export const MigrationInfoProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [isComplete, setIsComplete] = useState(false);

  // Poll every second until migrations are complete, then stop polling
  const { inProgress, connectionLost } = useMigrationStatus(
    isComplete ? 0 : 1000
  );

  // Bootstrap query failed with a NetworkError. Render a dedicated
  // gate rather than letting the rest of the tree mount — child
  // queries would hit the same wall and present a confusing mixture
  // of stale/empty data + banners. Other error classes (auth, 5xx)
  // are not gated since they shouldn't happen for this public query.
  if (connectionLost) {
    return <ConnectionLostPage />;
  }

  if (inProgress) {
    // Migrations are in progress - show migration message
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        flexDirection="column"
        gap={2}
      >
        <RandomLoader />
        <MigrationStatusIndicator />
      </Box>
    );
  }

  // Migrations complete - stop polling and show children
  if (!isComplete) {
    setIsComplete(true);
  }

  return <>{children}</>;
};
