import { useState } from 'react';
import { ViewMode } from './types';

export const useViewMode = (defaultMode: ViewMode = 'table') => {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  return { viewMode, setViewMode };
};
