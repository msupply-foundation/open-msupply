import {
  InsertLocationInput,
  UpdateLocationInput,
} from '@openmsupply-client/common/src/types';
import { db } from '../../data';
import { Location } from './../../data/types';

export const LocationMutation = {
  insert: (vars: InsertLocationInput): Location => {
    const inserted = db.location.insert(vars);
    return inserted;
  },
  update: (vars: UpdateLocationInput): Location => {
    const updated = db.location.update(vars);
    return updated;
  },
};
