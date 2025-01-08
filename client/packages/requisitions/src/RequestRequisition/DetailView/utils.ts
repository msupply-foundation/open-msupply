import { RouteBuilder } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export const buildIndicatorEditRoute = (
  requisitionNumber: number,
  programIndicatorCode: string,
  indicatorId: string
) =>
  RouteBuilder.create(AppRoute.Replenishment)
    .addPart(AppRoute.InternalOrder)
    .addPart(String(requisitionNumber))
    .addPart(AppRoute.Indicators)
    .addPart(programIndicatorCode)
    .addPart(indicatorId)
    .build();

export const buildItemEditRoute = (
  requisitionNumber?: number,
  itemId?: string
) =>
  RouteBuilder.create(AppRoute.Replenishment)
    .addPart(AppRoute.InternalOrder)
    .addPart(String(requisitionNumber))
    .addPart(String(itemId))
    .build();
