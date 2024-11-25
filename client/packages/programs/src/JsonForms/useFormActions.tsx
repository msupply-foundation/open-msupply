/**
 * Some JSONForm components can have actions associated with them, which are
 * executed when the whole form is saved/submitted. This hook provides a
 * mechanism to "register" such actions. They can be defined to be run either
 * *before* or *after* the main "Save" action (in useJsonForms)
 *
 * This hook is only called from `useJsonForms` and the "formActions" object it
 * returns is passed to all form components on the main `config` prop. This
 * ensures all form components are sharing a comment Actions registry.
 *
 * We also provide some additional state management. We may need to keep some
 * "intermediate" data that isn't part of the form data proper, yet needs to be
 * accessible outside a particular component, or if the component gets unmounted
 * (e.g. ones that appear in modals). This state can also be used in these Form
 * Actions too.
 *
 * Note that both the Actions register and this State object use `useRef` rather
 * than `useState`. Updating them won't cause a re-render of any components,
 * which helps with performance, but also means that only state that doesn't
 * need to be directly reflected in the UI should be stored here.
 */

import { Dispatch, SetStateAction, useCallback, useRef } from 'react';
import { ObjUtils } from '@common/utils';

export type SubmitActionRegistry = Record<
  string,
  {
    action: (state: Record<string, unknown>) => void;
    preSubmit: boolean;
  }
>;

export interface FormActionStructure {
  setState: (key: string, value: unknown) => void;
  getState: (key?: string) => unknown;
  register: (key: string, action: () => void, preSubmit: boolean) => void;
  run: (input: { preSubmit: boolean }) => void;
}

export const useFormActions = (
  setIsDirty: Dispatch<SetStateAction<boolean | undefined>>
): FormActionStructure => {
  const state = useRef<Record<string, unknown>>({});
  const submitActions = useRef<SubmitActionRegistry>({});

  const setState = (key: string, value: unknown, setDirty: boolean = true) => {
    const currentValue = state.current[key];
    if (setDirty && !ObjUtils.isEqual(currentValue, value)) setIsDirty(true);
    state.current[key] = value;
    console.log('State', state);
  };

  const getState = (key?: string) => {
    if (!key) return state.current;
    else return state.current[key];
  };

  const register = useCallback(
    (
      key: string,
      action: (state: Record<string, unknown>) => void,
      preSubmit: boolean = false
    ) => {
      submitActions.current[key] = { action, preSubmit };
    },
    []
  );

  const run = async (input: { preSubmit: boolean } = { preSubmit: false }) => {
    const actions = Object.values(submitActions.current)
      .filter(({ preSubmit }) => preSubmit === input.preSubmit)
      .map(({ action }) => action);

    for (const action of actions) {
      await action(state.current);
    }
  };

  return { setState, getState, register, run };
};
