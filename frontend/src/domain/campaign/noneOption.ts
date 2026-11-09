/**
 * The value the explicit **None** row carries in a bulk picker — see the
 * `noneOption` prop on {@link ProgramSelect} and {@link ActivitySelect}.
 *
 * A record's own field has two states, a value or nothing, and the `×` moves
 * between them. A field edited across a SELECTION has three, because the
 * default is that the user has not touched it and those records each keep what
 * they carry. "No program" is then an instruction like any other, so it needs a
 * row of its own; the empty field is what means _not being changed_.
 *
 * Never a real program or campaign id — those are UUIDs.
 */
export const NONE_OPTION = '__none__';
