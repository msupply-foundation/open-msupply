import { describe, expect, it } from 'vitest';
import { offeredReasons, type ReasonOption } from '.';

const reason = (type: ReasonOption['type']): ReasonOption =>
  ({ id: type, type, reason: type }) as ReasonOption;

const ALL = [
  reason('POSITIVE_INVENTORY_ADJUSTMENT'),
  reason('NEGATIVE_INVENTORY_ADJUSTMENT'),
  reason('OPEN_VIAL_WASTAGE'),
  reason('CLOSED_VIAL_WASTAGE'),
  reason('RETURN_REASON'),
];

const types = (rs: ReasonOption[]) => rs.map(r => r.type);

describe('offeredReasons', () => {
  it('OMS-REG-INV-03.98: a non-vaccine reduction offers the plain negative reasons only', () => {
    for (const isDispensary of [false, true]) {
      expect(
        types(
          offeredReasons(ALL, 'negative', { isVaccine: false, isDispensary })
        )
      ).toEqual(['NEGATIVE_INVENTORY_ADJUSTMENT']);
    }
  });

  it('OMS-REG-INV-03.98: a vaccine reduction offers closed-vial wastage, plus open-vial in a dispensary', () => {
    expect(
      types(
        offeredReasons(ALL, 'negative', {
          isVaccine: true,
          isDispensary: false,
        })
      )
    ).toEqual(['CLOSED_VIAL_WASTAGE']);
    expect(
      types(
        offeredReasons(ALL, 'negative', { isVaccine: true, isDispensary: true })
      )
    ).toEqual(['OPEN_VIAL_WASTAGE', 'CLOSED_VIAL_WASTAGE']);
  });

  it('OMS-REG-INV-03.98: a vaccine reduction falls back to the plain negative reasons when no wastage reason applies', () => {
    const noWastage = ALL.filter(r => !r.type.endsWith('_VIAL_WASTAGE'));
    expect(
      types(
        offeredReasons(noWastage, 'negative', {
          isVaccine: true,
          isDispensary: true,
        })
      )
    ).toEqual(['NEGATIVE_INVENTORY_ADJUSTMENT']);
    // Open-vial alone is dispensary-only, so outside one it falls back too.
    const openOnly = ALL.filter(r => r.type !== 'CLOSED_VIAL_WASTAGE');
    expect(
      types(
        offeredReasons(openOnly, 'negative', {
          isVaccine: true,
          isDispensary: false,
        })
      )
    ).toEqual(['NEGATIVE_INVENTORY_ADJUSTMENT']);
  });

  it('leaves the other kinds unnarrowed by the vaccine flag', () => {
    expect(
      types(
        offeredReasons(ALL, 'positive', { isVaccine: true, isDispensary: true })
      )
    ).toEqual(['POSITIVE_INVENTORY_ADJUSTMENT']);
    expect(
      types(
        offeredReasons(ALL, 'return', { isVaccine: true, isDispensary: true })
      )
    ).toEqual(['RETURN_REASON']);
  });
});
