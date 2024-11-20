import React, { useEffect } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useParams,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';
import { PageLayout } from '../PageLayout';
import { ListIndicatorLines } from './ListIndicators';
import { AppRoute } from '@openmsupply-client/config';
import { AppBarButtons } from '../ResponseLineEdit/AppBarButtons';

export const IndicatorEditPage = () => {
  const { programIndicatorLineId } = useParams();
  const { data, isLoading } = useResponse.document.get();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useResponse.document.indicators(
      data?.otherPartyId ?? '',
      data?.period?.id ?? ''
    );

  const linesAndColumns =
    programIndicators?.programIndicators.nodes.flatMap(
      indicator => indicator.lineAndColumns
    ) ?? [];
  const lines = linesAndColumns.map(l => l.line);
  const currentLine = lines.find(l => l.id === programIndicatorLineId);

  useEffect(() => {
    setCustomBreadcrumbs({
      2: 'Indicators',
      3: currentLine?.code || '',
    });
  }, [programIndicatorLineId]);

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
              />
            </>
          }
          Right={<></>}
        />
      </DetailContainer>
    </>
  );
};
