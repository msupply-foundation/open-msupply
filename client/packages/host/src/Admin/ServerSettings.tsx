import React, { useEffect, useState } from 'react';

import {
  Typography,
  NativeMode,
  RouteBuilder,
  Switch,
  useToggle,
  BaseButton,
  getPreference,
  setPreference,
  removePreference,
  useNavigate,
  useTranslation,
  DownloadIcon,
  useNativeClient,
  LoadingButton,
  DatabaseType,
  Tooltip,
} from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';
import { AppRoute, Environment } from '@openmsupply-client/config';

import { Setting } from './Setting';
import { AndroidLogFileModal } from './AndroidLogFileModal';
import { WebAppLogFileModal } from './WebAppLogFileModal';
import { useDatabaseSettings } from '../api/hooks/settings/useDatabaseSettings';

export const ServerSettings = () => {
  const [nativeMode, setNativeMode] = useState(NativeMode.None);
  const navigate = useNavigate();
  const { saveDatabase } = useNativeClient();
  const { data: databaseSettings } = useDatabaseSettings();
  const [isDownloading, setIsDownloading] = useState(false);
  const t = useTranslation();
  const {
    isOn: isLogShown,
    toggleOn: showLog,
    toggleOff: hideLog,
  } = useToggle();
  const toggleNativeMode = () => {
    const mode =
      nativeMode === NativeMode.Server ? NativeMode.Client : NativeMode.Server;

    (async () => {
      await removePreference('previousServer');
      await setPreference('mode', mode);
      navigate(RouteBuilder.create(AppRoute.Android).build());
    })();
  };

  useEffect(() => {
    getPreference('mode', 'none').then(setNativeMode);
  }, []);
  return Capacitor.isNativePlatform() ? (
    <>
      <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
        {t('heading.settings-android')}
      </Typography>
      <Setting
        title={t('label.mode')}
        component={
          <>
            <Switch
              label={t('label.client')}
              onChange={toggleNativeMode}
              checked={nativeMode === NativeMode.Server}
            />
            <Typography
              component="div"
              sx={{
                alignItems: 'center',
                display: 'inline-flex',
                fontSize: '14px',
                paddingLeft: 1,
              }}
            >
              {t('label.server')}
            </Typography>
          </>
        }
      />
      <Setting
        title={t('label.server-log')}
        component={
          <>
            <AndroidLogFileModal onClose={hideLog} isOpen={isLogShown} />
            <BaseButton onClick={showLog}>{t('button.view')}</BaseButton>
          </>
        }
      />

      <Setting
        title={t('label.download-database')}
        component={
          <Tooltip
            title={
              databaseSettings?.databaseType !== DatabaseType.SqLite
                ? t('message.database-not-sqlite')
                : nativeMode !== NativeMode.Server
                ? t('message.database-not-local')
                : t('label.download-database')
            }
          >
            <span>
              <LoadingButton
                disabled={
                  databaseSettings?.databaseType !== DatabaseType.SqLite ||
                  nativeMode !== NativeMode.Server
                }
                isLoading={isDownloading}
                startIcon={<DownloadIcon />}
                onClick={async () => {
                  setIsDownloading(true);
                  const vacuum = await fetch(
                    `${Environment.API_HOST}/support/vacuum`,
                    {
                      method: 'POST',
                    }
                  );
                  if (vacuum.ok) {
                    await saveDatabase();
                  }
                  setIsDownloading(false);
                }}
              >
                {t('button.download')}
              </LoadingButton>
            </span>
          </Tooltip>
        }
      />
    </>
  ) : (
    <>
      <Setting
        title={t('label.server-log')}
        component={
          <>
            <WebAppLogFileModal onClose={hideLog} isOpen={isLogShown} />
            <BaseButton onClick={showLog}>{t('button.view')}</BaseButton>
          </>
        }
      />
      <Setting
        title={t('label.download-database')}
        component={
          <Tooltip
            title={
              databaseSettings?.databaseType !== DatabaseType.SqLite
                ? t('message.database-not-sqlite')
                : t('label.download-database')
            }
          >
            <span>
              <BaseButton
                disabled={
                  databaseSettings?.databaseType !== DatabaseType.SqLite
                }
                startIcon={<DownloadIcon />}
                onClick={() => {
                  open(`${Environment.API_HOST}/support/database`, '_blank');
                }}
              >
                {t('button.download')}
              </BaseButton>
            </span>
          </Tooltip>
        }
      />
    </>
  );
};
