// Tiny localStorage-backed store with pub/sub. Global namespace `Store`.
(function () {
  const KEY = 'omsupply.product-catalog.v1';
  const listeners = new Set();

  let state = null;

  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { state = JSON.parse(raw); return; } catch (e) {}
    }
    state = window.Seed.build();
    persist();
  }

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function notify() {
    listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
  }

  function getState() { return state; }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function update(mutator) {
    mutator(state);
    persist();
    notify();
  }

  function reset() {
    state = window.Seed.build();
    persist();
    notify();
  }

  // ---------- ID helpers ----------
  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 9);
  }

  // ---------- Acting-as user ----------
  function getActingUserId() {
    return state.actingUserId || (state.users[0] && state.users[0].id);
  }
  function setActingUserId(id) {
    update((s) => { s.actingUserId = id; });
  }

  // ---------- Lookups ----------
  function userById(id) { return state.users.find((u) => u.id === id); }
  function unitById(id) { return state.units.find((u) => u.id === id); }
  function itemById(id) { return state.items.find((i) => i.id === id); }
  function propertyById(id) { return state.properties.find((p) => p.id === id); }
  function optionsForProperty(pid) {
    return state.property_options.filter(
      (o) => o.property_id === pid && !o.deleted_datetime
    );
  }
  function variantsForItem(itemId) {
    return state.item_variants.filter((v) => v.item_id === itemId && !v.deleted_datetime);
  }
  function valuesForItem(itemId) {
    return state.property_values.filter(
      (pv) => pv.table_name === 'item' && pv.record_id === itemId
    );
  }
  function activeApprovalsForItem(itemId) {
    const item = itemById(itemId);
    if (!item) return [];
    const since = item.for_approval_at || 0;
    return state.approvals.filter(
      (a) => a.item_id === itemId && a.at >= since
    );
  }

  // ---------- Item mutations ----------
  function createItem(actingUserId) {
    const id = uid('item');
    update((s) => {
      s.items.push({
        id,
        code: '',
        name: 'New item',
        unit_id: s.units[0] ? s.units[0].id : null,
        strength: '',
        status: 'Draft',
        created_by: actingUserId,
        created_at: Date.now(),
        updated_at: Date.now(),
        for_approval_at: null,
      });
    });
    return id;
  }

  function updateItem(id, patch) {
    update((s) => {
      const it = s.items.find((i) => i.id === id);
      if (it) { Object.assign(it, patch); it.updated_at = Date.now(); }
    });
  }

  function setStatus(id, status, extra) {
    update((s) => {
      const it = s.items.find((i) => i.id === id);
      if (!it) return;
      it.status = status;
      it.updated_at = Date.now();
      if (status === 'ForApproval') it.for_approval_at = Date.now();
      if (extra) Object.assign(it, extra);
    });
  }

  function recordApproval(itemId, userId, decision, comment) {
    update((s) => {
      s.approvals.push({
        id: uid('apr'),
        item_id: itemId,
        user_id: userId,
        decision,
        comment: comment || '',
        at: Date.now(),
      });
    });
    // Re-evaluate transitions
    const item = itemById(itemId);
    if (!item) return;
    if (decision === 'reject') {
      setStatus(itemId, 'Draft', { for_approval_at: null });
    } else if (decision === 'approve') {
      const approvals = activeApprovalsForItem(itemId)
        .filter((a) => a.decision === 'approve');
      const distinctApprovers = new Set(
        approvals
          .filter((a) => a.user_id !== item.created_by)
          .map((a) => a.user_id)
      );
      if (distinctApprovers.size >= 2) {
        setStatus(itemId, 'Active');
      }
    }
  }

  // ---------- Variant mutations ----------
  function upsertVariant(variant) {
    update((s) => {
      const idx = s.item_variants.findIndex((v) => v.id === variant.id);
      if (idx >= 0) s.item_variants[idx] = variant;
      else s.item_variants.push(variant);
    });
  }
  function deleteVariant(id) {
    update((s) => {
      const v = s.item_variants.find((x) => x.id === id);
      if (v) v.deleted_datetime = Date.now();
    });
  }

  // ---------- Property value mutations ----------
  function setPropertyValue(itemId, propertyId, patch) {
    update((s) => {
      let pv = s.property_values.find(
        (x) => x.table_name === 'item' && x.record_id === itemId && x.property_id === propertyId
      );
      if (!pv) {
        pv = {
          id: uid('pv'),
          table_name: 'item',
          record_id: itemId,
          property_id: propertyId,
          value_text: null,
          value_real: null,
          value_date: null,
          value_number: null,
          value_option_id: null,
        };
        s.property_values.push(pv);
      }
      Object.assign(pv, patch);
    });
  }

  // ---------- Property + option admin ----------
  function upsertProperty(prop) {
    update((s) => {
      const idx = s.properties.findIndex((p) => p.id === prop.id);
      if (idx >= 0) s.properties[idx] = prop;
      else s.properties.push(prop);
    });
  }
  function softDeleteProperty(id) {
    update((s) => {
      const p = s.properties.find((x) => x.id === id);
      if (p) p.deleted_datetime = Date.now();
    });
  }
  function upsertOption(opt) {
    update((s) => {
      const idx = s.property_options.findIndex((o) => o.id === opt.id);
      if (idx >= 0) s.property_options[idx] = opt;
      else s.property_options.push(opt);
    });
  }
  function softDeleteOption(id) {
    update((s) => {
      const o = s.property_options.find((x) => x.id === id);
      if (o) o.deleted_datetime = Date.now();
    });
  }

  window.Store = {
    load, reset, getState, subscribe, update, persist, uid,
    getActingUserId, setActingUserId,
    userById, unitById, itemById, propertyById,
    optionsForProperty, variantsForItem, valuesForItem,
    activeApprovalsForItem,
    createItem, updateItem, setStatus, recordApproval,
    upsertVariant, deleteVariant,
    setPropertyValue,
    upsertProperty, softDeleteProperty, upsertOption, softDeleteOption,
  };
})();
