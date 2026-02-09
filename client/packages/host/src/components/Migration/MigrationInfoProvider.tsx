import React, { useState } from 'react';
import {
  Box,
  RandomLoader,
  useMigrationStatus,
} from '@openmsupply-client/common';
import { MigrationStatusIndicator } from './MigrationStatusIndicator';

export const MigrationInfoProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [isComplete, setIsComplete] = useState(false);

  // Poll every second until migrations are complete, then stop polling
  const migrationData = useMigrationStatus(isComplete ? 0 : 1000, true);

  if (migrationData?.data?.inProgress) {
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
        <MigrationStatusIndicator
          version={migrationData.data.version ?? undefined}
        />
      </Box>
    );
  }

  // Migrations complete - stop polling and show children
  if (!isComplete) {
    setIsComplete(true);
  }

  return <>{children}</>;
};
