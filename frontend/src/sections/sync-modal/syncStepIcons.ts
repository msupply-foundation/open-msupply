import type { Component } from 'solid-js';
import {
  ChevronsUpIcon,
  ChevronsDownIcon,
  ClockIcon,
  DownloadIcon,
  type IconProps,
} from '../../ui/icons';
import type { SyncStepKind } from './syncStatus';

// Marker icon per phase, by intent (spec/sync-modal/ui-surface.md § Layout):
// push = up chevrons, wait = clock, pull = down chevrons, integrate = the
// download glyph; the initialisation-only prepare phase has none, so
// ProgressList falls back to the step number.
export const syncStepIcon: Record<
  SyncStepKind,
  Component<IconProps> | undefined
> = {
  push: ChevronsUpIcon,
  wait: ClockIcon,
  pull: ChevronsDownIcon,
  integrate: DownloadIcon,
  prepare: undefined,
};
