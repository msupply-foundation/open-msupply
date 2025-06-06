import React from 'react';
import {
  ArrayElement,
  Plugins,
  QueryClientProviderProxy,
  ThemeProviderProxy,
  UNDEFINED_STRING_VALUE,
  useTranslation,
} from '@openmsupply-client/common';
import { ValueInfoRow } from '@openmsupply-client/requisitions/src/common';
import { usePluginData } from '../../../../../api';

export type ForecastQuantityFieldPlugin = ArrayElement<
  NonNullable<Plugins['requestRequisitionLine']>['editViewField']
>;

const ForecastQuantityField: ForecastQuantityFieldPlugin = ({
  line,
  unitName,
}) => {
  const {
    query: { data },
  } = usePluginData({
    pluginCode: 'forecasting_plugins',
    filter: {
      dataIdentifier: { equalTo: 'FORECAST_QUANTITY_INFO' },
      relatedRecordId: { equalTo: line.id },
    },
    queryKey: [line.id],
  });
  const t = useTranslation();

  const parsed = JSON.parse(data?.[0]?.data ?? '{}');
  const value =
    parsed?.forecastTotalUnits === null
      ? null
      : Math.ceil(parsed?.forecastTotalUnits);

  return (
    <ThemeProviderProxy>
      <QueryClientProviderProxy>
        <ValueInfoRow
          key={`forecasting-plugin-field_${line.id}`}
          value={value}
          label={t('plugin.forecasting.forecast-amount')}
          representation="units"
          unitName={unitName ?? ''}
          defaultPackSize={1}
          nullDisplay={UNDEFINED_STRING_VALUE}
          displayVaccinesInDoses
          dosesPerUnit={line?.item?.doses}
        />
      </QueryClientProviderProxy>
    </ThemeProviderProxy>
  );
};

export default ForecastQuantityField;
