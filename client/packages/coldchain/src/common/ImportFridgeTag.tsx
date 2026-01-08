import React, { useRef } from 'react';
import { LoadingButton, useConfirmationModal } from '@common/components';
import { UploadIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { AppRoute, Environment } from '@openmsupply-client/config';
import { useConfirmOnLeaving, useNotification } from '@common/hooks';

import {
  Breakpoints,
  RouteBuilder,
  useAppTheme,
  useAuthContext,
  useMediaQuery,
  useNavigate,
  useQueryClient,
} from '@openmsupply-client/common';
import { useTemperatureLog, useTemperatureBreach } from '../Monitoring/api';
import { SENSOR } from '../Sensor/api';

// Types are based on berlinger file returned values
interface FridgeTag {
  [key: string]: unknown; // satisfies t function types
  newSensorId?: string | null;
  numberOfLogs: number;
  numberOfBreaches: number;
  startDatetime?: Date | null;
  endDatetime?: Date | null;
}

interface ImportFridgeTagProps {
  shouldShrink: boolean;
}

export const ImportFridgeTag = ({
  shouldShrink = false,
}: ImportFridgeTagProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const theme = useAppTheme();
  const isExtraSmallScreen = useMediaQuery(
    theme.breakpoints.down(Breakpoints.sm)
  );

  const hiddenFileInput = useRef<HTMLInputElement>(null);
  const { storeId } = useAuthContext();
  const queryClient = useQueryClient();

  const logApi = useTemperatureLog.utils.api();
  const breachApi = useTemperatureBreach.utils.api();

  const getConfirmation = useConfirmationModal({
    message: t('messages.new-sensor'),
    title: t('title.new-sensor'),
  });
  // prevent a user reloading the page while uploading
  const { isDirty: isUploadingFridgeTag, setIsDirty: setIsUploadingFridgeTag } =
    useConfirmOnLeaving('upload-fridge-tag');

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    setIsUploadingFridgeTag(true);

    const formData = new FormData();
    formData.append('files', file);

    try {
      const result = await fetch(
        `${Environment.UPLOAD_FRIDGE_TAG}?store-id=${storeId}`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      if (!result.ok) {
        throw new Error(await result.text());
      }
      const resultJson: FridgeTag = await result.json();
      if (resultJson.numberOfLogs === 0 && resultJson.numberOfBreaches === 0)
        throw new Error(t('error.fridge-tag-import-empty'));

      success(t('messages.fridge-tag-import-successful', resultJson))();

      // forces a refetch of logs, breach, chart data and sensors
      queryClient.invalidateQueries(breachApi.keys.base());
      queryClient.invalidateQueries(logApi.keys.base());
      queryClient.invalidateQueries([SENSOR]);

      // if the user is on mobile - redirect to monitoring page
      if (isExtraSmallScreen) {
        const encodedDatetime = encodeURIComponent(
          `${resultJson.startDatetime}_${resultJson.endDatetime}`
        );

        const path = RouteBuilder.create(AppRoute.Coldchain)
          .addPart(AppRoute.Monitoring)
          .addQuery({
            'sensor.id': resultJson.newSensorId ?? '',
            datetime: encodedDatetime,
            sort: 'datetime',
          })
          .build();
        setTimeout(() => navigate(path));
        return;
      }

      // asks if the user would like to assign a location and redirects if yes
      if (!!resultJson.newSensorId) {
        const path = RouteBuilder.create(AppRoute.Coldchain)
          .addPart(AppRoute.Sensors)
          .addQuery({ edit: resultJson.newSensorId })
          .build();

        getConfirmation({
          onConfirm: () => setTimeout(() => navigate(path), 500),
        });
        return;
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
    <>
      <input
        type="file"
        onChange={onUpload}
        ref={hiddenFileInput}
        style={{ display: 'none' }} // Make the file input element invisible
        accept=".txt,.csv"
      />
      <LoadingButton
        variant="outlined"
        shouldShrink={shouldShrink}
        title={t('tooltip.import-fridge-tag')}
        startIcon={<UploadIcon />}
        label={t('button.import-fridge-tag')}
        onClick={() => hiddenFileInput?.current?.click()}
        isLoading={isUploadingFridgeTag}
        loadingStyle={{
          backgroundColor: 'primary.main',
          iconColor: 'background.white',
        }}
      />
    </>
  );
};
