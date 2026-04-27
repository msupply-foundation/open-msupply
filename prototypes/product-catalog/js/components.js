// Tiny render helpers. Global namespace `UI`.
(function () {
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function statusBadge(status) {
    return '<span class="badge badge-' + escapeHtml(status) + '">' + escapeHtml(status) + '</span>';
  }

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function fmtDateOnly(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString();
  }

  function relTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const s = Math.round(diff / 1000);
    if (s < 60) return s + 's ago';
    const m = Math.round(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 48) return h + 'h ago';
    const d = Math.round(h / 24);
    return d + 'd ago';
  }

  // Open a modal. content can be HTML string or DOM node.
  // Returns close() function.
  function openModal({ title, body, footer }) {
    const root = document.getElementById('modal-root');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '  <div class="modal-header">' +
      '    <div class="modal-title">' + escapeHtml(title) + '</div>' +
      '    <button class="btn btn-ghost btn-sm" data-modal-close>Close</button>' +
      '  </div>' +
      '  <div class="modal-body"></div>' +
      '  <div class="modal-footer"></div>' +
      '</div>';
    const bodyEl = backdrop.querySelector('.modal-body');
    const footerEl = backdrop.querySelector('.modal-footer');
    if (body instanceof Node) bodyEl.appendChild(body);
    else bodyEl.innerHTML = body || '';
    if (footer instanceof Node) footerEl.appendChild(footer);
    else footerEl.innerHTML = footer || '';

    function close() {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.matches('[data-modal-close]')) close();
    });
    document.addEventListener('keydown', onKey);

    root.appendChild(backdrop);
    return { close, root: backdrop };
  }

  function setBreadcrumbs(crumbs) {
    const el = document.getElementById('breadcrumbs');
    el.innerHTML = crumbs
      .map((c, i) => {
        const last = i === crumbs.length - 1;
        const cls = 'crumb' + (last ? ' last' : '');
        const text = c.href && !last
          ? '<a href="' + escapeHtml(c.href) + '" class="' + cls + '">' + escapeHtml(c.label) + '</a>'
          : '<span class="' + cls + '">' + escapeHtml(c.label) + '</span>';
        return text + (last ? '' : '<span class="sep">›</span>');
      })
      .join('');
  }

  window.UI = {
    escapeHtml, statusBadge, fmtDate, fmtDateOnly, relTime,
    openModal, setBreadcrumbs,
  };
})();
