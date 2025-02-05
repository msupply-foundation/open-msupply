import { EncounterNodeStatus } from '@common/types';
import { Clinician } from '@openmsupply-client/system';
import { Gender } from './hooks';

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

export interface AddressSchema {
  /** 184097001 Patient Address */
  address1?: string;
  /** Second address line */
  address2?: string;
  /** 433178008 City of residence */
  city?: string;
  /** 184102003 Patient zip code */
  zipCode?: string;
  district?: string;
  /** Region or province */
  region?: string;
  country?: string;
}

export interface NextOfKinSchema {
  /** mSupply Patient id of next of kin */
  id?: string;
  /** Next of kin name */
  name?: string;
}

export interface PersonSchema {
  /** mSupply Patient id */
  id?: string;

  /** Patient code, e.g. national id or other patient identifier */
  code?: string;
  /** Secondary patient code, e.g. another type of health id */
  code2?: string;

  /** Passport Number */
  passportNumber?: string;

  firstName?: string;
  middleName?: string;
  /** 184096005 Patient Surname */
  lastName?: string;
  /** 184095009 Patient Forename */
  /** 263495000 Gender */
  /** 394744001 Gender unspecified*/
  gender?: Gender;
  /**
   * 184099003 Date of birth
   *
   * @format date
   */
  dateOfBirth?: string;
  /** Date of birth is estimated */
  dateOfBirthIsEstimated?: boolean;
  /** Place of birth */
  birthPlace?: AddressSchema;

  /** Person is deceased */
  isDeceased?: boolean;
  /**
   * Date of death
   *
   * @format date
   */
  dateOfDeath?: string;

  notes?: NoteSchema[];

  nextOfKin?: NextOfKinSchema;
}

export interface PatientSchema extends PersonSchema {
  id: string;
}
