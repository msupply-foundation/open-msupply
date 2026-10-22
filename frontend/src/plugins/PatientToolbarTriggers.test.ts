import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The patient toolbar trigger slot's decisions (kdd/custom-forms/specs.md §
 * Forms in the UI, trigger slots): whether a trigger shows for the patient, and
 * what its click runs. The buttons are the host's own; these are the parts a
 * plugin's code decides.
 */

vi.mock('../ui/elements/buttons/Button', () => ({ Button: () => null }));

import { runTrigger, triggerShows } from './PatientToolbarTriggers';
import { pluginDiagnostics } from './diagnostics';
import type { RegisteredContribution } from './registry';
import type { PatientTriggerProps } from '../plugin-sdk/types';

type Trigger = RegisteredContribution<'patient.toolbarTrigger'>;

const trigger = (overrides: Partial<Trigger> = {}): Trigger => ({
  slot: 'patient.toolbarTrigger',
  id: 'record-follow-up',
  pluginCode: 'demo_program',
  label: 'button.record-follow-up',
  onClick: () => undefined,
  ...overrides,
});

const enrolled: PatientTriggerProps = {
  patient: { id: 'patient-1', enrolmentTypes: ['DemoProgramEnrolment'] },
};
const notEnrolled: PatientTriggerProps = {
  patient: { id: 'patient-2', enrolmentTypes: [] },
};

const inDemo: Trigger['visible'] = ({ patient }) =>
  patient.enrolmentTypes.includes('DemoProgramEnrolment');

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('triggerShows', () => {
  it('shows a trigger with no record gate', () => {
    expect(triggerShows(trigger(), notEnrolled)).toBe(true);
  });

  it("answers from the trigger's record gate", () => {
    expect(triggerShows(trigger({ visible: inDemo }), enrolled)).toBe(true);
    expect(triggerShows(trigger({ visible: inDemo }), notEnrolled)).toBe(false);
  });

  it('hides a trigger whose gate throws, and names it', () => {
    const before = pluginDiagnostics().length;
    const shows = triggerShows(
      trigger({
        visible: () => {
          throw new Error('boom');
        },
      }),
      enrolled
    );
    expect(shows).toBe(false);
    expect(pluginDiagnostics().slice(before)).toEqual([
      expect.objectContaining({
        pluginCode: 'demo_program',
        message: expect.stringContaining('its visible threw'),
      }),
    ]);
  });

  it('names a throwing gate once, however often it runs, logging every throw', () => {
    const errors = vi.mocked(console.error);
    const before = pluginDiagnostics().length;
    const throwing = trigger({
      id: 'throws-repeatedly',
      visible: () => {
        throw new Error('boom');
      },
    });
    for (const props of [enrolled, notEnrolled, enrolled]) {
      expect(triggerShows(throwing, props)).toBe(false);
    }
    expect(pluginDiagnostics().slice(before)).toHaveLength(1);
    expect(
      errors.mock.calls.filter(([line]) =>
        String(line).includes('throws-repeatedly visible threw')
      )
    ).toHaveLength(3);
  });
});

describe('runTrigger', () => {
  it('hands the handler the patient and an openDocumentForm naming the plugin', () => {
    const open = vi.fn();
    const onClick = vi.fn<Trigger['onClick']>((_props, actions) =>
      actions.openDocumentForm({ documentType: 'DemoEncounter' })
    );
    runTrigger(trigger({ onClick }), enrolled, open);
    expect(onClick).toHaveBeenCalledWith(enrolled, expect.any(Object));
    expect(open).toHaveBeenCalledWith('DemoEncounter', 'demo_program');
  });

  it('names an async handler whose promise rejects, rather than leaving it unhandled', async () => {
    const before = pluginDiagnostics().length;
    let reject!: (error: Error) => void;
    const pending = new Promise<void>((_, r) => (reject = r));
    expect(() =>
      runTrigger(trigger({ onClick: () => pending }), enrolled, vi.fn())
    ).not.toThrow();
    expect(pluginDiagnostics().slice(before)).toEqual([]);

    reject(new Error('boom'));
    await vi.waitFor(() =>
      expect(pluginDiagnostics().slice(before)[0]?.message).toContain(
        'its onClick threw'
      )
    );
  });

  it('does nothing more for a handler that throws, and names it', () => {
    const before = pluginDiagnostics().length;
    expect(() =>
      runTrigger(
        trigger({
          onClick: () => {
            throw new Error('boom');
          },
        }),
        enrolled,
        vi.fn()
      )
    ).not.toThrow();
    expect(pluginDiagnostics().slice(before)[0]?.message).toContain(
      'its onClick threw'
    );
  });

  it('names a handler that throws on every click', () => {
    const before = pluginDiagnostics().length;
    const throwing = trigger({
      id: 'throws-on-click',
      onClick: () => {
        throw new Error('boom');
      },
    });
    runTrigger(throwing, enrolled, vi.fn());
    runTrigger(throwing, enrolled, vi.fn());
    expect(pluginDiagnostics().slice(before)).toHaveLength(2);
  });
});
