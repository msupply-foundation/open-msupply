import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate } from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';

export const useBackButtonHandler = ({
  isNavigateEnabled,
  dependencies,
}: {
  isNavigateEnabled: boolean;
  dependencies?: unknown[];
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      App.removeAllListeners();

      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && isNavigateEnabled) navigate(-1);
        else App.exitApp();
      });
    }

    return () => {
      if (Capacitor.isNativePlatform()) {
        App.removeAllListeners();
      }
    };
  }, [isNavigateEnabled, navigate, dependencies]);
};
