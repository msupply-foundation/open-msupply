import { Plugins } from '@openmsupply-client/common';
import * as forecastQuantity from './ForecastQuantity/ForecastQuantityColumn';
import forecastQuantityField from './ForecastQuantity/ForecastQuantityField';
import ForecastCalculationDisplay from './ForecastQuantity/ForecastCalculationDisplay';
import {
  CONSUMPTION_HISTORY_INFO,
  STOCK_DISTRIBUTION_INFO,
  STOCK_EVOLUTION_INFO,
} from '@openmsupply-client/requisitions';

const ForecastingPlugins: Plugins = {
  requestRequisitionLine: {
    tableStateLoader: [forecastQuantity.StateLoader],
    tableColumn: [forecastQuantity.ForecastQuantityColumn],
    editViewField: [forecastQuantityField],
    editViewInfo: [ForecastCalculationDisplay],
    hideInfo: [
      STOCK_DISTRIBUTION_INFO,
      CONSUMPTION_HISTORY_INFO,
      STOCK_EVOLUTION_INFO,
    ],
  },
};

export default ForecastingPlugins;
