import React from 'react';
import { ToggleButtonGroup } from '../../../components/buttons/ToggleButton/ToggleButtonGroup';
import { ListIcon } from '../../../icons/List';
import { ColumnsIcon } from '../../../icons/Columns';
import { ViewMode } from './types';

interface ViewToggleProps {
  currentView: ViewMode;
  onToggle: (view: ViewMode) => void;
}

const VIEW_OPTIONS: {
  id: string;
  value: ViewMode;
  icon: React.ReactNode;
  label: string;
}[] = [
  { id: 'table', value: 'table', icon: <ListIcon />, label: 'Table view' },
  { id: 'card', value: 'card', icon: <ColumnsIcon />, label: 'Card view' },
];

export const ViewToggle = ({ currentView, onToggle }: ViewToggleProps) => (
  <ToggleButtonGroup
    value={currentView}
    onChange={onToggle}
    options={VIEW_OPTIONS}
  />
);
