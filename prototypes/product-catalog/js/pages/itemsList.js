(function () {
  const STATUSES = ['Draft', 'ForApproval', 'Active', 'Disabled', 'Deleted'];

  function render(page, params) {
    const state = window.Store.getState();
    const filter = params.status || 'All';
    const search = (params.q || '').toLowerCase();

    window.UI.setBreadcrumbs([{ label: 'Items' }]);

    const counts = STATUSES.reduce((acc, s) => {
      acc[s] = state.items.filter((i) => i.status === s).length;
      return acc;
    }, { All: state.items.length });

    const filtered = state.items.filter((i) => {
      if (filter !== 'All' && i.status !== filter) return false;
      if (search && !(i.name.toLowerCase().includes(search) || i.code.toLowerCase().includes(search))) return false;
      return true;
    });

    page.innerHTML =
      '<h1>Items</h1>' +
      '<div class="banner">This is a non-functional UI prototype. All data lives in your browser\'s localStorage. Click <em>Reset prototype</em> to restore the seed.</div>' +
      '<div class="list-toolbar">' +
      '  <input id="search" type="text" placeholder="Search code or name…" value="' + window.UI.escapeHtml(params.q || '') + '" />' +
      '  <div class="status-filters" id="filters">' +
      ['All', ...STATUSES].map((s) =>
        '<button data-status="' + s + '" class="' + (filter === s ? 'active' : '') + '">' + s + ' <span class="muted">' + (counts[s] || 0) + '</span></button>'
      ).join('') +
      '  </div>' +
      '  <div class="spacer"></div>' +
      '  <button class="btn btn-primary" id="new-item">+ New item</button>' +
      '</div>' +
      '<div class="card"><div class="scroll-x">' +
      '  <table class="table">' +
      '    <thead><tr>' +
      '      <th style="width:140px">Code</th>' +
      '      <th>Name</th>' +
      '      <th style="width:100px">Units</th>' +
      '      <th style="width:120px">Status</th>' +
      '      <th style="width:160px">Updated</th>' +
      '    </tr></thead>' +
      '    <tbody>' +
      (filtered.length === 0
        ? '<tr><td colspan="5" class="table-empty">No items match.</td></tr>'
        : filtered.map((i) => {
            const unit = window.Store.unitById(i.unit_id);
            return '<tr data-id="' + i.id + '">' +
              '<td><code>' + window.UI.escapeHtml(i.code || '—') + '</code></td>' +
              '<td>' + window.UI.escapeHtml(i.name) + '</td>' +
              '<td class="muted">' + window.UI.escapeHtml(unit ? unit.name : '') + '</td>' +
              '<td>' + window.UI.statusBadge(i.status) + '</td>' +
              '<td class="muted">' + window.UI.escapeHtml(window.UI.relTime(i.updated_at)) + '</td>' +
            '</tr>';
          }).join('')) +
      '    </tbody>' +
      '  </table>' +
      '</div></div>';

    page.querySelector('#new-item').onclick = () => {
      const id = window.Store.createItem(window.Store.getActingUserId());
      location.hash = '#/items/' + id;
    };

    page.querySelectorAll('#filters button').forEach((b) => {
      b.onclick = () => {
        const s = b.getAttribute('data-status');
        const q = page.querySelector('#search').value;
        const qs = [];
        if (s !== 'All') qs.push('status=' + encodeURIComponent(s));
        if (q) qs.push('q=' + encodeURIComponent(q));
        location.hash = '#/items' + (qs.length ? '?' + qs.join('&') : '');
      };
    });

    let searchTimer;
    page.querySelector('#search').oninput = (e) => {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => {
        const qs = [];
        if (filter !== 'All') qs.push('status=' + encodeURIComponent(filter));
        if (v) qs.push('q=' + encodeURIComponent(v));
        location.hash = '#/items' + (qs.length ? '?' + qs.join('&') : '');
      }, 250);
    };

    page.querySelectorAll('tbody tr[data-id]').forEach((tr) => {
      tr.onclick = () => { location.hash = '#/items/' + tr.getAttribute('data-id'); };
    });
  }

  window.Pages = window.Pages || {};
  window.Pages.itemsList = render;
})();
