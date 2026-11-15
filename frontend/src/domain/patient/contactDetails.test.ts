import { describe, expect, it } from 'vitest';
import { withFirstContact } from './contactDetails';

describe('withFirstContact (the block the server projects)', () => {
  it('starts a first block for a patient with none', () => {
    expect(withFirstContact(undefined, 'phone', '555 0142')).toEqual([
      { phone: '555 0142' },
    ]);
  });

  it("changes one field of the first block and keeps the block's others", () => {
    expect(
      withFirstContact(
        [{ address1: '14 Riverside Road', phone: '555 0142', email: 'j@x' }],
        'phone',
        '555 0199'
      )
    ).toEqual([
      { address1: '14 Riverside Road', phone: '555 0199', email: 'j@x' },
    ]);
  });

  it('keeps every later block as it was', () => {
    const work = { description: 'work', phone: '555 9999' };
    expect(
      withFirstContact([{ phone: '1' }, work], 'address1', 'Home St')
    ).toEqual([{ phone: '1', address1: 'Home St' }, work]);
  });

  it('removes a cleared field rather than storing it empty', () => {
    expect(
      withFirstContact([{ address1: 'A', phone: '1' }], 'phone', undefined)
    ).toEqual([{ address1: 'A' }]);
  });
});
