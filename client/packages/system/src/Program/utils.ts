import { FilterOptionsState, RegexUtils } from '@openmsupply-client/common';
import { ProgramDocumentFragment } from './api';

export const filterByName = (
  options: ProgramDocumentFragment[],
  state: FilterOptionsState<ProgramDocumentFragment>
) =>
  options.filter(option =>
    RegexUtils.matchObjectProperties(state.inputValue, option, ['name'])
  );
