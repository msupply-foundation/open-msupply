(function () {
  const TABS = [
    { id: 'general',    label: 'General' },
    { id: 'variants',   label: 'Variants' },
    { id: 'properties', label: 'Properties' },
  ];

  function render(page, itemId, params) {
    const item = window.Store.itemById(itemId);
    if (!item) {
      page.innerHTML = '<div class="empty-state">Item not found. <a href="#/items">Back to list</a></div>';
      return;
    }

    window.UI.setBreadcrumbs([
      { label: 'Items', href: '#/items' },
      { label: item.name || '(unnamed)' },
    ]);

    const activeTab = params.tab || 'general';
    const actingUserId = window.Store.getActingUserId();

    page.innerHTML =
      '<div class="detail-header">' +
      '  <h1>' + window.UI.escapeHtml(item.name || '(unnamed item)') + '</h1>' +
      '  ' + window.UI.statusBadge(item.status) +
      '  <div class="actions" id="status-actions"></div>' +
      '</div>' +
      '<div class="tabs" id="tabs">' +
        TABS.map((t) =>
          '<button data-tab="' + t.id + '" class="' + (activeTab === t.id ? 'active' : '') + '">' + t.label + '</button>'
        ).join('') +
      '</div>' +
      '<div id="tab-content"></div>';

    page.querySelectorAll('#tabs button').forEach((b) => {
      b.onclick = () => {
        const t = b.getAttribute('data-tab');
        location.hash = '#/items/' + itemId + '?tab=' + t;
      };
    });

    renderStatusActions(page.querySelector('#status-actions'), item, actingUserId);

    const content = page.querySelector('#tab-content');
    if (activeTab === 'general')    window.Pages.tabGeneral(content, item);
    if (activeTab === 'variants')   window.Pages.tabVariants(content, item);
    if (activeTab === 'properties') window.Pages.tabProperties(content, item);
  }

  function renderStatusActions(host, item, actingUserId) {
    const acting = window.Store.userById(actingUserId);
    const buttons = [];

    if (item.status === 'Draft') {
      buttons.push({ label: 'Submit for approval', cls: 'btn-primary', fn: () => {
        window.Store.setStatus(item.id, 'ForApproval');
      }});
      buttons.push({ label: 'Delete', cls: 'btn-danger', fn: () => {
        if (confirm('Move this item to Deleted?')) window.Store.setStatus(item.id, 'Deleted');
      }});
    } else if (item.status === 'ForApproval') {
      const isAuthor = item.created_by === actingUserId;
      const approvals = window.Store.activeApprovalsForItem(item.id);
      const alreadyVoted = approvals.some((a) => a.user_id === actingUserId);
      if (isAuthor) {
        buttons.push({ label: 'Author cannot self-approve', cls: 'btn', disabled: true, fn: () => {} });
      } else if (alreadyVoted) {
        buttons.push({ label: 'You already voted', cls: 'btn', disabled: true, fn: () => {} });
      } else {
        buttons.push({ label: 'Approve', cls: 'btn-primary', fn: () => {
          window.Store.recordApproval(item.id, actingUserId, 'approve', '');
        }});
        buttons.push({ label: 'Reject…', cls: 'btn-danger', fn: () => {
          openRejectModal(item, actingUserId);
        }});
      }
      buttons.push({ label: 'Withdraw to draft', cls: 'btn-ghost', fn: () => {
        if (confirm('Withdraw this item back to Draft?')) {
          window.Store.setStatus(item.id, 'Draft', { for_approval_at: null });
        }
      }});
    } else if (item.status === 'Active') {
      buttons.push({ label: 'Disable', cls: 'btn', fn: () => {
        window.Store.setStatus(item.id, 'Disabled');
      }});
      buttons.push({ label: 'Delete', cls: 'btn-danger', fn: () => {
        if (confirm('Move this item to Deleted?')) window.Store.setStatus(item.id, 'Deleted');
      }});
    } else if (item.status === 'Disabled') {
      buttons.push({ label: 'Reactivate', cls: 'btn-primary', fn: () => {
        window.Store.setStatus(item.id, 'Active');
      }});
      buttons.push({ label: 'Delete', cls: 'btn-danger', fn: () => {
        if (confirm('Move this item to Deleted?')) window.Store.setStatus(item.id, 'Deleted');
      }});
    } else if (item.status === 'Deleted') {
      buttons.push({ label: 'Restore to Draft', cls: 'btn', fn: () => {
        window.Store.setStatus(item.id, 'Draft', { for_approval_at: null });
      }});
    }

    host.innerHTML = '';
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn ' + b.cls;
      el.textContent = b.label;
      if (b.disabled) el.disabled = true;
      el.onclick = b.fn;
      host.appendChild(el);
    });
    if (buttons.length === 0) {
      host.innerHTML = '<span class="muted faint">Acting as ' + window.UI.escapeHtml(acting ? acting.name : '?') + '</span>';
    }
  }

  function openRejectModal(item, actingUserId) {
    const modal = window.UI.openModal({
      title: 'Reject item',
      body:
        '<p>Provide a reason for rejection. The item will return to <strong>Draft</strong> and the author will see your comment.</p>' +
        '<div class="field" style="flex-direction:column;align-items:stretch;">' +
        '  <label style="flex:none;margin-bottom:4px;">Comment</label>' +
        '  <textarea id="reject-comment" placeholder="e.g. Storage temperature range is missing"></textarea>' +
        '</div>',
      footer:
        '<button class="btn btn-ghost" data-modal-close>Cancel</button>' +
        '<button class="btn btn-danger" id="confirm-reject">Reject and return to Draft</button>',
    });
    modal.root.querySelector('#confirm-reject').onclick = () => {
      const c = modal.root.querySelector('#reject-comment').value.trim();
      if (!c) { alert('Please add a comment.'); return; }
      window.Store.recordApproval(item.id, actingUserId, 'reject', c);
      modal.close();
    };
  }

  window.Pages = window.Pages || {};
  window.Pages.itemDetail = render;
})();
