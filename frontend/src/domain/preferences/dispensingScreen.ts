// The dispensing screen preference's values (spec/prescriptions rules ›
// dispensing preferences), shared by the global preferences page, the store
// editor and dispensing's own routing. The generated input types check these
// spellings wherever they are written back.

/** Which screen dispensing opens on, as the wire spells it. */
export const DISPENSING_SCREENS = ['STANDARD', 'SIMPLE'] as const;
export type DispensingScreen = (typeof DISPENSING_SCREENS)[number];

/** Read defensively: anything but Simple is the default, Standard. */
export const asDispensingScreen = (value: unknown): DispensingScreen =>
  value === 'SIMPLE' ? 'SIMPLE' : 'STANDARD';

export const dispensingScreenLabelKey = (screen: DispensingScreen) =>
  screen === 'SIMPLE'
    ? ('label.dispensing-screen-simple' as const)
    : ('label.dispensing-screen-standard' as const);
