import React, { useRef, useState } from 'react';
import {
  AppBarButtonsPortal,
  LoadingButton,
  useConfirmationModal,
} from '@common/components';
import { UploadIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { useConfirmOnLeaving, useNotification } from '@common/hooks';

import {
  RouteBuilder,
  useAuthContext,
  useNavigate,
  useQueryClient,
} from '@openmsupply-client/common';
import {
  useTemperatureLog,
  useTemperatureBreach,
  useTemperatureChart,
} from '../api';
import { useSensor } from '../../Sensor/api';

export const AppBarButtons = () => {
  const t = useTranslation('coldchain');
  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const { storeId } = useAuthContext();
  const [isUploadingFridgeTag, setIsUploadingFridgeTag] = useState(false);
  const { success, error } = useNotification();
  const queryClient = useQueryClient();
  const sensorApi = useSensor.utils.api();
  const logApi = useTemperatureLog.utils.api();
  const breachApi = useTemperatureBreach.utils.api();
  const chartApi = useTemperatureChart.utils.api();
  const navigate = useNavigate();
  const getConfirmation = useConfirmationModal({
    message: t('messages.new-sensor'),
    title: t('title.new-sensor'),
  });
  // prevent a user reloading the page while uploading
  useConfirmOnLeaving(isUploadingFridgeTag);

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
      // Result format: {"newSensorId":null,"numberOfLogs":66,"numberOfBreaches":0}
      const resultJson = await result.json();
      if (resultJson.numberOfLogs === 0 && resultJson.numberOfBreaches === 0)
        throw new Error(t('error.fridge-tag-import-empty'));

      success(t('messages.fridge-tag-import-successful', resultJson))();

      // forces a refetch of logs, breach, chart data and sensors
      queryClient.invalidateQueries(breachApi.keys.base());
      queryClient.invalidateQueries(chartApi.keys.base());
      queryClient.invalidateQueries(logApi.keys.base());
      queryClient.invalidateQueries(sensorApi.keys.base());

      // asks if the user would like to assign a location and redirects if yes
      if (!!resultJson.newSensorId) {
        const path = RouteBuilder.create(AppRoute.Coldchain)
          .addPart(AppRoute.Sensors)
          .addQuery({ edit: resultJson.newSensorId })
          .build();

        getConfirmation({
          onConfirm: () => setTimeout(() => navigate(path), 500),
        });
      }
    } catch (e) {
      console.error(e);
      error(t('error.fridge-tag-import', { message: (e as Error).message }))();
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
        accept=".txt"
      />
      <LoadingButton
        title={t('tooltip.import-fridge-tag')}
        startIcon={<UploadIcon />}
        onClick={() => hiddenFileInput?.current?.click()}
        isLoading={isUploadingFridgeTag}
        loadingStyle={{
          backgroundColor: 'primary.main',
          iconColor: 'background.white',
        }}
      >
        {t('button.import-fridge-tag')}
      </LoadingButton>
    </AppBarButtonsPortal>
  );
};
