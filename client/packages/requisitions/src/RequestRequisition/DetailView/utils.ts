import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export const buildIndicatorEditRoute = (
  requisitionId: string,
  programIndicatorCode: string,
  indicatorId: string
) =>
  RouteBuilder.create(AppRoute.Replenishment)
    .addPart(AppRoute.InternalOrder)
    .addPart(String(requisitionId))
    .addPart(AppRoute.Indicators)
    .addPart(programIndicatorCode)
    .addPart(indicatorId)
    .build();

export const buildItemEditRoute = (
  requisitionId?: string,
  itemId?: string
) =>
  RouteBuilder.create(AppRoute.Replenishment)
    .addPart(AppRoute.InternalOrder)
    .addPart(String(requisitionId))
    .addPart(String(itemId))
    .build();
