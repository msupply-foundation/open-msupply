import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate } from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';

export const useBackButtonHandler = ({
  isNavigateEnabled,
}: {
  isNavigateEnabled: boolean;
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      App.removeAllListeners();

      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack && isNavigateEnabled) navigate(-1);
        else {
          App.minimizeApp();
        }
      });
    }

    if (Capacitor.isNativePlatform()) {
      return () => {
        App.removeAllListeners();
      };
    }
  }, [isNavigateEnabled, navigate]);
};
