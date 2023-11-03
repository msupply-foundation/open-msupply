import React, { useRef, useState } from 'react';
import { AppBarButtonsPortal, LoadingButton } from '@common/components';
import { RadioIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { Environment } from 'packages/config/src';
import { useNotification } from '@common/hooks';

import { useAuthContext } from 'packages/common/src/authentication/AuthContext';
import { useQueryClient } from 'packages/common/src';
import { useSensorApi } from '../api/hooks/utils/useSensorApi';

export const AppBarButtons = () => {
  const t = useTranslation('coldchain');
  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const { storeId } = useAuthContext();
  const [isUploadingFridgeTag, setIsUploadingFridgeTag] = useState(false);
  const { success, error } = useNotification();
  const queryClient = useQueryClient();
  const api = useSensorApi();

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    setIsUploadingFridgeTag(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await fetch(
        `${Environment.UPLOAD_FRIDGE_TAG}?store-id=${storeId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!result.ok) {
        throw new Error(await result.text());
      }
      // TODO prettify
      const resultJson = await result.json();
      success(JSON.stringify(resultJson))();

      queryClient.invalidateQueries(api.keys.base());
    } catch (e) {
      console.error(e);
      // TODO prettify
      error(String(e))();
    } finally {
      setIsUploadingFridgeTag(false);
      // If value is not reset then upload button only works once
      if (e?.target?.value) e.target.value = '';
    }
  };

  return (
    <AppBarButtonsPortal>
      <input
        type="file"
        onChange={onUpload}
        ref={hiddenFileInput}
        style={{ display: 'none' }} // Make the file input element invisible
      />
      <LoadingButton
        startIcon={<RadioIcon />}
        onClick={() => hiddenFileInput?.current?.click()}
        isLoading={isUploadingFridgeTag}
      >
        {t('button.fridge-tag')}
      </LoadingButton>
    </AppBarButtonsPortal>
  );
};
