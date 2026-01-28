import { Plugins } from '@openmsupply-client/common';
import * as forecastQuantity from './ForecastQuantity/ForecastQuantityColumn';
import forecastQuantityField from './ForecastQuantity/ForecastQuantityField';
import ForecastCalculationDisplay from './ForecastQuantity/ForecastCalculationDisplay';

const ForecastingPlugins: Plugins = {
  requestRequisitionLine: {
    tableStateLoader: [forecastQuantity.StateLoader],
    tableColumn: [forecastQuantity.ForecastQuantityColumn],
    editViewField: [forecastQuantityField],
    editViewInfo: [ForecastCalculationDisplay],
  },
};

export default ForecastingPlugins;
