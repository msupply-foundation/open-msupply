/*
 * Shared scaffolding for showcase section pages — the chrome *around* the
 * demos (section cards, lead/note copy, layout rows), never anything the
 * showcase demonstrates: components under demo are always real `src/ui`
 * components. Page-specific demo furniture that no other page uses stays in
 * that page's own CSS module rather than growing single-use components here.
 */
export { Stack } from './Stack';
export { Card } from './Card';
export { Row } from './Row';
export { Col } from './Col';
export { Note } from './Note';
export { Intro } from './Intro';
export { PageFrame, PageBody } from './PageFrame';
export { ToolbarStub } from './ToolbarStub';
export { FormPreview } from './FormPreview';
