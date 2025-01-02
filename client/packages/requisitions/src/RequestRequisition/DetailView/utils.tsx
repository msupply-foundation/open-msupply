import { RouteBuilder } from '@common/utils';
import { AppRoute } from '@openmsupply-client/config';

export const buildItemEditRoute = (
  requisitionNumber?: number,
  itemId?: string
) =>
  RouteBuilder.create(AppRoute.Replenishment)
    .addPart(AppRoute.InternalOrder)
    .addPart(String(requisitionNumber))
    .addPart(String(itemId))
    .build();
