import { ResolverService as OldResolverService } from './old';
// import { invoice } from './invoice';
import { item } from './item';
// import { name } from './name';
// import { requisition } from './requisition';

export const ResolverService = {
  //   invoice,
  item,
  //   name,
  //   requisition,
  ...OldResolverService,
};
