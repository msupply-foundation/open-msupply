import { vi } from 'vitest';

/*
 * A minimal DOM for component tests (the suite has none): enough for Solid to
 * render, set attributes, attach listeners and dispatch events.
 *
 * Importing it installs it, so import it before the component under test.
 */

export type Child = FakeElement | FakeText | FakeComment;

class FakeNodeBase {
  parentNode: FakeElement | null = null;
  get nextSibling(): Child | null {
    const siblings = this.parentNode?.childNodes ?? [];
    return siblings[siblings.indexOf(this as unknown as Child) + 1] ?? null;
  }
}

export class FakeText extends FakeNodeBase {
  nodeType = 3;
  data: string;
  constructor(data: string) {
    super();
    this.data = data;
  }
  cloneNode() {
    return new FakeText(this.data);
  }
}

export class FakeComment extends FakeNodeBase {
  nodeType = 8;
  cloneNode() {
    return new FakeComment();
  }
}

/** A dispatched event: enough for handlers to read and prevent it. */
export interface FakeEvent {
  type: string;
  target: FakeElement;
  currentTarget: FakeElement;
  key?: string;
  defaultPrevented: boolean;
  preventDefault: () => void;
}

export class FakeElement extends FakeNodeBase {
  nodeType = 1;
  childNodes: Child[] = [];
  attributes = new Map<string, string>();
  listeners = new Map<string, ((e: FakeEvent) => void)[]>();
  // Solid's delegated handlers (`$$click`) and plain properties land here.
  [key: string]: unknown;
  tagName: string;
  constructor(tagName: string) {
    super();
    this.tagName = tagName;
  }
  get firstChild() {
    return this.childNodes[0] ?? null;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
  set className(value: string) {
    this.setAttribute('class', value);
  }
  get textContent(): string {
    return this.childNodes
      .map(c =>
        c instanceof FakeElement
          ? c.textContent
          : c instanceof FakeText
            ? c.data
            : ''
      )
      .join('');
  }
  set textContent(value: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    if (value !== '') this.appendChild(new FakeText(String(value)));
  }
  appendChild(node: Child) {
    return this.insertBefore(node, null);
  }
  insertBefore(node: Child, before: Child | null) {
    node.parentNode?.removeChild(node);
    const at = before ? this.childNodes.indexOf(before) : -1;
    if (at < 0) this.childNodes.push(node);
    else this.childNodes.splice(at, 0, node);
    node.parentNode = this;
    return node;
  }
  removeChild(node: Child) {
    this.childNodes = this.childNodes.filter(c => c !== node);
    node.parentNode = null;
    return node;
  }
  replaceChild(node: Child, old: Child) {
    this.insertBefore(node, old);
    return this.removeChild(old);
  }
  cloneNode(): FakeElement {
    const copy = new FakeElement(this.tagName);
    for (const [k, v] of this.attributes) copy.attributes.set(k, v);
    for (const c of this.childNodes) copy.appendChild(c.cloneNode());
    return copy;
  }
  // Events Solid attaches directly rather than delegating (blur, focus).
  addEventListener(type: string, fn: (e: FakeEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  removeEventListener(type: string, fn: (e: FakeEvent) => void) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter(f => f !== fn)
    );
  }
  /** Focus moves here; whatever held it is blurred first. */
  focus() {
    if (fakeDocument.activeElement === this) return;
    fakeDocument.activeElement?.blur();
    fakeDocument.activeElement = this;
    fire(this, 'focus');
  }
  blur() {
    if (fakeDocument.activeElement !== this) return;
    fakeDocument.activeElement = null;
    fire(this, 'blur');
  }
  /** Every element under this one, this one first. */
  all(): FakeElement[] {
    return [
      this,
      ...this.childNodes.flatMap(c =>
        c instanceof FakeElement ? c.all() : []
      ),
    ];
  }
}

/**
 * Dispatch `type` on `el`: its delegated handler (`$$type`), else its
 * listeners. Returns the event, to check `defaultPrevented`.
 */
export const fire = (
  el: FakeElement,
  type: string,
  init: Partial<FakeEvent> = {}
): FakeEvent => {
  const event: FakeEvent = {
    type,
    target: el,
    currentTarget: el,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    ...init,
  };
  const delegated = el[`$$${type}`];
  if (typeof delegated === 'function') delegated.call(el, event);
  for (const fn of el.listeners.get(type) ?? []) fn(event);
  return event;
};

/**
 * A click as a browser runs it: mousedown (blurs the focused element unless
 * prevented), then click. A disabled button ignores it.
 */
export const press = (button: FakeElement) => {
  if (button.disabled) return;
  const down = fire(button, 'mousedown');
  if (!down.defaultPrevented) fakeDocument.activeElement?.blur();
  fire(button, 'click');
};

// Elements that never hold children, so a template's `<input>` is a sibling
// of what follows it, not its parent.
const VOID = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'wbr']);

// Solid's templates: open tags (closing ones may be left off at the end),
// text, and `<!>` markers.
export const parse = (html: string): FakeElement => {
  const root = new FakeElement('#root');
  let at = root;
  for (const [, close, name, attrs, comment, text] of html.matchAll(
    /<(\/?)([a-zA-Z][\w-]*)([^>]*)>|(<!>)|([^<]+)/g
  )) {
    if (comment) at.appendChild(new FakeComment());
    else if (text) at.appendChild(new FakeText(text));
    else if (close) at = at.parentNode ?? root;
    else {
      const el = new FakeElement(name);
      for (const [, k, v] of attrs.matchAll(
        /([^\s=]+)(?:=("[^"]*"|'[^']*'|[^\s"'>]+))?/g
      ))
        el.setAttribute(k, (v ?? '').replace(/^["']|["']$/g, ''));
      at.appendChild(el);
      if (!attrs.trim().endsWith('/') && !VOID.has(name.toLowerCase())) at = el;
    }
  }
  return root;
};

export const fakeDocument = {
  activeElement: null as FakeElement | null,
  createElement: () => ({
    set innerHTML(html: string) {
      this.content = { firstChild: parse(html).firstChild };
    },
    content: undefined as unknown,
  }),
  createTextNode: (data: string) => new FakeText(data),
  addEventListener: () => {},
  removeEventListener: () => {},
};

vi.stubGlobal('document', fakeDocument);
vi.stubGlobal('window', { document: fakeDocument });
