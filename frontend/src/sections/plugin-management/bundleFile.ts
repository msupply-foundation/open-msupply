/*
 * Choosing a bundle file (spec/plugin-management/rules.md › installing a
 * bundle): the zone's `chooseOne` decides a pick, and api/postFiles.ts's
 * `uploadFile` sends it.
 */

/** What the upload zone accepts — any letter case (the zone folds it). */
export const BUNDLE_ACCEPT = '.json';
