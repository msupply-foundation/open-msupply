import { createRoot, createSignal, type JSX } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExportPrintButton } from './ExportPrintButton';

/*
 * The shared Export/Print trigger (spec/reports S4; spec/prescriptions rules ›
 * printing a dispensed visit). Button and the "Select a form" dialog are
 * stand-ins that record what they are given, so these run without a DOM: the
 * button has no native elements of its own.
 */

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}
const buttons: ButtonProps[] = [];
const dialogs: { dataId: string }[] = [];

vi.mock('@/ui/elements/buttons/Button', () => ({
  Button: (props: ButtonProps) => {
    buttons.push(props);
    return 'button';
  },
}));
vi.mock('./SelectReportModal', () => ({
  SelectReportModal: (props: { dataId: string }) => {
    dialogs.push(props);
    return 'dialog';
  },
}));
vi.mock('@/ui/icons', () => ({ PrinterIcon: () => null }));
vi.mock('@/intl', () => ({ t: (key: string) => key }));

afterEach(() => {
  buttons.length = 0;
  dialogs.length = 0;
});

/** What a Show (or any accessor) currently renders. */
const resolve = (value: unknown): unknown =>
  typeof value === 'function' ? resolve((value as () => unknown)()) : value;

const mount = () =>
  createRoot(dispose => {
    const [disabled, setDisabled] = createSignal(false);
    const [dataId, setDataId] = createSignal('rx-a');
    const rendered = ExportPrintButton({
      context: 'PRESCRIPTION',
      get dataId() {
        return dataId();
      },
      get disabled() {
        return disabled();
      },
      disabledReason: 'Nothing to print',
    }) as unknown as JSX.Element[];
    const button = () => buttons[buttons.length - 1]!;
    const dialogShown = () => resolve(rendered[1]) === 'dialog';
    return { dispose, setDisabled, setDataId, button, dialogShown };
  });

describe('ExportPrintButton', () => {
  it('opens the forms dialog for its record when pressed', () => {
    const screen = mount();
    expect(screen.dialogShown()).toBe(false);
    screen.button().onClick();
    expect(screen.dialogShown()).toBe(true);
    expect(dialogs[dialogs.length - 1]?.dataId).toBe('rx-a');
    screen.dispose();
  });

  it('is disabled with its reason as the tooltip when there is nothing to print', () => {
    const screen = mount();
    screen.setDisabled(true);
    expect(screen.button().disabled).toBe(true);
    expect(screen.button().title).toBe('Nothing to print');
    screen.dispose();
  });

  // OMS-REG-DIS-12.305
  it('closes the dialog when the screen loses its record, and it stays closed when one comes back', () => {
    const screen = mount();
    screen.button().onClick();
    screen.setDisabled(true);
    expect(screen.dialogShown()).toBe(false);
    screen.setDisabled(false);
    expect(screen.dialogShown()).toBe(false);
    screen.dispose();
  });

  // OMS-REG-DIS-12.305
  it('closes the dialog when its record changes, so it never prints another one', () => {
    const screen = mount();
    screen.button().onClick();
    screen.setDataId('rx-b');
    expect(screen.dialogShown()).toBe(false);
    screen.dispose();
  });
});
