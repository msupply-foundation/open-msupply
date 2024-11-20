import React from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
  RouteBuilder,
  useParams,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';
import { PageLayout } from '../PageLayout';
import { ListIndicatorLines } from './ListIndicators';
import { AppRoute } from 'packages/config/src';
import { AppBarButtons } from '../ResponseLineEdit/AppBarButtons';

export const IndicatorEditPage = () => {
  const { programIndicatorLineId } = useParams();
  const { data, isLoading } = useResponse.document.get();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useResponse.document.indicators(
      data?.otherPartyId ?? '',
      data?.period?.id ?? ''
    );

  const lines =
    programIndicators?.programIndicators.nodes.flatMap(indicator =>
      indicator.lineAndColumns.map(l => l.line)
    ) ?? [];

  if (isLoading || isProgramIndicatorsLoading) {
    return <BasicSpinner />;
  }
  if (!programIndicatorLineId || !data) {
    return <NothingHere />;
  }

  return (
    <>
      <AppBarButtons requisitionNumber={data?.requisitionNumber} />
      <DetailContainer>
        <PageLayout
          Left={
            <>
              <ListIndicatorLines
                currentIndicatorLineId={programIndicatorLineId ?? ''}
                lines={lines}
                route={RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerRequisition)
                  .addPart(String(data?.requisitionNumber))}
                // enteredLineIds={enteredLineIds}
              />
            </>
          }
          Right={<></>}
        />
      </DetailContainer>
    </>
  );
};
