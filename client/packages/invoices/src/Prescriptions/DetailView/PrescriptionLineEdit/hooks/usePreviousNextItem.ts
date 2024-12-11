interface itemId {
  id: string;
}

interface prevNextState {
  hasPrevious: boolean;
  previous: null | string;
  hasNext: boolean;
  next: null | string;
}

export const usePreviousNextItem = (items?: itemId[], currentItem?: string) => {
  if (!items) {
    return { hasNext: false, next: null, hasPrevious: false, previous: null };
  }

  if (!currentItem) {
    // Assume if we don't have a current item, we're adding a new item
    return {
      hasNext: false,
      next: null,
      hasPrevious: items.length > 0,
      previous: items[items.length - 1]?.id ?? null,
    };
  }

  const state: prevNextState = {
    hasNext: true,
    next: null,
    hasPrevious: true,
    previous: null,
  };
  const idx = items.findIndex(i => i.id === currentItem);
  const previous = items[idx - 1];
  const next = items[idx + 1];

  if (idx === -1) {
    return {
      hasNext: false,
      next: null,
      hasPrevious: items.length > 0,
      previous: items[items.length - 1]?.id ?? null,
    };
  }

  if (!previous) {
    state.hasPrevious = false;
  } else {
    state.previous = previous.id;
  }

  if (!next) {
    state.hasNext = false;
  } else {
    state.next = next.id;
  }

  return state;
};
