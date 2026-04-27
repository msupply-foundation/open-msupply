// Seed data for the prototype. Returns a fresh state object every time.
(function () {
  function build() {
    const now = Date.now();
    const day = 86400000;

    const users = [
      { id: 'user-alice', name: 'Alice Tagaloa' },
      { id: 'user-ben',   name: 'Ben Mwangi' },
      { id: 'user-cleo',  name: 'Cleo Reyes' },
    ];

    const units = [
      { id: 'unit-each',  name: 'Each' },
      { id: 'unit-ml',    name: 'mL' },
      { id: 'unit-mg',    name: 'mg' },
      { id: 'unit-vial',  name: 'Vial' },
      { id: 'unit-dose',  name: 'Dose' },
      { id: 'unit-tab',   name: 'Tablet' },
    ];

    // ---------- Property definitions ----------
    const properties = [
      { id: 'prop-tc',   name: 'Therapeutic class',   translation_key: 'property.therapeutic-class',   type: 'option', deleted_datetime: null },
      { id: 'prop-atc',  name: 'ATC code',            translation_key: 'property.atc-code',            type: 'text',   deleted_datetime: null },
      { id: 'prop-tmin', name: 'Storage temp min (°C)', translation_key: 'property.storage-temp-min',  type: 'real',   deleted_datetime: null },
      { id: 'prop-tmax', name: 'Storage temp max (°C)', translation_key: 'property.storage-temp-max',  type: 'real',   deleted_datetime: null },
      { id: 'prop-shelf',name: 'Shelf life (months)', translation_key: 'property.shelf-life-months',   type: 'number', deleted_datetime: null },
      { id: 'prop-rev',  name: 'Last reviewed',       translation_key: 'property.last-reviewed',       type: 'date',   deleted_datetime: null },
    ];

    const property_options = [
      { id: 'opt-tc-anti',  property_id: 'prop-tc', name: 'Antibiotic',     translation_key: 'tc.antibiotic',     parent_option_id: null, deleted_datetime: null },
      { id: 'opt-tc-anal',  property_id: 'prop-tc', name: 'Analgesic',      translation_key: 'tc.analgesic',      parent_option_id: null, deleted_datetime: null },
      { id: 'opt-tc-antv',  property_id: 'prop-tc', name: 'Antiviral',      translation_key: 'tc.antiviral',      parent_option_id: null, deleted_datetime: null },
      { id: 'opt-tc-vacc',  property_id: 'prop-tc', name: 'Vaccine',        translation_key: 'tc.vaccine',        parent_option_id: null, deleted_datetime: null },
      { id: 'opt-tc-vita',  property_id: 'prop-tc', name: 'Vitamin/Mineral',translation_key: 'tc.vitamin',        parent_option_id: null, deleted_datetime: null },
    ];

    // ---------- Items ----------
    const items = [
      // 4 Active
      { id: 'item-amox250', code: 'AMOX250', name: 'Amoxicillin 250mg capsule',          unit_id: 'unit-each', strength: '250mg', status: 'Active',      created_by: 'user-alice', created_at: now - 30*day, updated_at: now - 5*day,  for_approval_at: null },
      { id: 'item-para500', code: 'PARA500', name: 'Paracetamol 500mg tablet',           unit_id: 'unit-tab',  strength: '500mg', status: 'Active',      created_by: 'user-ben',   created_at: now - 60*day, updated_at: now - 12*day, for_approval_at: null },
      { id: 'item-orsx',    code: 'ORS-1L',  name: 'Oral rehydration salts (1L sachet)', unit_id: 'unit-each', strength: '',      status: 'Active',      created_by: 'user-cleo',  created_at: now - 90*day, updated_at: now - 2*day,  for_approval_at: null },
      { id: 'item-bcg',     code: 'BCG',     name: 'BCG vaccine',                        unit_id: 'unit-dose', strength: '',      status: 'Active',      created_by: 'user-alice', created_at: now - 120*day,updated_at: now - 8*day,  for_approval_at: null },
      // 2 Draft
      { id: 'item-iboj',    code: 'IBO-J',   name: 'Ibuprofen 100mg/5mL oral suspension',unit_id: 'unit-ml',   strength: '20mg/mL',status: 'Draft',      created_by: 'user-cleo',  created_at: now - 2*day,  updated_at: now - 1*day, for_approval_at: null },
      { id: 'item-zinc',    code: 'ZINC20',  name: 'Zinc 20mg dispersible tablet',       unit_id: 'unit-tab',  strength: '20mg',  status: 'Draft',       created_by: 'user-ben',   created_at: now - 1*day,  updated_at: now,         for_approval_at: null },
      // 2 ForApproval
      { id: 'item-cefix',   code: 'CEF400',  name: 'Cefixime 400mg tablet',              unit_id: 'unit-tab',  strength: '400mg', status: 'ForApproval', created_by: 'user-alice', created_at: now - 4*day,  updated_at: now - 1*day, for_approval_at: now - 1*day },
      { id: 'item-mmr',     code: 'MMR',     name: 'Measles-Mumps-Rubella vaccine',      unit_id: 'unit-dose', strength: '',      status: 'ForApproval', created_by: 'user-cleo',  created_at: now - 5*day,  updated_at: now - 2*day, for_approval_at: now - 2*day },
      // 1 Disabled
      { id: 'item-chlor',   code: 'CHLOR-T', name: 'Chloramphenicol 250mg capsule',      unit_id: 'unit-each', strength: '250mg', status: 'Disabled',    created_by: 'user-ben',   created_at: now - 200*day,updated_at: now - 40*day,for_approval_at: null },
      // 1 Deleted
      { id: 'item-old',     code: 'OLD-X',   name: 'Discontinued cough syrup',           unit_id: 'unit-ml',   strength: '',      status: 'Deleted',     created_by: 'user-alice', created_at: now - 365*day,updated_at: now - 90*day,for_approval_at: null },
    ];

    // One ForApproval item already has 1 of 2 approvals
    const approvals = [
      { id: 'apr-cefix-1', item_id: 'item-cefix', user_id: 'user-ben', decision: 'approve', comment: '', at: now - 12*3600*1000 },
    ];

    // ---------- Variants ----------
    const item_variants = [
      {
        id: 'var-amox-blister', item_id: 'item-amox250', name: 'Blister 10s',
        location_type: 'Ambient', manufacturer: 'Generica Pharma', vvm_type: '',
        created_by: 'user-alice', created_datetime: now - 30*day, deleted_datetime: null,
        packaging_variants: [
          { name: 'Capsule', packaging_level: 1, pack_size: 1, volume_per_unit: 0.5 },
          { name: 'Blister', packaging_level: 2, pack_size: 10, volume_per_unit: 5 },
          { name: 'Box',     packaging_level: 3, pack_size: 100, volume_per_unit: 60 },
        ],
      },
      {
        id: 'var-amox-bottle', item_id: 'item-amox250', name: 'Bottle 100',
        location_type: 'Ambient', manufacturer: 'Apex Labs', vvm_type: '',
        created_by: 'user-alice', created_datetime: now - 25*day, deleted_datetime: null,
        packaging_variants: [
          { name: 'Capsule', packaging_level: 1, pack_size: 1, volume_per_unit: 0.5 },
          { name: 'Bottle',  packaging_level: 2, pack_size: 100, volume_per_unit: 70 },
        ],
      },
      {
        id: 'var-bcg-vial', item_id: 'item-bcg', name: '10-dose vial',
        location_type: 'Cold (2-8°C)', manufacturer: 'Serum Institute', vvm_type: 'VVM30',
        created_by: 'user-alice', created_datetime: now - 100*day, deleted_datetime: null,
        packaging_variants: [
          { name: 'Dose', packaging_level: 1, pack_size: 1, volume_per_unit: 0.05 },
          { name: 'Vial', packaging_level: 2, pack_size: 10, volume_per_unit: 0.5 },
        ],
      },
      {
        id: 'var-mmr-vial', item_id: 'item-mmr', name: '10-dose vial',
        location_type: 'Cold (2-8°C)', manufacturer: 'GSK', vvm_type: 'VVM7',
        created_by: 'user-cleo', created_datetime: now - 5*day, deleted_datetime: null,
        packaging_variants: [
          { name: 'Dose', packaging_level: 1, pack_size: 1, volume_per_unit: 0.5 },
          { name: 'Vial', packaging_level: 2, pack_size: 10, volume_per_unit: 5 },
        ],
      },
    ];

    // ---------- Property values ----------
    const property_values = [
      // Amoxicillin
      { id: 'pv-amox-tc',   table_name: 'item', record_id: 'item-amox250', property_id: 'prop-tc',   value_text: null, value_real: null, value_date: null, value_number: null, value_option_id: 'opt-tc-anti' },
      { id: 'pv-amox-atc',  table_name: 'item', record_id: 'item-amox250', property_id: 'prop-atc',  value_text: 'J01CA04', value_real: null, value_date: null, value_number: null, value_option_id: null },
      { id: 'pv-amox-tmin', table_name: 'item', record_id: 'item-amox250', property_id: 'prop-tmin', value_text: null, value_real: 15, value_date: null, value_number: null, value_option_id: null },
      { id: 'pv-amox-tmax', table_name: 'item', record_id: 'item-amox250', property_id: 'prop-tmax', value_text: null, value_real: 30, value_date: null, value_number: null, value_option_id: null },
      { id: 'pv-amox-shelf',table_name: 'item', record_id: 'item-amox250', property_id: 'prop-shelf',value_text: null, value_real: null, value_date: null, value_number: 36, value_option_id: null },
      // Paracetamol
      { id: 'pv-para-tc',   table_name: 'item', record_id: 'item-para500', property_id: 'prop-tc',   value_text: null, value_real: null, value_date: null, value_number: null, value_option_id: 'opt-tc-anal' },
      { id: 'pv-para-atc',  table_name: 'item', record_id: 'item-para500', property_id: 'prop-atc',  value_text: 'N02BE01', value_real: null, value_date: null, value_number: null, value_option_id: null },
      { id: 'pv-para-shelf',table_name: 'item', record_id: 'item-para500', property_id: 'prop-shelf',value_text: null, value_real: null, value_date: null, value_number: 60, value_option_id: null },
      // BCG
      { id: 'pv-bcg-tc',    table_name: 'item', record_id: 'item-bcg',     property_id: 'prop-tc',   value_text: null, value_real: null, value_date: null, value_number: null, value_option_id: 'opt-tc-vacc' },
      { id: 'pv-bcg-tmin',  table_name: 'item', record_id: 'item-bcg',     property_id: 'prop-tmin', value_text: null, value_real: 2, value_date: null, value_number: null, value_option_id: null },
      { id: 'pv-bcg-tmax',  table_name: 'item', record_id: 'item-bcg',     property_id: 'prop-tmax', value_text: null, value_real: 8, value_date: null, value_number: null, value_option_id: null },
      // MMR
      { id: 'pv-mmr-tc',    table_name: 'item', record_id: 'item-mmr',     property_id: 'prop-tc',   value_text: null, value_real: null, value_date: null, value_number: null, value_option_id: 'opt-tc-vacc' },
    ];

    return {
      version: 1,
      actingUserId: 'user-alice',
      users,
      units,
      items,
      item_variants,
      properties,
      property_options,
      property_values,
      approvals,
    };
  }

  window.Seed = { build };
})();
