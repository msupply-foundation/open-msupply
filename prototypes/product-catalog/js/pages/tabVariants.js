(function () {
  function render(host, item) {
    const variants = window.Store.variantsForItem(item.id);

    host.innerHTML =
      '<div class="flex-between mb-4">' +
      '  <h2 style="margin:0;">Item variants</h2>' +
      '  <button class="btn btn-primary btn-sm" id="add-variant">+ Add variant</button>' +
      '</div>' +
      '<div class="card"><div class="scroll-x">' +
      '  <table class="table">' +
      '    <thead><tr>' +
      '      <th>Name</th>' +
      '      <th>Storage</th>' +
      '      <th>Manufacturer</th>' +
      '      <th>VVM type</th>' +
      '      <th>Packaging levels</th>' +
      '      <th style="width:140px;"></th>' +
      '    </tr></thead>' +
      '    <tbody>' +
      (variants.length === 0
        ? '<tr><td colspan="6" class="table-empty">No variants yet. Add one to describe how this item is packaged.</td></tr>'
        : variants.map((v) =>
          '<tr class="variant-row" data-id="' + v.id + '">' +
            '<td><strong>' + window.UI.escapeHtml(v.name) + '</strong></td>' +
            '<td>' + window.UI.escapeHtml(v.location_type || '—') + '</td>' +
            '<td>' + window.UI.escapeHtml(v.manufacturer || '—') + '</td>' +
            '<td>' + window.UI.escapeHtml(v.vvm_type || '—') + '</td>' +
            '<td>' + (v.packaging_variants || []).map((p) =>
              '<span class="pill">L' + p.packaging_level + ' · ' + window.UI.escapeHtml(p.name) + ' · pack ' + p.pack_size + '</span>'
            ).join(' ') + '</td>' +
            '<td class="right">' +
              '<button class="btn btn-ghost btn-sm" data-edit="' + v.id + '">Edit</button>' +
              '<button class="btn btn-ghost btn-sm" data-del="' + v.id + '">Delete</button>' +
            '</td>' +
          '</tr>'
        ).join('')) +
      '    </tbody>' +
      '  </table>' +
      '</div></div>';

    host.querySelector('#add-variant').onclick = () => openVariantModal(item, null);
    host.querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const v = variants.find((x) => x.id === b.getAttribute('data-edit'));
        openVariantModal(item, v);
      };
    });
    host.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Delete this variant?')) {
          window.Store.deleteVariant(b.getAttribute('data-del'));
        }
      };
    });
  }

  function openVariantModal(item, existing) {
    const v = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: window.Store.uid('var'),
      item_id: item.id,
      name: '',
      location_type: 'Ambient',
      manufacturer: '',
      vvm_type: '',
      created_by: window.Store.getActingUserId(),
      created_datetime: Date.now(),
      deleted_datetime: null,
      packaging_variants: [{ name: 'Each', packaging_level: 1, pack_size: 1, volume_per_unit: 0 }],
    };

    const body = document.createElement('div');
    body.innerHTML = formHtml(v);
    bindForm(body, v);

    const footer = document.createElement('div');
    footer.style.display = 'contents';
    footer.innerHTML =
      '<button class="btn btn-ghost" data-modal-close>Cancel</button>' +
      '<button class="btn btn-primary" id="save-variant">Save variant</button>';

    const modal = window.UI.openModal({
      title: existing ? 'Edit variant' : 'Add variant',
      body,
      footer,
    });
    modal.root.querySelector('#save-variant').onclick = () => {
      // Pull current form values
      v.name = body.querySelector('#v-name').value.trim() || '(unnamed variant)';
      v.location_type = body.querySelector('#v-loc').value.trim();
      v.manufacturer = body.querySelector('#v-man').value.trim();
      v.vvm_type = body.querySelector('#v-vvm').value.trim();
      v.packaging_variants = readPackaging(body);
      window.Store.upsertVariant(v);
      modal.close();
    };
  }

  function formHtml(v) {
    return (
      '<div class="field"><label>Variant name</label><div class="field-input"><input type="text" id="v-name" value="' + window.UI.escapeHtml(v.name) + '" placeholder="e.g. Blister 10s" /></div></div>' +
      '<div class="field"><label>Storage / location type</label><div class="field-input"><input type="text" id="v-loc" value="' + window.UI.escapeHtml(v.location_type || '') + '" placeholder="Ambient, Cold (2-8°C), Frozen…" /></div></div>' +
      '<div class="field"><label>Manufacturer</label><div class="field-input"><input type="text" id="v-man" value="' + window.UI.escapeHtml(v.manufacturer || '') + '" /></div></div>' +
      '<div class="field"><label>VVM type</label><div class="field-input"><input type="text" id="v-vvm" value="' + window.UI.escapeHtml(v.vvm_type || '') + '" placeholder="e.g. VVM30 (vaccines only)" /></div></div>' +
      '<h3 class="mt-4">Packaging variants</h3>' +
      '<p class="muted" style="font-size:12px;margin-bottom:8px;">Define each level of packaging — e.g. Tablet → Blister → Box.</p>' +
      '<div id="pkg-rows"></div>' +
      '<button type="button" class="btn btn-sm" id="add-pkg">+ Add packaging level</button>'
    );
  }

  function pkgRowHtml(p, idx) {
    return (
      '<div class="options-editor option-row" data-pkg="' + idx + '" style="grid-template-columns: 60px 1fr 100px 100px 32px;">' +
        '<input type="number" class="pkg-level" value="' + (p.packaging_level || 1) + '" min="1" title="Level" />' +
        '<input type="text"   class="pkg-name"  value="' + window.UI.escapeHtml(p.name || '') + '" placeholder="Level name (Capsule, Blister, Box…)" />' +
        '<input type="number" class="pkg-pack"  value="' + (p.pack_size || 1) + '" min="0" step="any" title="Pack size" />' +
        '<input type="number" class="pkg-vol"   value="' + (p.volume_per_unit || 0) + '" min="0" step="any" title="Volume per unit" />' +
        '<button type="button" class="btn btn-ghost btn-sm" data-rm-pkg="' + idx + '" title="Remove">✕</button>' +
      '</div>'
    );
  }

  function bindForm(body, v) {
    function refreshPkg() {
      body.querySelector('#pkg-rows').innerHTML = v.packaging_variants
        .map((p, idx) => pkgRowHtml(p, idx))
        .join('');
      body.querySelectorAll('[data-rm-pkg]').forEach((b) => {
        b.onclick = () => {
          const i = parseInt(b.getAttribute('data-rm-pkg'), 10);
          v.packaging_variants.splice(i, 1);
          if (v.packaging_variants.length === 0) {
            v.packaging_variants.push({ name: '', packaging_level: 1, pack_size: 1, volume_per_unit: 0 });
          }
          refreshPkg();
        };
      });
    }
    refreshPkg();
    body.querySelector('#add-pkg').onclick = () => {
      // sync from DOM first so we don't lose edits
      v.packaging_variants = readPackaging(body);
      v.packaging_variants.push({
        name: '',
        packaging_level: (v.packaging_variants[v.packaging_variants.length - 1] || { packaging_level: 0 }).packaging_level + 1,
        pack_size: 1, volume_per_unit: 0,
      });
      refreshPkg();
    };
  }

  function readPackaging(body) {
    return Array.from(body.querySelectorAll('[data-pkg]')).map((row) => ({
      name: row.querySelector('.pkg-name').value.trim(),
      packaging_level: parseInt(row.querySelector('.pkg-level').value, 10) || 1,
      pack_size: parseFloat(row.querySelector('.pkg-pack').value) || 0,
      volume_per_unit: parseFloat(row.querySelector('.pkg-vol').value) || 0,
    }));
  }

  window.Pages = window.Pages || {};
  window.Pages.tabVariants = render;
})();
