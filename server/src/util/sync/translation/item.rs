use super::SyncRecord;

use crate::database::schema::ItemRow;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct LegacyItemRow {
    #[serde(rename = "ID")]
    id: String,
    item_name: String,
    type_of: String,
    /*
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
    */
}

impl LegacyItemRow {
    pub fn try_translate(sync_record: &SyncRecord) -> Result<Option<ItemRow>, String> {
        if sync_record.record_type != "item" {
            return Ok(None);
        }
        let data = serde_json::from_str::<LegacyItemRow>(&sync_record.data)
            .map_err(|_| "Deserialization Error".to_string())?;
        Ok(Some(ItemRow {
            id: data.id.to_string(),
            name: data.item_name.to_string(),
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::util::sync::translation::{
        item::LegacyItemRow,
        test_data::{item::get_test_item_records, TestSyncDataRecord},
    };

    #[test]
    fn test_item_translation() {
        for record in get_test_item_records() {
            match record.translated_record {
                TestSyncDataRecord::Item(translated_record) => {
                    assert_eq!(
                        LegacyItemRow::try_translate(&record.sync_record).unwrap(),
                        translated_record,
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
