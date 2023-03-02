import React from 'react';
import { ReportContext } from '@openmsupply-client/common';

import { ReportListView } from '../ListView';

export const Service = ({ context }: { context: ReportContext }) => (
  <ReportListView context={context} />
);

export default Service;
