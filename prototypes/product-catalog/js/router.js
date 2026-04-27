// Hash router and app bootstrap.
(function () {
  function parseHash() {
    const hash = location.hash || '#/items';
    const [path, queryStr] = hash.replace(/^#/, '').split('?');
    const segs = path.split('/').filter(Boolean);
    const params = {};
    if (queryStr) {
      queryStr.split('&').forEach((kv) => {
        const [k, v] = kv.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path, segs, params };
  }

  function highlightNav(segs) {
    document.querySelectorAll('.nav a').forEach((a) => {
      const key = a.getAttribute('data-nav');
      const active = (segs[0] || 'items') === key;
      a.classList.toggle('active', active);
    });
  }

  function render() {
    const { segs, params } = parseHash();
    const page = document.getElementById('page');
    page.innerHTML = '';
    highlightNav(segs);

    const root = segs[0] || 'items';
    if (root === 'items' && segs.length === 1) {
      window.Pages.itemsList(page, params);
    } else if (root === 'items' && segs.length >= 2) {
      window.Pages.itemDetail(page, segs[1], params);
    } else if (root === 'properties') {
      window.Pages.propertiesAdmin(page);
    } else if (root === 'users') {
      window.Pages.usersAdmin(page);
    } else {
      page.innerHTML = '<div class="empty-state">Not found.</div>';
    }
  }

  // ---------- Acting-as dropdown ----------
  function renderActingAs() {
    const sel = document.getElementById('acting-as');
    const state = window.Store.getState();
    const cur = window.Store.getActingUserId();
    sel.innerHTML = state.users
      .map((u) => '<option value="' + u.id + '"' + (u.id === cur ? ' selected' : '') + '>' + window.UI.escapeHtml(u.name) + '</option>')
      .join('');
    sel.onchange = () => {
      window.Store.setActingUserId(sel.value);
    };
  }

  function init() {
    window.Store.load();
    renderActingAs();
    render();

    window.addEventListener('hashchange', render);
    window.Store.subscribe(() => {
      renderActingAs();
      render();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Reset prototype to seed data? All local edits will be lost.')) {
        window.Store.reset();
        location.hash = '#/items';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
