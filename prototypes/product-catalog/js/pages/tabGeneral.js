(function () {
  function render(host, item) {
    const state = window.Store.getState();
    const author = window.Store.userById(item.created_by);
    const readOnly = item.status === 'Deleted';

    host.innerHTML =
      '<div class="detail-grid">' +
      '  <div class="card"><div class="card-body">' +
      '    <h2>Item details</h2>' +
      '    <div class="field"><label>Code</label><div class="field-input"><input type="text" id="f-code" value="' + window.UI.escapeHtml(item.code) + '" ' + (readOnly ? 'disabled' : '') + ' /></div></div>' +
      '    <div class="field"><label>Name</label><div class="field-input"><input type="text" id="f-name" value="' + window.UI.escapeHtml(item.name) + '" ' + (readOnly ? 'disabled' : '') + ' /></div></div>' +
      '    <div class="field"><label>Units</label><div class="field-input">' +
      '      <select id="f-unit" ' + (readOnly ? 'disabled' : '') + '>' +
            state.units.map((u) =>
              '<option value="' + u.id + '"' + (u.id === item.unit_id ? ' selected' : '') + '>' + window.UI.escapeHtml(u.name) + '</option>'
            ).join('') +
      '      </select>' +
      '    </div></div>' +
      '    <div class="field"><label>Strength</label><div class="field-input"><input type="text" id="f-strength" value="' + window.UI.escapeHtml(item.strength || '') + '" ' + (readOnly ? 'disabled' : '') + ' placeholder="e.g. 250mg" /></div></div>' +
      '    <div class="field"><label>Author</label><div class="field-input"><span class="muted">' + window.UI.escapeHtml(author ? author.name : '—') + '</span></div></div>' +
      '    <div class="field"><label>Created</label><div class="field-input"><span class="muted">' + window.UI.escapeHtml(window.UI.fmtDate(item.created_at)) + '</span></div></div>' +
      '  </div></div>' +
      '  <div>' + approvalPanelHtml(item) + '</div>' +
      '</div>';

    function commit() {
      window.Store.updateItem(item.id, {
        code: host.querySelector('#f-code').value.trim(),
        name: host.querySelector('#f-name').value.trim() || '(unnamed item)',
        unit_id: host.querySelector('#f-unit').value,
        strength: host.querySelector('#f-strength').value.trim(),
      });
    }
    ['#f-code', '#f-name', '#f-strength'].forEach((sel) => {
      const el = host.querySelector(sel);
      if (el) el.onchange = commit;
    });
    const unitSel = host.querySelector('#f-unit');
    if (unitSel) unitSel.onchange = commit;
  }

  function approvalPanelHtml(item) {
    const approvals = window.Store.activeApprovalsForItem(item.id);
    const approves = approvals.filter((a) => a.decision === 'approve');
    const distinct = new Set(approves.filter((a) => a.user_id !== item.created_by).map((a) => a.user_id));
    const dotsHtml =
      '<div class="approval-progress" title="' + distinct.size + ' of 2 distinct approvers">' +
      '<span class="approval-dot ' + (distinct.size >= 1 ? 'filled' : '') + '"></span>' +
      '<span class="approval-dot ' + (distinct.size >= 2 ? 'filled' : '') + '"></span>' +
      '</div>';

    let header;
    if (item.status === 'ForApproval') {
      header = '<h2>Approvals — ' + distinct.size + ' of 2</h2>' + dotsHtml;
    } else if (item.status === 'Active') {
      header = '<h2>Approvals</h2><p class="muted">This item has been approved and is Active.</p>';
    } else {
      header = '<h2>Approvals</h2><p class="muted">No approvals required at this status. History below.</p>';
    }

    // Show all historical approvals (most recent first)
    const all = window.Store.getState().approvals
      .filter((a) => a.item_id === item.id)
      .slice()
      .sort((a, b) => b.at - a.at);

    const list = all.length === 0
      ? '<p class="muted faint">No approval history yet.</p>'
      : '<div class="approval-list">' + all.map((a) => {
          const u = window.Store.userById(a.user_id);
          const cls = a.decision === 'approve' ? 'approve' : 'reject';
          return '<div class="approval-row ' + cls + '">' +
            '<div>' +
              '<div><span class="who">' + window.UI.escapeHtml(u ? u.name : '?') + '</span> ' +
              '<span class="when">· ' + window.UI.escapeHtml(window.UI.relTime(a.at)) + '</span></div>' +
              (a.comment ? '<div class="muted" style="margin-top:4px;">"' + window.UI.escapeHtml(a.comment) + '"</div>' : '') +
            '</div>' +
            '<div class="decision">' +
              (a.decision === 'approve'
                ? '<span class="badge badge-Active">Approved</span>'
                : '<span class="badge badge-Deleted">Rejected</span>') +
            '</div>' +
          '</div>';
        }).join('') + '</div>';

    return '<div class="approval-panel">' + header + list + '</div>';
  }

  window.Pages = window.Pages || {};
  window.Pages.tabGeneral = render;
})();
