import React from 'react';
import {
  Tooltip,
  ListOptions,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { IndicatorLineRowFragment } from '../../api';

interface ListIndicatorLineProps {
  currentIndicatorLineId?: string | null;
  lines: IndicatorLineRowFragment[];
  route: RouteBuilder;
  //   enteredLineIds?: string[];
}

export const ListIndicatorLines = ({
  currentIndicatorLineId,
  lines,
  route,
  //   enteredLineIds,
}: ListIndicatorLineProps) => {
  const navigate = useNavigate();
  const value = lines?.find(({ id }) => id === currentIndicatorLineId) ?? null;

  return (
    <Tooltip title={value?.code}>
      <ListOptions
        currentId={value?.id}
        onClick={id => {
          navigate(route.addPart('indicator').addPart(id).build(), {
            replace: true,
          });
        }}
        options={
          lines?.map(({ id, code }) => ({
            id,
            value: code,
          })) ?? []
        }
        // enteredLineIds={enteredLineIds}
      />
    </Tooltip>
  );
};
