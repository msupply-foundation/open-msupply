import React from 'react';
import { ColumnsIcon, ListIcon } from '@common/icons';
import { ToggleButtonGroup } from '@common/components';
import { ViewMode } from '../tableState/utils';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const viewModeOptions: {
  id: string;
  value: ViewMode;
  icon: React.ReactNode;
  label: string;
}[] = [
  { id: 'table', value: 'table', icon: <ColumnsIcon />, label: 'Table view' },
  { id: 'card', value: 'card', icon: <ListIcon />, label: 'Card view' },
];

export const ViewModeToggle = ({
  viewMode,
  onViewModeChange,
}: ViewModeToggleProps) => (
  <ToggleButtonGroup
    value={viewMode}
    onChange={onViewModeChange}
    options={viewModeOptions}
  />
);
