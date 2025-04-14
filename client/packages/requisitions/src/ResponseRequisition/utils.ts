import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export const buildItemEditRoute = (
  requisitionId?: string,
  itemId?: string
) =>
  RouteBuilder.create(AppRoute.Distribution)
    .addPart(AppRoute.CustomerRequisition)
    .addPart(String(requisitionId))
    .addPart(String(itemId))
    .build();
