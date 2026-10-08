import { convert_data } from './convert_data';
import inputData from '../input.json';
import outputData from '../output.json';

const clone = value => JSON.parse(JSON.stringify(value));

describe('convert_data', () => {
  it('matches the sample output', () => {
    expect(convert_data(clone(inputData))).toEqual(outputData);
  });

  it('adds doses to vaccine items only', () => {
    const { data } = convert_data(clone(inputData));
    const byCode = Object.fromEntries(data.items.nodes.map(n => [n.code, n]));
    expect(data.showDoses).toBe(true);
    expect(byCode.BCG20.dosesOnHand).toBe(2400);
    // doses per unit not set counts as 1 dose per vial
    expect(byCode.MR10.dosesOnHand).toBe(15);
    expect(byCode.PAR500.dosesOnHand).toBeUndefined();
  });

  it('hides the doses column when there are no vaccines', () => {
    const input = clone(inputData);
    input.data.items.nodes = input.data.items.nodes.filter(n => !n.isVaccine);
    expect(convert_data(input).data.showDoses).toBe(false);
  });
});
