# Full Legacy Row Types

## Item

```rust
pub struct LegacyItemRow {
    #[serde(rename = "ID")]
    id: String,
    item_name: String,
    type_of: String,
    start_of_year_date: String,
    manufacture_method: String,
    default_pack_size: i64,
    //dose_picture": "[object Picture]",
    atc_category: String,
    medication_purpose: String,
    instructions: String,
    user_field_7: bool,
    flags: String,
    ddd_value: String,
    code: String,
    other_names: String,
    price_editable: bool,
    margin: i64,
    barcode_spare: String,
    spare_ignore_for_orders: bool,
    sms_pack_size: i64,
    expiry_date_mandatory: bool,
    volume_per_pack: i64,
    department_ID: String,
    weight: i64,
    essential_drug_list: bool,
    catalogue_code: String,
    indic_price: i64,
    user_field_1: String,
    spare_hold_for_issue: bool,
    builds_only: bool,
    reference_bom_quantity: i64,
    use_bill_of_materials: bool,
    description: String,
    spare_hold_for_receive: bool,
    Message: String,
    interaction_group_ID: String,
    spare_pack_to_one_on_receive: bool,
    cross_ref_item_ID: String,
    strength: String,
    user_field_4: bool,
    user_field_6: String,
    spare_internal_analysis: i64,
    user_field_2: String,
    user_field_3: String,
    factor: i64,
    account_stock_ID: String,
    account_purchases_ID: String,
    account_income_ID: String,
    unit_ID: String,
    outer_pack_size: i64,
    category_ID: String,
    ABC_category: String,
    warning_quantity: i64,
    user_field_5: i64,
    print_units_in_dis_labels: bool,
    volume_per_outer_pack: i64,
    normal_stock: bool,
    critical_stock: bool,
    spare_non_stock: bool,
    non_stock_name_ID: String,
    is_sync: bool,
    sms_code: String,
    category2_ID: String,
    category3_ID: String,
    buy_price: i64,
    VEN_category: String,
    universalcodes_code: String,
    universalcodes_name: String,
    //kit_data": null,
    //custom_data": null,
    doses: i64,
    is_vaccine: bool,
    restricted_location_type_ID: String,
}
```

## Name

```rust
pub struct LegacyNameRow {
    #[serde(rename = "ID")]
    id: String,
    name: String,
    fax: String,
    phone: String,
    customer: bool,
    bill_address1: String,
    bill_address2: String,
    supplier: bool,
    #[serde(rename = "charge code")]
    charge_code: String,
    margin: i64,
    comment: String,
    #[serde(rename = "currency_ID")]
    currency_id: String,
    country: String,
    freightfac: i64,
    email: String,
    custom1: String,
    code: String,
    last: String,
    first: String,
    title: String,
    female: bool,
    date_of_birth: String,
    overpayment: i64,
    #[serde(rename = "group_ID")]
    group_id: String,
    hold: bool,
    ship_address1: String,
    ship_address2: String,
    url: String,
    barcode: String,
    postal_address1: String,
    postal_address2: String,
    #[serde(rename = "category1_ID")]
    category1_id: String,
    #[serde(rename = "region_ID")]
    region_id: String,
    #[serde(rename = "type")]
    table_type: String,
    price_category: String,
    flag: String,
    manufacturer: bool,
    print_invoice_alphabetical: bool,
    custom2: String,
    custom3: String,
    default_order_days: i64,
    connection_type: i64,
    //PATIENT_PHOTO": "[object Picture]",
    NEXT_OF_KIN_ID: String,
    POBOX: String,
    ZIP: i64,
    middle: String,
    preferred: bool,
    Blood_Group: String,
    marital_status: String,
    Benchmark: bool,
    next_of_kin_relative: String,
    mother_id: String,
    postal_address3: String,
    postal_address4: String,
    bill_address3: String,
    bill_address4: String,
    ship_address3: String,
    ship_address4: String,
    ethnicity_ID: String,
    occupation_ID: String,
    religion_ID: String,
    national_health_number: String,
    Master_RTM_Supplier_Code: i64,
    ordering_method: String,
    donor: bool,
    latitude: i64,
    longitude: i64,
    Master_RTM_Supplier_name: String,
    category2_ID: String,
    category3_ID: String,
    category4_ID: String,
    category5_ID: String,
    category6_ID: String,
    bill_address5: String,
    bill_postal_zip_code: String,
    postal_address5: String,
    postal_zip_code: String,
    ship_address5: String,
    ship_postal_zip_code: String,
    supplying_store_id: String,
    license_number: String,
    license_expiry: String,
    has_current_license: bool,
    //custom_data": null,
    maximum_credit: i64,
    nationality_ID: String,
    created_date: String,
    isDeceased: bool
}
```

## Store

```rust
pub struct LegacyStoreRow {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
    name: String,
    code: String,
    mwks_export_mode: String,
    IS_HIS: bool,
    sort_issues_by_status_spare: bool,
    disabled: bool,
    responsible_user_ID: String,
    organisation_name: String,
    address_1: String,
    address_2: String,
    //logo": "[object Picture]",
    sync_id_remote_site: u64,
    address_3: String,
    address_4: String,
    address_5: String,
    postal_zip_code: String,
    store_mode: String,
    phone: String,
    tags: String,
    spare_user_1: String,
    spare_user_2: String,
    spare_user_3: String,
    spare_user_4: String,
    spare_user_5: String,
    spare_user_6: String,
    spare_user_7: String,
    spare_user_8: String,
    spare_user_9: String,
    spare_user_10: String,
    spare_user_11: String,
    spare_user_12: String,
    spare_user_13: String,
    spare_user_14: String,
    spare_user_15: String,
    spare_user_16: String,
    //custom_data: null,
    created_date: String,
}
```

## list_master (new name: master_list)

```rust
pub struct LegacyListMasterRow {
    #[serde(rename = "ID")]
    id: String,
    description: String,
    date_created: String,
    created_by_user_ID: String,
    note: String,
    gets_new_items: bool,
    //tags: null,
    isProgram: bool,
    //programSettings: null,
    code: String,
    isPatientList: bool,
    is_hiv: bool,
    isSupplierHubCatalog: bool,
}
```

## list_master_line (new name: master_list_line)

```rust
pub struct LegacyListMasterLineRow {
    #[serde(rename = "ID")]
    id: String,
    item_master_ID: String,
    item_ID: String,
    imprest_quan: i64,
    order_number: i64,
    price: i64,
}
```

## list_master_name_join (new name: master_list_name_join)

```rust
pub struct LegacyListMasterLineRow {
    #[serde(rename = "ID")]
    id: String,
    item_master_ID: String,
    item_ID: String,
    imprest_quan: i64,
    order_number: i64,
    price: i64,
}
```
