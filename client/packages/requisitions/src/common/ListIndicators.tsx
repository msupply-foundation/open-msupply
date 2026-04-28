import React from 'react';
import { ListOptions } from '@openmsupply-client/common';
import { IndicatorLineRowFragment } from '../RequestRequisition/api';

interface ListIndicatorLineProps {
  currentIndicatorLineId?: string | null;
  lines: IndicatorLineRowFragment[];
  onClick: (id: string) => void;
  scrollRef: React.MutableRefObject<HTMLLIElement | null>;
}

export const ListIndicatorLines = ({
  currentIndicatorLineId,
  lines,
  onClick,
  scrollRef,
}: ListIndicatorLineProps) => {
  const value = lines?.find(({ id }) => id === currentIndicatorLineId) ?? null;

  return (
    <ListOptions
      currentId={value?.id}
      onClick={onClick}
      options={
        lines?.map(({ id, name, code }) => ({
          id,
          value: `${code} - ${name}`,
        })) ?? []
      }
      scrollRef={scrollRef}
    />
  );
};
