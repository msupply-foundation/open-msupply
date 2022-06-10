import {
  isStringControl,
  rankWith,
  schemaTypeIs,
  scopeEndsWith,
  uiTypeIs,
} from '@jsonforms/core';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';

export default rankWith(3, schemaTypeIs('string'));
