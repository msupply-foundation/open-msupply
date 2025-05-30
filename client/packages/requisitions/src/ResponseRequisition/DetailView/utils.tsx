import { RouteBuilder } from '@common/utils';
import { AppRoute } from '@openmsupply-client/config';

export const buildIndicatorEditRoute = (
  requisitionId: string,
  programIndicatorCode: string,
  indicatorId: string
) =>
  RouteBuilder.create(AppRoute.Distribution)
    .addPart(AppRoute.CustomerRequisition)
    .addPart(String(requisitionId))
    .addPart(AppRoute.Indicators)
    .addPart(programIndicatorCode)
    .addPart(indicatorId)
    .build();
