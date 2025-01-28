import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export const buildItemEditRoute = (
  requisitionNumber?: number,
  itemId?: string
) =>
  RouteBuilder.create(AppRoute.Distribution)
    .addPart(AppRoute.CustomerRequisition)
    .addPart(String(requisitionNumber))
    .addPart(String(itemId))
    .build();
