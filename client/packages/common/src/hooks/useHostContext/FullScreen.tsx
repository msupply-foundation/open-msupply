import { ButtonWithIcon } from '@common/components';
import { MaximiseIcon } from '@common/icons';
import { useHostContext } from './useHostContext';
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from '@common/intl';
import { useNotification } from '../useNotification';

export const FullScreenButton = () => {
  const t = useTranslation();
  const { fullScreen, setFullScreen } = useHostContext();
  const { success } = useNotification();

  const exitFullScreen = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setFullScreen(false);
    }
  }, [setFullScreen]);

  useEffect(() => {
    if (fullScreen) {
      success(t('messages.full-screen-enabled'))();
      window.addEventListener('keydown', exitFullScreen);
    } else {
      window.removeEventListener('keydown', exitFullScreen);
    }

    // unmount
    return () => window.removeEventListener('keydown', exitFullScreen);
  }, [fullScreen, exitFullScreen, success, t]);

  return (
    <ButtonWithIcon
      Icon={<MaximiseIcon />}
      onClick={() => setFullScreen(true)}
      variant="outlined"
      label={t('label.full-screen')}
    />
  );
};
