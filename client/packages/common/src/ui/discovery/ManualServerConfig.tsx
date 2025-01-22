import React, { ReactElement, useEffect, useState } from 'react';
import {
  ConnectionResult,
  FrontEndHost,
  frontEndHostDisplay,
  useNativeClient,
  useNotification,
} from '@common/hooks';
import { useTranslation } from '@common/intl';
import { BaseButton, BasicTextInput } from '@common/components';
import { Box } from '@mui/material';
import { FnUtils } from '@common/utils';

const DEFAULT_SERVER = 'http://127.0.0.1:8000';

type ConnectToServer = ReturnType<typeof useNativeClient>['connectToServer'];

interface ManualServerConfigProps {
  connectToServer: ConnectToServer;
  previousServer: FrontEndHost | null;
}

interface ParsedServer {
  protocol: 'https' | 'http';
  ip: string;
  port: number;
}

export function ManualServerConfig({
  connectToServer,
  previousServer,
}: ManualServerConfigProps): ReactElement {
  const t = useTranslation();
  const { error } = useNotification();
  const [serverURL, setServerURL] = useState<string>();

  useEffect(() => {
    if (previousServer != null) {
      setServerURL(frontEndHostDisplay(previousServer));
    } else {
      setServerURL(DEFAULT_SERVER);
    }
  }, [previousServer]);

  function parseServerURL(value: string): ParsedServer | null {
    try {
      const url = new URL(value);
      return {
        protocol: url.protocol.replace(':', '') as 'https' | 'http',
        ip: url.hostname,
        port: Number(url.port),
      };
    } catch (e) {
      console.error('Invalid server URL');
      return null;
    }
  }

  async function handleConnectionResult(
    result: ConnectionResult
  ): Promise<void> {
    if (result.success) return;
    error(t('error.connection-error'))();
    console.error(result.error);
  }

  async function handleServerClick(): Promise<void> {
    if (!serverURL) return;
    const parsedServerDetails = parseServerURL(serverURL);
    if (!parsedServerDetails) return;

    const serverConfig: FrontEndHost = {
      ...parsedServerDetails,
      path: 'login',
      isLocal: true,
      clientVersion: 'unspecified',
      hardwareId: FnUtils.generateUUID(),
    };

    try {
      const result = await connectToServer(serverConfig);
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
        value={serverURL}
        onChange={e => setServerURL(e.target.value)}
      />
      <BaseButton size="small" onClick={handleServerClick}>
        {t('button.connect')}
      </BaseButton>
    </Box>
  );
}
