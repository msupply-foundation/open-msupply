import { FilterOptionsState, RegexUtils } from '@openmsupply-client/common';
import { ProgramDocumentRegistryFragment } from './api';

export const filterByName = (
  options: ProgramDocumentRegistryFragment[],
  state: FilterOptionsState<ProgramDocumentRegistryFragment>
) =>
  options.filter(option =>
    RegexUtils.matchObjectProperties(state.inputValue, option, ['name'])
  );
