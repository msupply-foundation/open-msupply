import { convert_data } from './convert_data';
import inputData from '../input.json';
import outputData from '../output.json';

const clone = value => JSON.parse(JSON.stringify(value));

describe('convert_data', () => {
  it('matches the sample output', () => {
    expect(convert_data(clone(inputData))).toEqual(outputData);
  });

  it('adds doses to vaccine stock lines only', () => {
    const { data } = convert_data(clone(inputData));
    const byId = Object.fromEntries(data.stockLines.nodes.map(n => [n.id, n]));
    expect(data.showDoses).toBe(true);
    // 12 packs x 10 vials x 20 doses
    expect(byId['line-bcg'].dosesOnHand).toBe(2400);
    // doses per unit not set counts as 1 dose per vial
    expect(byId['line-mr'].dosesOnHand).toBe(3);
    expect(byId['line-paracetamol'].dosesOnHand).toBeUndefined();
  });

  it('hides the doses column when there are no vaccines', () => {
    const input = clone(inputData);
    input.data.stockLines.nodes = input.data.stockLines.nodes.filter(
      n => !n.item.isVaccine
    );
    expect(convert_data(input).data.showDoses).toBe(false);
  });
});
