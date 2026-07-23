/*
 * Shared scaffolding for showcase section pages — the chrome *around* the
 * demos, never anything the showcase demonstrates: components under demo are
 * always real `src/ui` components. Page-specific demo furniture that no other
 * page uses stays in that page's own CSS module rather than growing
 * single-use components here.
 *
 * Dogfooding rule (Carl, 2026-07-23 — see kdd/showcase-harness): even the
 * chrome uses app elements wherever a semantically honest one exists — the
 * page column is ContentContainer + Stack, demo sections are DashboardCard.
 * Only two kinds of helper may live here:
 *  - stand-in demo furniture (PageFrame/PageBody, ToolbarStub, FormPreview)
 *    — the showcase's lorem ipsum, wrong to build as app components;
 *  - thin veneers over app primitives (Intro/Note/Lead = Text + a class
 *    adding only colour/measure/code chips — colour is the container's job
 *    by Text's contract), plus Row (the app deliberately has no generic
 *    horizontal element) and AnatomyTree (the anatomy-page figure).
 * Never add an element to src/ui to close a showcase gap.
 */
export { AnatomyTree, type AnatomyNode } from './AnatomyTree';
export { Row } from './Row';
export { Note } from './Note';
export { Intro } from './Intro';
export { Lead } from './Lead';
export { PageFrame, PageBody } from './PageFrame';
export { ToolbarStub } from './ToolbarStub';
export { FormPreview } from './FormPreview';
