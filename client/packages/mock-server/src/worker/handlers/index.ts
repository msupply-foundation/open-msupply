import { InvoiceHandlers } from './invoice';
import { RequisitionHandlers } from './requisition';
import { NameHandlers } from './name';
import { ItemHandlers } from './item';
import { StocktakeHandlers } from './stocktake';

const isDev = process.env.NODE_ENV === 'development';

const unsupported = [...StocktakeHandlers, ...RequisitionHandlers];
const supported = [...InvoiceHandlers, ...NameHandlers, ...ItemHandlers];

const DevHandlers = [...unsupported, ...supported];
const ProdHandlers = [...unsupported];

export const Handlers = isDev ? DevHandlers : ProdHandlers;
