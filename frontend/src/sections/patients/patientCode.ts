import { createSignal, type Accessor } from 'solid-js';
import { graphqlFetch } from '../../api/graphql';
// The resource file directly, not the domain/patient barrel: that barrel also
// re-exports PatientSearch, and pulling a Solid component into this module puts
// Kobalte's client-only code in the import graph of a node-environment unit
// test (the ItemVariantEditModal → domain/name/nameResource precedent).
import { searchLocalPatients } from '../../domain/patient/patientResource';
import {
  AllocatePatientCodeNumber,
  type AllocatePatientCodeNumberVariables,
} from './allocatePatientCodeNumber.generated';

// Generating a patient code (spec/patients § generating a code; contract ›
// generating a code). The composed shape is the store name's first three
// letters upper-cased + the next counter value padded to four digits — GEN0001.
//
// The counter is server-side, per store, and CONSUMED by the allocate call: a
// generated code the user then discards leaves a gap in the sequence. That is
// why generate is a deliberate click and a re-generate is confirmed first, not
// something an effect may do on the user's behalf.

// The server-side counter's name. A NumberRowType::Program counter — the same
// mechanism program enrolment ids use, which is why the mutation and its
// permission are program-flavoured (see the contract's wire trap).
const COUNTER_NAME = 'PatientCode';

const PREFIX_LENGTH = 3;
const NUMBER_PAD = '0000';

/**
 * The composition rule, pure so it can be asserted directly (DIS-02 `.54`).
 * Short store names contribute all they have — "Ab" gives "AB0001", not a padded
 * prefix; the reference generator takes the first N characters without padding.
 */
export const composePatientCode = (storeName: string, number: number): string =>
  storeName.slice(0, PREFIX_LENGTH).toLocaleUpperCase() +
  String(number).padStart(NUMBER_PAD.length, '0');

/**
 * Whether another patient already holds `code`. `excludePatientId` is the patient
 * being edited, whose own code is not a collision.
 *
 * Uses the local patient search, whose `code` input is an EXACT server-side match
 * (spec/patients contract › generating a code) — there is no dedicated endpoint.
 * A failed fetch answers `false`: the check is a guard against an accidental
 * collision, and a transport failure (already surfaced globally) must not
 * manufacture a validation error that blocks an otherwise valid save.
 */
export const isPatientCodeTaken = async (
  storeId: string,
  code: string,
  excludePatientId?: string
): Promise<boolean> => {
  const trimmed = code.trim();
  if (!trimmed) return false;
  const nodes = await searchLocalPatients(storeId, { code: trimmed });
  if (!nodes) return false;
  return nodes.some(node => node.id !== excludePatientId);
};

/**
 * Allocate the next counter value for the store. Undefined when the call fails —
 * including the DOCUMENT_MUTATE Forbidden case (handled globally, since the
 * affordance is permission-gated and a user who sees it should hold the
 * permission).
 */
const allocateNumber = async (storeId: string): Promise<number | undefined> => {
  const variables: AllocatePatientCodeNumberVariables = {
    storeId,
    numberName: COUNTER_NAME,
  };
  const result = await graphqlFetch(AllocatePatientCodeNumber, variables);
  if (result.kind !== 'success') return undefined;
  return result.data.allocateProgramNumber.number;
};

// How many times to re-roll a generated code that turns out to be taken. The
// counter is monotonic, so a collision means a code was created by some other
// route (a manual entry, an import); a handful of rolls clears any realistic
// run of those, and the bound stops a pathological datafile spinning forever.
const MAX_ATTEMPTS = 10;

/**
 * Generate an unused code for the store (DIS-02 `.54`/`.55`). Each attempt
 * consumes a counter value; the loop stops at the first unused code, and gives up
 * after MAX_ATTEMPTS by returning the last one composed — a taken code the user
 * can see and edit beats an empty field with no explanation, and the
 * duplicate-code validation will still block the save.
 *
 * Undefined only when the counter itself is unreachable (nothing to show).
 */
export const generatePatientCode = async (
  storeId: string,
  storeName: string,
  excludePatientId?: string
): Promise<string | undefined> => {
  let code: string | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const number = await allocateNumber(storeId);
    if (number === undefined) return code;
    code = composePatientCode(storeName, number);
    if (!(await isPatientCodeTaken(storeId, code, excludePatientId)))
      return code;
  }
  return code;
};

export interface CodeCheckInput {
  storeId: Accessor<string>;
  /** The code as the form currently holds it. */
  code: Accessor<string>;
  /**
   * The code the patient was loaded with — `''` while creating. A code left at
   * its saved value is NEVER checked: a patient whose code already collides (an
   * import, or a create predating this rule) must not have every unrelated edit
   * blocked (spec/patients § generating a code).
   */
  savedCode: Accessor<string>;
  /** The patient being edited, whose own code is not a collision. */
  patientId: Accessor<string | undefined>;
}

export interface CodeTakenCheck {
  /**
   * Whether the code the field currently holds is KNOWN to be taken. False
   * until a check has run and said so. Feed to `patientFieldErrors`.
   */
  taken: Accessor<boolean>;
  /**
   * Run the check and record the answer. Await from the save handler and
   * abandon the save when it resolves true — `taken` is then reporting, so the
   * field shows the error.
   */
  check: () => Promise<boolean>;
}

/**
 * Does another patient hold the code the form currently shows (DIS-02 `.57`)?
 *
 * Checked ON THE SAVE ATTEMPT, not while typing: the answer is only needed to
 * decide whether the save may proceed, and a query per settled keystroke is a
 * lot of traffic to answer a question nobody has asked yet. The server does not
 * enforce this — it permits a shared code (spec/patients rules › identifier and
 * code rules) — so the check has to happen client-side, and the save handler is
 * the one place it must happen.
 *
 * A plain signal, never a resource: this fetch is triggered from a live form on
 * an ALREADY-OPEN screen, so it must not be able to suspend a boundary and tear
 * that form down mid-edit (kdd/solid-reactivity-pitfalls › no remounts on
 * interaction).
 */
export const createCodeTakenCheck = (input: CodeCheckInput): CodeTakenCheck => {
  const [takenCode, setTakenCode] = createSignal<string>();
  let generation = 0;

  const check = async (): Promise<boolean> => {
    const storeId = input.storeId();
    const code = input.code().trim();
    const saved = input.savedCode().trim();
    const attempt = ++generation;

    if (!storeId || !code || code === saved) {
      setTakenCode(undefined);
      return false;
    }

    const taken = await isPatientCodeTaken(storeId, code, input.patientId());
    // A later attempt has started since — its answer is the current one.
    if (attempt !== generation) return taken;
    setTakenCode(taken ? code : undefined);
    return taken;
  };

  // Report only while the field still holds the code the answer is about, so
  // the error clears on the first keystroke rather than sitting there stale.
  const taken = () => {
    const answered = takenCode();
    return answered !== undefined && answered === input.code().trim();
  };

  return { taken, check };
};
