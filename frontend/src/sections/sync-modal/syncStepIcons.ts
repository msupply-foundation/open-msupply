import type { Component } from 'solid-js';
import {
  ChevronsDownIcon,
  ChevronsUpIcon,
  ClockIcon,
  DownloadIcon,
  type IconProps,
} from '../../ui/icons';
import type { SyncStepKind } from './syncStatus';

// Marker icon per phase, by intent — the current app's choices (push up,
// pull down, a clock while queued, the integrate glyph; the initialisation
// prepare phase shows an empty marker). Shared by the sync modal and the
// initialisation screen (spec/sync-modal/ui-surface.md § Layout).
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
