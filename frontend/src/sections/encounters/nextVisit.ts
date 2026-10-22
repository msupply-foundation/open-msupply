import { graphqlFetch } from '@/api/graphql';
import { localTodayIso } from '@/ui/elements/inputs/dateTimeConvert';
import type { FormRegistryFragment } from '@/domain/documentForm/documentForm.generated';
import {
  encounterTypesFor,
  fetchFormRegistries,
  fetchPatientProgramEnrolments,
} from '@/sections/patients/detail/programs/programsApi';
import { EncounterNextDoses, EncounterNextVisit } from './encounter.generated';

/*
 * The prompt after Save as visited (Product's
 * program-enrolment prototype): "Schedule the next visit", prefilled with the
 * same visit type, a suggested date and a reason. What fills it, and which
 * types it offers, are read here once the save has landed, since the server
 * works the suggestion out from the saved visit.
 */

export interface NextVisitSuggestion {
  /** The suggested date, as a date-time the visit date field takes. */
  startDatetime?: string;
  /** What the visit is for, offered as its reason. */
  reason?: string;
}

export interface NextVisit extends NextVisitSuggestion {
  /**
   * The encounter types the patient can be booked for: those of the programs
   * they are enrolled in, which is all the server accepts. Empty, there is
   * nothing to book, and no prompt.
   */
  registries: FormRegistryFragment[];
}

interface Suggested {
  startDatetime: string;
  label: string | null;
}

interface Dose {
  label: string;
  suggestedDate: string | null;
}

/** `day` (a local calendar day) at `now`'s time of day, as a UTC instant. */
const dayAtTimeOfDay = (day: string, now: Date): string => {
  const at = new Date(`${day}T00:00:00`);
  at.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return at.toISOString();
};

/**
 * The suggestion. Inside an immunisation enrolment, the card's earliest
 * suggested date still to come, with the doses due that day as the reason
 * (spec/vaccination-card rules § effects on the encounter); the day is a
 * local calendar day, as `today` is, and is offered at the time of day it is
 * now, as a visit booked by hand would be. Otherwise, or when the card
 * suggests nothing more, the date the encounter type's configuration works
 * out, with its label, where that is still to come. Nothing, where neither
 * suggests anything: the prompt opens with its date empty.
 */
export const suggestNextVisit = (
  suggested: Suggested | null | undefined,
  doses: readonly Dose[] | undefined,
  now: Date,
  today: string
): NextVisitSuggestion => {
  const coming = (doses ?? []).filter(
    (d): d is Dose & { suggestedDate: string } =>
      d.suggestedDate !== null && d.suggestedDate > today
  );
  if (coming.length > 0) {
    const day = coming.reduce(
      (earliest, d) =>
        d.suggestedDate < earliest ? d.suggestedDate : earliest,
      coming[0]!.suggestedDate
    );
    const labels = [
      ...new Set(coming.filter(d => d.suggestedDate === day).map(d => d.label)),
    ];
    return {
      startDatetime: dayAtTimeOfDay(day, now),
      reason: labels.join(', '),
    };
  }
  if (!suggested) return {};
  if (new Date(suggested.startDatetime).getTime() <= now.getTime()) return {};
  return {
    startDatetime: suggested.startDatetime,
    reason: suggested.label ?? undefined,
  };
};

/**
 * Everything the prompt opens with, read together. A read that fails
 * contributes nothing: no types means no prompt, no suggestion an empty
 * date.
 */
export const fetchNextVisit = async (args: {
  storeId: string;
  patientId: string;
  encounterId: string;
  /** The enrolment of an immunisation encounter, whose card suggests the date. */
  immunisationEnrolmentId?: string;
}): Promise<NextVisit> => {
  const now = new Date();
  const [registries, enrolments, suggested, doses] = await Promise.all([
    fetchFormRegistries(args.storeId),
    fetchPatientProgramEnrolments({
      storeId: args.storeId,
      filter: { patientId: { equalTo: args.patientId } },
      sort: { key: 'enrolmentDatetime', desc: true },
      eventTime: now.toISOString(),
    }),
    graphqlFetch(EncounterNextVisit, {
      storeId: args.storeId,
      id: args.encounterId,
    }),
    args.immunisationEnrolmentId
      ? graphqlFetch(EncounterNextDoses, {
          storeId: args.storeId,
          programEnrolmentId: args.immunisationEnrolmentId,
        })
      : undefined,
  ]);
  const card =
    doses?.kind === 'success' ? doses.data.vaccinationCard : undefined;
  return {
    registries: encounterTypesFor(registries ?? [], enrolments ?? []),
    ...suggestNextVisit(
      suggested.kind === 'success'
        ? suggested.data.encounters.nodes[0]?.suggestedNextEncounter
        : undefined,
      card?.__typename === 'VaccinationCardNode' ? card.items : undefined,
      now,
      localTodayIso()
    ),
  };
};
