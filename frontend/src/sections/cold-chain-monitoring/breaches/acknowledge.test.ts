import { describe, expect, it } from 'vitest';
import {
  acknowledgeState,
  attributionVars,
  buildAcknowledgeInput,
  canConfirm,
  isCommentValid,
} from './acknowledge';

// The acknowledgement modal's two guards and its write, at the logic level
// (spec/cold-chain-monitoring rules › acknowledging a breach; ui-surface S3).
// Both guards are the frontend's alone — the server enforces neither.
// Anchors: spec/cold-chain-monitoring/cases/OMS-REG-CCE-02.

const ONGOING = { endDatetime: null };
const ENDED = { endDatetime: '2026-09-08T09:00:00.000Z' };

describe('OMS-REG-CCE-02.17 — an ongoing breach is told it cannot be acknowledged', () => {
  it('puts the modal in its ongoing state exactly while the breach has no end', () => {
    expect(acknowledgeState(ONGOING)).toBe('ongoing');
    expect(acknowledgeState(ENDED)).toBe('ended');
  });
});

describe('OMS-REG-CCE-02.18 — acknowledging an ongoing breach cannot be completed', () => {
  it('never enables confirm for an ongoing breach, whatever the comment', () => {
    expect(canConfirm(ONGOING, '')).toBe(false);
    expect(canConfirm(ONGOING, 'the door was open')).toBe(false);
  });
});

describe('OMS-REG-CCE-02.19 — an ended breach needs a non-empty comment first', () => {
  it('keeps confirm disabled until a comment is entered', () => {
    expect(canConfirm(ENDED, '')).toBe(false);
    expect(canConfirm(ENDED, 'the door was open')).toBe(true);
  });

  it('does not accept whitespace as a comment — the server would', () => {
    for (const blank of [' ', '   ', '\t', '\n', '\r\n', ' ', '　'])
      expect(isCommentValid(blank)).toBe(false);
    expect(canConfirm(ENDED, '   ')).toBe(false);
    expect(isCommentValid(' x ')).toBe(true);
  });
});

describe('OMS-REG-CCE-02.20 — acknowledging stores the attributed, dated comment', () => {
  it('sends the acknowledged state — unacknowledged: false — with the comment', () => {
    expect(
      buildAcknowledgeInput(
        'breach-1',
        'Acknowledged by demo on 8 Sep 2026: ok.'
      )
    ).toEqual({
      id: 'breach-1',
      unacknowledged: false,
      comment: 'Acknowledged by demo on 8 Sep 2026: ok.',
    });
  });

  it('composes the attribution from the user’s name, the moment and the trimmed text', () => {
    expect(
      attributionVars('  door left open  ', 'Demo User', '08/09/2026, 10:00')
    ).toEqual({
      name: 'Demo User',
      date: '08/09/2026, 10:00',
      comment: 'door left open',
    });
  });

  it('never builds the un-acknowledge direction — acknowledgement is one-way here', () => {
    const input = buildAcknowledgeInput('breach-1', 'x');
    expect(input.unacknowledged).toBe(false);
  });
});
