// Tiny framework-free DOM helper used by the vanilla inbound shipment island.
// No React, no MUI - just thin wrappers over document.createElement.

type Child = Node | string | null | undefined | false;

interface ElProps {
  class?: string;
  text?: string;
  html?: string;
  title?: string;
  type?: string;
  value?: string;
  href?: string;
  disabled?: boolean;
  dataset?: Record<string, string>;
  attrs?: Record<string, string>;
  style?: Partial<CSSStyleDeclaration>;
  on?: Partial<{
    [K in keyof HTMLElementEventMap]: (e: HTMLElementEventMap[K]) => void;
  }>;
}

/**
 * Create an element with props and children in one call.
 *   el('button', { class: 'btn', text: 'Save', on: { click } })
 */
export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  children: Child[] = []
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);

  if (props.class) node.className = props.class;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.html !== undefined) node.innerHTML = props.html;
  if (props.title !== undefined) node.title = props.title;
  if (props.disabled !== undefined)
    (node as unknown as { disabled: boolean }).disabled = props.disabled;

  if (props.type) node.setAttribute('type', props.type);
  if (props.value !== undefined)
    (node as unknown as { value: string }).value = props.value;
  if (props.href !== undefined) node.setAttribute('href', props.href);

  if (props.dataset)
    for (const [k, v] of Object.entries(props.dataset)) node.dataset[k] = v;
  if (props.attrs)
    for (const [k, v] of Object.entries(props.attrs)) node.setAttribute(k, v);
  if (props.style) Object.assign(node.style, props.style);

  if (props.on)
    for (const [evt, handler] of Object.entries(props.on))
      node.addEventListener(evt, handler as EventListener);

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }

  return node;
};

/** Remove all children from a node. */
export const clear = (node: Node): void => {
  while (node.firstChild) node.removeChild(node.firstChild);
};
