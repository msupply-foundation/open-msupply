/*
 * Form participation (spec/plugins/rules.md § form participation;
 * acceptance AC-PLUG-F2 "Veto aborts atomically"):
 *
 * · a contribution can VETO a save before persistence — the save is aborted,
 *   nothing is persisted, and the veto's message is surfaced;
 * · it can act AFTER a successful save, and the save is not reported complete
 *   until it has;
 * · "everything a contribution registered is released when it leaves the screen
 *   — a departed contribution can no longer affect a save."
 *
 * The release rule is the one that bites in production: a handler that outlives
 * its contribution vetoes a save the user can no longer see a form for. It is
 * `onCleanup`-backed, so these tests run inside `createRoot` and dispose it to
 * simulate the contribution leaving.
 */
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import { createSaveCoordinator } from './formParticipation';

const context = { recordId: 'prescription-1' };

describe('AC-PLUG-F2 — before-save veto', () => {
  it('reports ok when no contribution objects', async () => {
    const coordinator = createSaveCoordinator();
    await expect(coordinator.runBeforeSave()).resolves.toEqual({ kind: 'ok' });
  });

  it('aborts with the thrown message', async () => {
    const outcome = await createRoot(async () => {
      const coordinator = createSaveCoordinator();
      coordinator.participationFor('civ').onBeforeSave(() => {
        throw new Error('Amount paid is less than the amount outstanding');
      });
      return coordinator.runBeforeSave();
    });
    expect(outcome).toEqual({
      kind: 'vetoed',
      message: 'Amount paid is less than the amount outstanding',
    });
  });

  it('awaits an async handler and honours its rejection', async () => {
    const outcome = await createRoot(async () => {
      const coordinator = createSaveCoordinator();
      coordinator
        .participationFor('civ')
        .onBeforeSave(() => Promise.reject(new Error('too slow')));
      return coordinator.runBeforeSave();
    });
    expect(outcome).toEqual({ kind: 'vetoed', message: 'too slow' });
  });

  it('surfaces something showable when a non-Error is thrown', async () => {
    const outcome = await createRoot(async () => {
      const coordinator = createSaveCoordinator();
      coordinator.participationFor('civ').onBeforeSave(() => {
        throw 'plain string';
      });
      return coordinator.runBeforeSave();
    });
    expect(outcome).toEqual({ kind: 'vetoed', message: 'plain string' });
  });

  it('stops at the first veto — later handlers never run', async () => {
    const second = vi.fn();
    const outcome = await createRoot(async () => {
      const coordinator = createSaveCoordinator();
      const form = coordinator.participationFor('civ');
      form.onBeforeSave(() => {
        throw new Error('first');
      });
      form.onBeforeSave(second);
      return coordinator.runBeforeSave();
    });
    expect(outcome).toEqual({ kind: 'vetoed', message: 'first' });
    expect(second).not.toHaveBeenCalled();
  });

  it('runs handlers in registration order', async () => {
    const order: string[] = [];
    await createRoot(async () => {
      const coordinator = createSaveCoordinator();
      const civ = coordinator.participationFor('civ');
      const haiti = coordinator.participationFor('haiti');
      civ.onBeforeSave(() => void order.push('civ'));
      haiti.onBeforeSave(() => void order.push('haiti'));
      return coordinator.runBeforeSave();
    });
    expect(order).toEqual(['civ', 'haiti']);
  });
});

describe('after-save', () => {
  it('awaits every handler and passes the saved record', async () => {
    const seen: string[] = [];
    const outcome = await createRoot(async () => {
      const coordinator = createSaveCoordinator();
      coordinator.participationFor('civ').onAfterSave(async saved => {
        await Promise.resolve();
        seen.push(saved.recordId);
      });
      return coordinator.runAfterSave(context);
    });
    expect(outcome).toEqual({ kind: 'ok' });
    expect(seen).toEqual(['prescription-1']);
  });

  it('reports a failure rather than losing it', async () => {
    const outcome = await createRoot(async () => {
      const coordinator = createSaveCoordinator();
      coordinator.participationFor('civ').onAfterSave(() => {
        throw new Error('Failed to save plugin data');
      });
      return coordinator.runAfterSave(context);
    });
    expect(outcome).toEqual({
      kind: 'failed',
      message: 'Failed to save plugin data',
    });
  });
});

describe('release on cleanup — a departed contribution cannot affect a save', () => {
  it('drops before-save handlers when the contribution is disposed', async () => {
    const handler = vi.fn(() => {
      throw new Error('should never veto');
    });
    let coordinator!: ReturnType<typeof createSaveCoordinator>;
    createRoot(dispose => {
      coordinator = createSaveCoordinator();
      coordinator.participationFor('civ').onBeforeSave(handler);
      dispose();
    });
    await expect(coordinator.runBeforeSave()).resolves.toEqual({ kind: 'ok' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('drops after-save handlers when the contribution is disposed', async () => {
    const handler = vi.fn();
    let coordinator!: ReturnType<typeof createSaveCoordinator>;
    createRoot(dispose => {
      coordinator = createSaveCoordinator();
      coordinator.participationFor('civ').onAfterSave(handler);
      dispose();
    });
    await coordinator.runAfterSave(context);
    expect(handler).not.toHaveBeenCalled();
  });

  it('drops only the departed contribution', async () => {
    const gone = vi.fn();
    const stays = vi.fn();
    let coordinator!: ReturnType<typeof createSaveCoordinator>;
    createRoot(() => {
      coordinator = createSaveCoordinator();
      coordinator.participationFor('stays').onBeforeSave(stays);
      createRoot(dispose => {
        coordinator.participationFor('gone').onBeforeSave(gone);
        dispose();
      });
    });
    await coordinator.runBeforeSave();
    expect(gone).not.toHaveBeenCalled();
    expect(stays).toHaveBeenCalledOnce();
  });
});

describe('dirty and validity', () => {
  it('is clean and valid with nothing declared', () => {
    const coordinator = createSaveCoordinator();
    expect(coordinator.dirty()).toBe(false);
    expect(coordinator.invalidMessage()).toBeUndefined();
  });

  it('tracks dirty per contribution', () => {
    createRoot(() => {
      const coordinator = createSaveCoordinator();
      const civ = coordinator.participationFor('civ');
      expect(coordinator.dirty()).toBe(false);
      civ.setDirty(true);
      expect(coordinator.dirty()).toBe(true);
      civ.setDirty(false);
      expect(coordinator.dirty()).toBe(false);
    });
  });

  it('surfaces the first invalid field message', () => {
    createRoot(() => {
      const coordinator = createSaveCoordinator();
      const civ = coordinator.participationFor('civ');
      civ.setValidity('amountPaid', { valid: true });
      expect(coordinator.invalidMessage()).toBeUndefined();
      civ.setValidity('amountPaid', {
        valid: false,
        message: 'Amount outstanding',
      });
      expect(coordinator.invalidMessage()).toBe('Amount outstanding');
    });
  });

  it('does not let one contribution clear another contribution field', () => {
    createRoot(() => {
      const coordinator = createSaveCoordinator();
      coordinator
        .participationFor('civ')
        .setValidity('amount', { valid: false, message: 'civ says no' });
      coordinator
        .participationFor('haiti')
        .setValidity('amount', { valid: true });
      expect(coordinator.invalidMessage()).toBe('civ says no');
    });
  });

  it('releases a departed contribution dirty and validity state', () => {
    createRoot(() => {
      const coordinator = createSaveCoordinator();
      createRoot(dispose => {
        const gone = coordinator.participationFor('gone');
        gone.setDirty(true);
        gone.setValidity('amount', { valid: false, message: 'gone says no' });
        expect(coordinator.dirty()).toBe(true);
        expect(coordinator.invalidMessage()).toBe('gone says no');
        dispose();
      });
      expect(coordinator.dirty()).toBe(false);
      expect(coordinator.invalidMessage()).toBeUndefined();
    });
  });
});
