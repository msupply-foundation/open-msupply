// RFC4122 v4 UUID generator. Many omSupply inserts accept caller-supplied ids (see
// server/cli/src/load_test.rs), which is how workflows chain ids without a round-trip.
// Math.random is adequate for synthetic test-data ids (no security requirement here).
export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
