import { describe, expect, it } from 'vitest';
import { categoryErrorCount } from '../../plugin-sdk/formCategories/FormCategories';
import { multiSelectItems } from './MultiSelectInput';
import { previousValueText } from './PreviousEncounterValue';

/*
 * The form library pieces an encounter form with categories needs, by their
 * logic: a category tile's error count, the multi-select's options and the
 * previous encounter's value.
 */

describe('categoryErrorCount', () => {
  it('counts the errors at or under any of the category paths', () => {
    const errors = [
      'extension.history.observations',
      'extension.menstrualCycle.duration',
      'extension.generalExamination.weight',
    ];
    expect(
      categoryErrorCount(errors, [
        'extension.menstrualCycle',
        'extension.history',
      ])
    ).toBe(2);
    expect(categoryErrorCount(errors, ['extension.generalExamination'])).toBe(
      1
    );
    expect(categoryErrorCount(errors, ['extension.contraceptiveMethod'])).toBe(
      0
    );
  });

  it('does not count a sibling whose name only begins like the path', () => {
    expect(
      categoryErrorCount(['extension.historyNotes'], ['extension.history'])
    ).toBe(0);
    expect(
      categoryErrorCount(['extension.history'], ['extension.history'])
    ).toBe(1);
  });
});

describe('multiSelectItems', () => {
  const labels = { POP: 'POP', DIU: 'DIU', INJ: 'INJ', IMP: 'IMP', PP: 'PP' };

  it('lists the options by label, as the old client sorts them', () => {
    expect(multiSelectItems(labels, [], 'fr')).toEqual([
      'DIU',
      'IMP',
      'INJ',
      'POP',
      'PP',
    ]);
  });

  it("orders by the labels in the session's language, not the values", () => {
    expect(multiSelectItems({ a: 'Zèbre', b: 'Âne' }, [], 'fr')).toEqual([
      'b',
      'a',
    ]);
  });

  it('keeps a stored value with no label, after the others', () => {
    expect(multiSelectItems({ DIU: 'DIU' }, ['DIU', 'OLD'], 'fr')).toEqual([
      'DIU',
      'OLD',
    ]);
  });
});

describe('previousValueText', () => {
  const previous = {
    data: {
      extension: {
        history: { observations: 'Cycle régulier.\nRAS.' },
        generalExamination: { weight: 1234.5 },
      },
    },
  };

  it('reads the text the previous encounter holds, and a number in the local format', () => {
    expect(previousValueText(previous, 'extension.history.observations')).toBe(
      'Cycle régulier.\nRAS.'
    );
    expect(
      previousValueText(previous, 'extension.generalExamination.weight')
    ).toBe('1,234.5');
  });

  it('is empty where it holds nothing, or there is no previous encounter', () => {
    expect(
      previousValueText(previous, 'extension.gynaecologicalExamination')
    ).toBe('');
    expect(previousValueText(undefined, 'extension.history.observations')).toBe(
      ''
    );
  });
});
