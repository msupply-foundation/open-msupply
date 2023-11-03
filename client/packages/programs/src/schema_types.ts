import { EncounterNodeStatus } from '@common/types';
import { Clinician } from '@openmsupply-client/system';

/** The Note schema data structure */
export type NoteSchema = {
  text: string;
  created?: string;
  authorId?: string;
  authorName?: string;
};

export interface EncounterSchema {
  status?: EncounterNodeStatus;
  createdDatetime: string;
  createdBy?: { id: string; username: string };
  startDatetime?: string;
  endDatetime?: string;
  clinician?: Clinician;
  location?: { storeId?: string };
  notes?: NoteSchema[];
}
