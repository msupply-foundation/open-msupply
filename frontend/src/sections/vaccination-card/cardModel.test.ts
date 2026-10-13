import { describe, expect, it, vi } from 'vitest';

// The catalogue isn't loaded in node: render each key with its variables so
// the assertions read what was asked for.
vi.mock('@/intl', () => ({
  t: (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key} ${JSON.stringify(vars)}` : key,
  tPlural: (key: string, count: number) => `${key}#${count}`,
}));

const {
  canGiveToday,
  cardCounts,
  confirmsSkip,
  doseAgeLabel,
  doseEditorDescription,
  isEditable,
  noStatusLabel,
  opensInEncounter,
  patientAgeLabel,
  reasonLabel,
  statusLabel,
  waitsFor,
  wouldSkip,
} = await import('./cardModel');
const { groupPositions } = await import('@/ui/elements/table/rowGroups');
type CardRow = import('./cardModel').CardRow;

// A card row as the server answers it (spec/vaccination-card contract § what
// the card holds), defaulting to an unrecorded dose of course A.
const row = (over: Partial<CardRow> & { id: string }): CardRow => ({
  __typename: 'VaccinationCardItemNode',
  vaccineCourseId: 'A',
  vaccineCourseDoseId: over.id,
  canSkipDose: false,
  vaccinationId: null,
  label: over.id,
  minAgeMonths: 0,
  maxAgeMonths: 1,
  customAgeLabel: null,
  minIntervalDays: 0,
  given: null,
  vaccinationDate: null,
  suggestedDate: null,
  status: null,
  batch: null,
  facilityName: null,
  ...over,
});

// Three doses of a course that does not allow skipping.
const course = (
  s1: CardRow['status'],
  s2: CardRow['status'],
  s3: CardRow['status']
) => [
  row({ id: 'd1', minAgeMonths: 1.5, status: s1 }),
  row({ id: 'd2', minAgeMonths: 2.5, status: s2 }),
  row({ id: 'd3', minAgeMonths: 3.5, status: s3 }),
];

describe('OMS-REG-DIS-06.2 / OMS-REG-DIS-06.34 / OMS-REG-DIS-06.35 — which doses open in an encounter', () => {
  it('opens the first dose of a course whatever its status', () => {
    const rows = course(null, null, null);
    expect(opensInEncounter(rows, rows[0])).toBe(true);
  });
  it('keeps a dose closed while the previous dose is unrecorded (no status, Pending or Overdue)', () => {
    for (const previous of [null, 'PENDING', 'LATE'] as const) {
      const rows = course(previous, 'PENDING', null);
      expect(opensInEncounter(rows, rows[1])).toBe(false);
    }
  });
  it('opens the next dose once the previous dose is recorded — given or not given', () => {
    for (const previous of ['GIVEN', 'NOT_GIVEN'] as const) {
      const rows = course(previous, 'PENDING', null);
      expect(opensInEncounter(rows, rows[1])).toBe(true);
    }
  });
});

describe('OMS-REG-DIS-06.36 — on a course that allows skipping, every dose opens', () => {
  it('opens a later dose with every earlier dose unrecorded', () => {
    const rows = course(null, null, null).map(r => ({
      ...r,
      canSkipDose: true,
    }));
    expect(rows.every(r => opensInEncounter(rows, r))).toBe(true);
  });
});

describe('OMS-REG-DIS-06.37 — a recorded dose earlier than the most recent one opens read-only', () => {
  it('locks the earlier dose and leaves the most recent and later ones editable', () => {
    const rows = course('GIVEN', 'GIVEN', 'PENDING');
    expect(isEditable(rows, rows[0])).toBe(false);
    expect(isEditable(rows, rows[1])).toBe(true);
    expect(isEditable(rows, rows[2])).toBe(true);
  });
  it('leaves the last dose editable once every dose is recorded', () => {
    const rows = course('GIVEN', 'NOT_GIVEN', 'GIVEN');
    expect(isEditable(rows, rows[1])).toBe(false);
    expect(isEditable(rows, rows[2])).toBe(true);
  });
});

describe('OMS-REG-DIS-06.38 — recording a dose that skips an earlier one', () => {
  it('is a skip while the previous dose is unrecorded, Pending or Overdue', () => {
    expect(
      wouldSkip(course(null, 'PENDING', null), course(null, 'PENDING', null)[1])
    ).toBe(true);
    const rows = course('LATE', 'PENDING', null);
    expect(wouldSkip(rows, rows[1])).toBe(true);
  });
  it('is not a skip for a first dose or after a recorded dose', () => {
    const rows = course('NOT_GIVEN', 'PENDING', null);
    expect(wouldSkip(rows, rows[0])).toBe(false);
    expect(wouldSkip(rows, rows[1])).toBe(false);
  });
});

describe('OMS-REG-DIS-06.39 — the skip question', () => {
  it('asks only when the previous dose has no record and no status', () => {
    const rows = course(null, 'PENDING', null);
    expect(confirmsSkip(rows, rows[1])).toBe(true);
  });
  it('does not ask when the previous dose is Pending or Overdue (the inline warning alone)', () => {
    for (const previous of ['PENDING', 'LATE'] as const) {
      const rows = course(previous, 'PENDING', null);
      expect(confirmsSkip(rows, rows[1])).toBe(false);
    }
  });
});

describe('OMS-REG-DIS-06.25 / OMS-REG-DIS-06.67 — the card reads by age across its courses', () => {
  // The Age column's value is the dose's age label, and the table groups a
  // run of equal values (meta.groupRows): each age shows once, on the first
  // dose of its group, in the server's order.
  it('keeps the server order, showing each age once on the first dose of its group', () => {
    const rows = [
      row({ id: 'bcg', vaccineCourseId: 'B', customAgeLabel: 'At birth' }),
      row({ id: 'opv0', vaccineCourseId: 'O', customAgeLabel: 'At birth' }),
      row({ id: 'opv1', vaccineCourseId: 'O', minAgeMonths: 1.5 }),
      row({ id: 'penta1', vaccineCourseId: 'P', minAgeMonths: 1.5 }),
      row({ id: 'mr1', vaccineCourseId: 'M', minAgeMonths: 9 }),
    ];
    const ages = rows.map(doseAgeLabel);
    expect(ages).toEqual([
      'At birth',
      'At birth',
      'label.age-weeks-count#6',
      'label.age-weeks-count#6',
      'label.age-months-count#9',
    ]);
    expect(groupPositions(ages).map(p => p.continuesPrevious)).toEqual([
      false,
      true,
      false,
      true,
      false,
    ]);
  });
});

describe('OMS-REG-DIS-06.26 — the Age column', () => {
  it('shows a custom age label when the dose has one', () => {
    expect(
      doseAgeLabel(row({ id: 'x', minAgeMonths: 9, customAgeLabel: '9 mo' }))
    ).toBe('9 mo');
  });
  it("shows whole weeks under four months, in the course editor's convention (6/10/14 weeks = 1.5/2.5/3.5 months)", () => {
    expect(
      [1.5, 2.5, 3.5].map(m => doseAgeLabel(row({ id: 'x', minAgeMonths: m })))
    ).toEqual([
      'label.age-weeks-count#6',
      'label.age-weeks-count#10',
      'label.age-weeks-count#14',
    ]);
  });
  it('shows months from four months on', () => {
    expect(doseAgeLabel(row({ id: 'x', minAgeMonths: 18 }))).toBe(
      'label.age-months-count#18'
    );
  });
});

describe('OMS-REG-DIS-06.68 / OMS-REG-DIS-06.27 / OMS-FUN-VAC-002.6 — the status words', () => {
  it('reads Pending as "Due" and Late as "Overdue"', () => {
    expect(statusLabel('PENDING')).toBe('label.status-due');
    expect(statusLabel('LATE')).toBe('label.status-late');
    expect(statusLabel('GIVEN')).toBe('label.status-given');
    expect(statusLabel('NOT_GIVEN')).toBe('label.status-not-given');
  });
});

describe('OMS-REG-DIS-06.28 / OMS-REG-DIS-06.29 — a dose with no status', () => {
  it('reads "Not yet due" for a patient with a date of birth', () => {
    expect(noStatusLabel(true)).toBe('label.not-yet-due');
  });
  it('reads blank for a patient with no date of birth', () => {
    expect(noStatusLabel(false)).toBe('');
  });
});

describe("OMS-REG-DIS-06.70 / OMS-REG-DIS-06.72 / OMS-REG-DIS-06.73 — the card's counts", () => {
  const rows = [
    row({ id: 'a1', vaccineCourseId: 'A', status: 'GIVEN' }),
    row({ id: 'a2', vaccineCourseId: 'A', status: 'PENDING' }),
    row({ id: 'b1', vaccineCourseId: 'B', status: 'LATE' }),
    row({ id: 'b2', vaccineCourseId: 'B', status: 'PENDING' }),
    row({ id: 'c1', vaccineCourseId: 'C', status: null }),
  ];
  it('counts given doses out of every row', () => {
    expect(cardCounts(rows)).toMatchObject({ given: 1, total: 5 });
  });
  it('counts the Due doses that would open as givable today, leaving out one waiting on an earlier dose', () => {
    expect(cardCounts(rows).dueToday).toBe(1);
  });
  it('counts every Overdue dose as catch-up', () => {
    expect(cardCounts(rows).overdue).toBe(1);
  });
  it('counts none on a card with nothing due or overdue', () => {
    expect(cardCounts(course('GIVEN', 'GIVEN', null))).toMatchObject({
      dueToday: 0,
      overdue: 0,
    });
  });
});

describe('OMS-REG-DIS-06.71 — a dose that can be given today is marked', () => {
  it('marks a Due or Overdue dose that would open, and no other', () => {
    const rows = course('GIVEN', 'LATE', 'PENDING');
    expect(canGiveToday(rows, rows[0])).toBe(false);
    expect(canGiveToday(rows, rows[1])).toBe(true);
    expect(canGiveToday(rows, rows[2])).toBe(false);
  });
});

describe('OMS-REG-DIS-06.74 — a dose that would not open names what it waits for', () => {
  it('names the earlier dose', () => {
    const rows = course('PENDING', 'PENDING', null);
    expect(waitsFor(rows, rows[1])).toBe('d1');
  });
  it('names nothing for a dose that opens, or one not yet due', () => {
    const rows = course('GIVEN', 'PENDING', null);
    expect(waitsFor(rows, rows[1])).toBeUndefined();
    expect(waitsFor(rows, rows[2])).toBeUndefined();
  });
});

describe('OMS-REG-DIS-06.75 — the reason a dose was not given', () => {
  it('shows an offered reason by its label', () => {
    expect(reasonLabel('OUT_OF_STOCK')).toBe('label.out-of-stock');
  });
  it("shows any other reason as written — the skip fill's sentence included", () => {
    expect(reasonLabel('Dose skipped (Later dose administered)')).toBe(
      'Dose skipped (Later dose administered)'
    );
  });
});

describe("OMS-REG-DIS-06.69 — the patient's age in the summary", () => {
  it('reads weeks under three months, months under two years, then years', () => {
    expect(patientAgeLabel('2026-09-01', '2026-10-12')).toBe(
      'label.age-weeks-short {"count":5}'
    );
    expect(patientAgeLabel('2026-03-02', '2026-10-12')).toBe(
      'label.age-months-short {"count":7}'
    );
    expect(patientAgeLabel('2023-01-01', '2026-10-12')).toBe(
      'label.age-years-short {"count":3}'
    );
  });
});

describe('OMS-REG-DIS-06.77 — the editor of an Overdue dose', () => {
  it('says when the dose is due, and that an Overdue one may be a catch-up', () => {
    const due = row({ id: 'x', minAgeMonths: 9, status: 'PENDING' });
    expect(doseEditorDescription(due)).toBe(
      'messages.dose-due-at {"age":"label.age-months-count#9"}'
    );
    expect(doseEditorDescription({ ...due, status: 'LATE' })).toContain(
      'messages.dose-catch-up'
    );
  });
});
