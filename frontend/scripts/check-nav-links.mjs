/*
 * Navigation-is-a-link check (#271, spec/navigation OMS-REG-NAV-02).
 *
 * A way to another screen has to be a real link, or the browser can't open it
 * in a new tab: Cmd/Ctrl-click moves the current tab instead, and middle-click
 * does nothing. And a link's address has to carry the app's mount, or on a
 * nested deploy ('/rc/', '/pr-123/') it points outside the app — which never
 * shows at the root mount, where dev and CI run. Both regress silently, so
 * this script fails on either:
 *
 *  1. A control that only navigates: a <Button>/<IconButton> whose onClick,
 *     or a config object whose `onClick:`, does nothing but `navigate(…)`.
 *     Make it a link instead — LinkButton, RecordLink, a crumb's `to`, a
 *     table's `rowHref`. A control that is an ACTION which happens to move on
 *     (Close, a dialog's way back to the list) stays a button: mark it with a
 *     `// not-a-link: <reason>` comment directly above the onClick.
 *  2. A hand-built mount: `routerBase` joined to a path anywhere but
 *     documentHref (src/nav/storeRelativePath.ts) — use documentHref(path),
 *     or the router's <A>, which adds the mount itself.
 *
 * Parsed with the TypeScript compiler rather than matched line by line: the
 * JSX spans lines, and a regex would miss a handler laid out over three.
 * Exit code 1 with a report on failure. Run via `pnpm check`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = 'src';
const NAV_CONTROLS = new Set(['Button', 'IconButton']);
const MOUNT_HOME = 'src/nav/storeRelativePath.ts';
const OPT_OUT = /\/\/\s*not-a-link:\s*\S/;

const files = [];
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
      files.push(path);
  }
};
walk(ROOT);

/** `() => navigate(…)` or `() => { navigate(…); }` — and nothing else. */
const navigatesOnly = node => {
  if (!node || !(ts.isArrowFunction(node) || ts.isFunctionExpression(node)))
    return false;
  if (node.parameters.length > 0) return false;
  const isNavigateCall = expr =>
    ts.isCallExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    expr.expression.text === 'navigate';
  if (!ts.isBlock(node.body)) return isNavigateCall(node.body);
  const [only, ...rest] = node.body.statements;
  return (
    rest.length === 0 &&
    only !== undefined &&
    ts.isExpressionStatement(only) &&
    isNavigateCall(only.expression)
  );
};

const offences = [];
for (const file of files) {
  const rel = relative('.', file).split('\\').join('/');
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const where = node =>
    `${rel}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
  const optedOut = node =>
    (ts.getLeadingCommentRanges(text, node.pos) ?? []).some(c =>
      OPT_OUT.test(text.slice(c.pos, c.end))
    );

  const visit = node => {
    // 1a. <Button onClick={() => navigate(…)}>
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(source) === 'onClick' &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      navigatesOnly(node.initializer.expression)
    ) {
      const element = node.parent.parent;
      const tag = element.tagName?.getText(source);
      if (NAV_CONTROLS.has(tag) && !optedOut(node))
        offences.push(
          `  ${where(node)}  <${tag}> only navigates — make it a link (LinkButton / RecordLink)`
        );
    }
    // 1b. { label, onClick: () => navigate(…) } — a crumb, a menu item
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === 'onClick' &&
      navigatesOnly(node.initializer) &&
      !optedOut(node)
    )
      offences.push(
        `  ${where(node)}  onClick only navigates — give it an address (a crumb's \`to\`, a link)`
      );
    // 2. `${routerBase}…` or routerBase + …
    if (
      ts.isIdentifier(node) &&
      node.text === 'routerBase' &&
      rel !== MOUNT_HOME &&
      (ts.isTemplateSpan(node.parent) ||
        (ts.isBinaryExpression(node.parent) &&
          node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken))
    )
      offences.push(
        `  ${where(node)}  mount joined by hand — use documentHref(path) (${MOUNT_HOME})`
      );
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (offences.length) {
  console.error(
    `Navigation that isn't a link, or a link that can leave the app (#271, OMS-REG-NAV-02):\n${offences.join('\n')}\n` +
      `A control that is an action which happens to navigate (Close, a dialog's way back) can opt out with a "// not-a-link: <reason>" comment above its onClick.`
  );
  process.exit(1);
}

console.log(
  `nav links OK — ${files.length} file(s), no navigate-only controls, every mount through documentHref`
);
