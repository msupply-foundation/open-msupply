import { FnUtils } from '@common/utils';
import { useState } from 'react';

type Event<EventInput, EventResult> = (
  input: EventInput
) => Promise<EventResult>;

export const usePluginEvents = <
  State,
  EventInput = { id: string },
  EventResult = void,
>(
  defaultState: State
) => {
  const [state, setState] = useState<State>(defaultState);
  const [events, setEvents] = useState<
    {
      id: string;
      event: Event<EventInput, EventResult>;
    }[]
  >([]);

  return {
    state,
    setState,
    dispatchEvent: async (input: EventInput) => {
      for (const eventInstance of events) {
        await eventInstance.event(input);
      }
    },
    // Mounts event and returns unmountEvent method
    mountEvent: (event: Event<EventInput, EventResult>) => {
      const id = FnUtils.generateUUID();
      setEvents(events => [...events, { id, event }]);
      const unmountEvent = () => {
        setEvents(events => events.filter(({ id: eventId }) => eventId != id));
      };

      return unmountEvent;
    },
  };
};

export type UsePluginEvents<
  State,
  EventInput = { id: string },
  EventResult = void,
> = ReturnType<typeof usePluginEvents<State, EventInput, EventResult>>;
