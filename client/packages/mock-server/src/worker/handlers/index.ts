import { InvoiceHandlers } from './invoice';
import { RequisitionHandlers } from './requisition';
import { NameHandlers } from './name';
import { ItemHandlers } from './item';
import { StocktakeHandlers } from './stocktake';
import { ExperimentalHandlers } from './experimental';

const isDev = process.env.NODE_ENV === 'development';

const unsupported = [
  ...StocktakeHandlers,
  ...RequisitionHandlers,
  ...ExperimentalHandlers,
];
const supported = [...InvoiceHandlers, ...NameHandlers, ...ItemHandlers];

const DevHandlers = [...unsupported, ...supported];
const ProdHandlers = [...unsupported];

export const Handlers = isDev ? DevHandlers : ProdHandlers;
