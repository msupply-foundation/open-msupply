import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export const buildItemEditRoute = (requisitionId?: string, itemId?: string) =>
  RouteBuilder.create(AppRoute.Replenishment)
    .addPart(AppRoute.InternalOrder)
    .addPart(String(requisitionId))
    .addPart(String(itemId))
    .build();

export const STOCK_DISTRIBUTION_INFO = 'stock-distribution';
export const CONSUMPTION_HISTORY_INFO = 'consumption-history';
export const STOCK_EVOLUTION_INFO = 'stock-evolution';
export const FORECAST_QUANTITY_INFO = 'forecast-quantity-info';
