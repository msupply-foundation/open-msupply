import React from 'react';
import {
  ListOptions,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { IndicatorLineRowFragment } from '../../api';

interface ListIndicatorLineProps {
  currentIndicatorLineId?: string | null;
  lines: IndicatorLineRowFragment[];
  route: RouteBuilder;
}

export const ListIndicatorLines = ({
  currentIndicatorLineId,
  lines,
  route,
}: ListIndicatorLineProps) => {
  const navigate = useNavigate();
  const value = lines?.find(({ id }) => id === currentIndicatorLineId) ?? null;

  return (
    <ListOptions
      currentId={value?.id}
      onClick={id => {
        navigate(route.addPart(id).build(), {
          replace: true,
        });
      }}
      options={
        lines?.map(({ id, name, code }) => ({
          id,
          value: `${name}: ${code}`,
        })) ?? []
      }
    />
  );
};
