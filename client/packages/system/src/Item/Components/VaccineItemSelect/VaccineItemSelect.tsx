import React from 'react';
import {
  AutocompleteOptionRenderer,
  FnUtils,
  AutocompleteMulti,
  VaccineCourseItemNode,
} from '@openmsupply-client/common';
import { useVaccineItems } from 'packages/system/src/IndicatorsDemographics/api/hooks/document/useVaccineItems';
import { DraftVaccineCourse } from 'packages/system/src/Immunisation/api/hooks/useVaccineCourse';

interface VaccineItemSelectProps {
  extraFilter?: (item: VaccineCourseItemNode) => boolean;
  onChange: (newData: Partial<DraftVaccineCourse>) => void;
  draft: DraftVaccineCourse;
}

const renderOption: AutocompleteOptionRenderer<VaccineCourseItemNode> = (
  props,
  option
): JSX.Element => {
  return (
    <li {...props}>
      <span
        style={{
          fontWeight: 700,
          whiteSpace: 'nowrap',
          width: 100,
        }}
      >
        {option.item.name ?? ''}
      </span>
    </li>
  );
};

export const VaccineItemSelect = ({
  // extraFilter,
  onChange,
  draft,
}: VaccineItemSelectProps) => {
  const { data } = useVaccineItems();

  const onChangeSelectedItems = (selectedItems: VaccineCourseItemNode[]) => {
    onChange({ vaccineCourseItems: selectedItems });
  };

  const options =
    data?.nodes?.map(item => {
      return {
        id: FnUtils.generateUUID(),
        item: {
          id: item.id,
          name: item.name,
        },
      } as VaccineCourseItemNode;
    }) ?? ([] as VaccineCourseItemNode[]);

  return (
    <AutocompleteMulti
      isOptionEqualToValue={(option, value) => option.item.id === value.item.id}
      getOptionLabel={option => `${option.item.name}`}
      value={(draft?.vaccineCourseItems ?? []) as VaccineCourseItemNode[]}
      filterSelectedOptions
      onChange={(_event, newSelectedItems) =>
        onChangeSelectedItems(newSelectedItems)
      }
      options={options}
      renderOption={renderOption}
      inputProps={{ fullWidth: true }}
    />
  );
};
