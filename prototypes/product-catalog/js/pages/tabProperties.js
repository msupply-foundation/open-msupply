(function () {
  function render(host, item) {
    const state = window.Store.getState();
    const props = state.properties.filter((p) => !p.deleted_datetime);

    const valuesById = {};
    window.Store.valuesForItem(item.id).forEach((v) => { valuesById[v.property_id] = v; });

    if (props.length === 0) {
      host.innerHTML = '<div class="card"><div class="card-body empty-state">No properties defined yet. <a href="#/properties">Add one in Properties admin →</a></div></div>';
      return;
    }

    host.innerHTML =
      '<div class="flex-between mb-4">' +
      '  <h2 style="margin:0;">Item properties</h2>' +
      '  <a class="btn btn-sm" href="#/properties">Manage definitions</a>' +
      '</div>' +
      '<div class="card"><div class="card-body properties-grid">' +
      props.map((p) => fieldFor(p, valuesById[p.id])).join('') +
      '</div></div>';

    props.forEach((p) => bindField(host, item, p));
  }

  function fieldFor(prop, pv) {
    const id = 'pv-' + prop.id;
    const inputHtml = (() => {
      if (prop.type === 'text') {
        return '<input type="text" id="' + id + '" value="' + window.UI.escapeHtml((pv && pv.value_text) || '') + '" />';
      }
      if (prop.type === 'real') {
        return '<input type="number" step="any" id="' + id + '" value="' + (pv && pv.value_real != null ? pv.value_real : '') + '" />';
      }
      if (prop.type === 'number') {
        return '<input type="number" step="1" id="' + id + '" value="' + (pv && pv.value_number != null ? pv.value_number : '') + '" />';
      }
      if (prop.type === 'date') {
        const iso = pv && pv.value_date ? new Date(pv.value_date).toISOString().slice(0, 10) : '';
        return '<input type="date" id="' + id + '" value="' + iso + '" />';
      }
      if (prop.type === 'option') {
        const options = window.Store.optionsForProperty(prop.id);
        const cur = pv && pv.value_option_id;
        return '<select id="' + id + '"><option value="">— none —</option>' +
          options.map((o) => '<option value="' + o.id + '"' + (cur === o.id ? ' selected' : '') + '>' + window.UI.escapeHtml(o.name) + '</option>').join('') +
        '</select>';
      }
      return '<input type="text" id="' + id + '" disabled />';
    })();
    return '<div class="field"><label>' + window.UI.escapeHtml(prop.name) + ' <span class="muted faint" style="font-weight:400;">(' + prop.type + ')</span></label><div class="field-input">' + inputHtml + '</div></div>';
  }

  function bindField(host, item, prop) {
    const el = host.querySelector('#pv-' + prop.id);
    if (!el) return;
    el.onchange = () => {
      const patch = {
        value_text: null, value_real: null, value_date: null, value_number: null, value_option_id: null,
      };
      if (prop.type === 'text')   patch.value_text = el.value.trim() || null;
      if (prop.type === 'real')   patch.value_real = el.value === '' ? null : parseFloat(el.value);
      if (prop.type === 'number') patch.value_number = el.value === '' ? null : parseInt(el.value, 10);
      if (prop.type === 'date')   patch.value_date = el.value ? new Date(el.value).getTime() : null;
      if (prop.type === 'option') patch.value_option_id = el.value || null;
      window.Store.setPropertyValue(item.id, prop.id, patch);
    };
  }

  window.Pages = window.Pages || {};
  window.Pages.tabProperties = render;
})();
