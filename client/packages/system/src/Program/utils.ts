import { FilterOptionsState, RegexUtils } from '@openmsupply-client/common';
import { ProgramDocumentFragment } from './api';

export interface ProgramSearchProps {
  disabledPrograms?: string[];
  open: boolean;
  onClose: () => void;
  onChange: (name: ProgramDocumentFragment) => void;
}

export const filterByType = (
  options: ProgramDocumentFragment[],
  state: FilterOptionsState<ProgramDocumentFragment>
) =>
  options.filter(option =>
    RegexUtils.matchObjectProperties(state.inputValue, option, ['name'])
  );
