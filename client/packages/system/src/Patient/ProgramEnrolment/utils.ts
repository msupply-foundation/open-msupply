import { FilterOptionsState, RegexUtils } from '@openmsupply-client/common';
import { ProgramRowFragmentWithId } from './api';

export interface ProgramSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: ProgramRowFragmentWithId) => void;
}

export const filterByType = (
  options: ProgramRowFragmentWithId[],
  state: FilterOptionsState<ProgramRowFragmentWithId>
) =>
  options.filter(option =>
    RegexUtils.matchObjectProperties(state.inputValue, option, ['type'])
  );
