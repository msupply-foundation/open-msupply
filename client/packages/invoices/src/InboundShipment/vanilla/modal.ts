import { el, clear } from './dom';
import './styles/modal.css';

export interface ModalHandle {
  /** The body element to fill with content. */
  body: HTMLElement;
  /** The footer element for action buttons. */
  footer: HTMLElement;
  close: () => void;
  setTitle: (title: string) => void;
}

/**
 * Open a plain-JS modal (overlay + centered dialog). Returns a handle whose
 * body/footer the caller populates. Closes on overlay click, Escape, or close().
 */
export const openModal = (
  title: string,
  opts: { isRtl?: boolean; width?: string } = {}
): ModalHandle => {
  const titleEl = el('h2', { class: 'oms-modal-title', text: title });
  const body = el('div', { class: 'oms-modal-body' });
  const footer = el('div', { class: 'oms-modal-footer' });

  const dialog = el(
    'div',
    {
      class: 'oms-modal-dialog',
      style: opts.width ? { width: opts.width } : {},
      attrs: { role: 'dialog', 'aria-modal': 'true' },
    },
    [titleEl, body, footer]
  );

  const overlay = el(
    'div',
    {
      class: 'oms-modal-overlay',
      attrs: opts.isRtl ? { dir: 'rtl' } : {},
    },
    [dialog]
  );

  const close = () => {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);

  document.body.appendChild(overlay);

  return {
    body,
    footer,
    close,
    setTitle: (t: string) => {
      clear(titleEl);
      titleEl.textContent = t;
    },
  };
};
