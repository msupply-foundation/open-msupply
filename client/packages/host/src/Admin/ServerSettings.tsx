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
} from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';
import { AppRoute } from '@openmsupply-client/config';

import { Setting } from './Setting';
import { AndroidLogFileModal } from './AndroidLogFileModal';
import { WebAppLogFileModal } from './WebAppLogFileModal';

export const ServerSettings = () => {
  const [nativeMode, setNativeMode] = useState(NativeMode.None);
  const navigate = useNavigate();
  const t = useTranslation('common');
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
    </>
  ) : (
    <>
      <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
        {t('heading.support')}
      </Typography>
      <Setting
        title={t('label.server-log')}
        component={
          <>
            <WebAppLogFileModal onClose={hideLog} isOpen={isLogShown} />
            <BaseButton onClick={showLog}>{t('button.view')}</BaseButton>
          </>
        }
      />
    </>
  );
};
