import React, { ReactElement, useEffect, useState } from 'react';
import {
  ConnectionResult,
  DEFAULT_LOCAL_SERVER,
  FrontEndHost,
  frontEndHostDisplay,
  useNativeClient,
  useNotification,
} from '@common/hooks';
import { useTranslation } from '@common/intl';
import { BaseButton, BasicTextInput } from '@common/components';
import { Box } from '@mui/material';

type ConnectToServer = ReturnType<typeof useNativeClient>['connectToServer'];

interface ManualServerConfigProps {
  connect: ConnectToServer;
  previousServer: FrontEndHost | null;
}

export function ManualServerConfig({
  connect,
  previousServer,
}: ManualServerConfigProps): ReactElement {
  const t = useTranslation();
  const { error } = useNotification();
  const [serverValue, setServerValue] = useState<string>();

  const defaultServer: FrontEndHost = {
    ...DEFAULT_LOCAL_SERVER,
    protocol: 'http',
    path: 'login',
  };

  useEffect(() => {
    if (previousServer != null) {
      setServerValue(frontEndHostDisplay(previousServer));
    } else {
      setServerValue(frontEndHostDisplay(defaultServer));
    }
  }, [previousServer]);

  async function handleConnectionResult(
    result: ConnectionResult
  ): Promise<void> {
    if (result.success) return;
    error(t('error.connection-error'))();
    console.error(result.error);
  }

  async function handleServerClick(): Promise<void> {
    const serverConfig: FrontEndHost =
      previousServer != null ? previousServer : defaultServer;
    try {
      const result = await connect(serverConfig);
      await handleConnectionResult(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      await handleConnectionResult({ success: false, error: errorMessage });
    }
  }

  return (
    <Box
      pb={2}
      gap={2}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <BasicTextInput
        value={serverValue}
        onChange={e => setServerValue(e.target.value)}
      />
      <BaseButton size="small" onClick={handleServerClick}>
        {t('button.connect')}
      </BaseButton>
    </Box>
  );
}
