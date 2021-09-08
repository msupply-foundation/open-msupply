use super::SyncRecord;

use crate::database::schema::{ItemRow, ItemRowType};

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

fn match_item_type(type_of: String) -> ItemRowType {
    match type_of.as_str() {
        "general" => ItemRowType::General,
        "service" => ItemRowType::Service,
        "cross_reference" => ItemRowType::CrossReference,
        "non_stock" => ItemRowType::NoneStock,
        _ => panic!("unknown type"),
    }
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
            item_name: data.item_name.to_string(),
            type_of: match_item_type(data.type_of),
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        database::{
            repository::{repository::get_repositories, ItemRepository},
            schema::ItemRowType,
        },
        server::data::RepositoryRegistry,
        util::{
            sync::translation::{import_sync_records, SyncRecord, SyncType},
            test_db,
        },
    };

    #[tokio::test]
    async fn test_item_translation() {
        let settings = test_db::get_test_settings("omsupply-database-item-translation");
        test_db::setup(&settings.database).await;
        let repositories = get_repositories(&settings).await;
        let registry = RepositoryRegistry { repositories };
        let item_repo = registry.get::<ItemRepository>();

        let record = SyncRecord {
            sync_type: SyncType::Insert,
            record_type: "item".to_string(),
            data: r#"
            {"ID":"8F252B5884B74888AAB73A0D42C09E7F","item_name":"Non stock items","start_of_year_date":"0000-00-00","manufacture_method":"","default_pack_size":1,"dose_picture":"[object Picture]","atc_category":"","medication_purpose":"","instructions":"","user_field_7":false,"flags":"","ddd_value":"","code":"NSI","other_names":"","type_of":"non_stock","price_editable":false,"margin":0,"barcode_spare":"","spare_ignore_for_orders":false,"sms_pack_size":0,"expiry_date_mandatory":false,"volume_per_pack":0,"department_ID":"","weight":0,"essential_drug_list":false,"catalogue_code":"","indic_price":0,"user_field_1":"","spare_hold_for_issue":false,"builds_only":false,"reference_bom_quantity":0,"use_bill_of_materials":false,"description":"","spare_hold_for_receive":false,"Message":"","interaction_group_ID":"","spare_pack_to_one_on_receive":false,"cross_ref_item_ID":"","strength":"","user_field_4":false,"user_field_6":"","spare_internal_analysis":0,"user_field_2":"","user_field_3":"","ddd factor":0,"account_stock_ID":"52923505A91447B9923BA34A4F332014","account_purchases_ID":"330ACC81721C4126BD5DD6769466C5C4","account_income_ID":"EF34ADD07C014AB8914E30CA2E3FEA8D","unit_ID":"","outer_pack_size":0,"category_ID":"","ABC_category":"","warning_quantity":0,"user_field_5":0,"print_units_in_dis_labels":false,"volume_per_outer_pack":0,"normal_stock":false,"critical_stock":false,"spare_non_stock":false,"non_stock_name_ID":"","is_sync":false,"sms_code":"","category2_ID":"","category3_ID":"","buy_price":0,"VEN_category":"","universalcodes_code":"","universalcodes_name":"","kit_data":null,"custom_data":null,"doses":0,"is_vaccine":false,"restricted_location_type_ID":""}
            "#.to_string(),
        };
        let records = vec![record];
        import_sync_records(&registry, &records).await.unwrap();
        let entry = item_repo
            .find_one_by_id("8F252B5884B74888AAB73A0D42C09E7F")
            .await
            .unwrap();
        assert_eq!(entry.item_name, "Non stock items");
        assert_eq!(entry.type_of, ItemRowType::NoneStock);

        // should be able to upsert
        let record = SyncRecord {
            sync_type: SyncType::Insert,
            record_type: "item".to_string(),
            data: r#"
            {"ID":"8F252B5884B74888AAB73A0D42C09E7F","item_name":"Non stock items 2","start_of_year_date":"0000-00-00","manufacture_method":"","default_pack_size":1,"dose_picture":"[object Picture]","atc_category":"","medication_purpose":"","instructions":"","user_field_7":false,"flags":"","ddd_value":"","code":"NSI","other_names":"","type_of":"general","price_editable":false,"margin":0,"barcode_spare":"","spare_ignore_for_orders":false,"sms_pack_size":0,"expiry_date_mandatory":false,"volume_per_pack":0,"department_ID":"","weight":0,"essential_drug_list":false,"catalogue_code":"","indic_price":0,"user_field_1":"","spare_hold_for_issue":false,"builds_only":false,"reference_bom_quantity":0,"use_bill_of_materials":false,"description":"","spare_hold_for_receive":false,"Message":"","interaction_group_ID":"","spare_pack_to_one_on_receive":false,"cross_ref_item_ID":"","strength":"","user_field_4":false,"user_field_6":"","spare_internal_analysis":0,"user_field_2":"","user_field_3":"","ddd factor":0,"account_stock_ID":"52923505A91447B9923BA34A4F332014","account_purchases_ID":"330ACC81721C4126BD5DD6769466C5C4","account_income_ID":"EF34ADD07C014AB8914E30CA2E3FEA8D","unit_ID":"","outer_pack_size":0,"category_ID":"","ABC_category":"","warning_quantity":0,"user_field_5":0,"print_units_in_dis_labels":false,"volume_per_outer_pack":0,"normal_stock":false,"critical_stock":false,"spare_non_stock":false,"non_stock_name_ID":"","is_sync":false,"sms_code":"","category2_ID":"","category3_ID":"","buy_price":0,"VEN_category":"","universalcodes_code":"","universalcodes_name":"","kit_data":null,"custom_data":null,"doses":0,"is_vaccine":false,"restricted_location_type_ID":""}
            "#.to_string(),
        };
        let records = vec![record];
        import_sync_records(&registry, &records).await.unwrap();
        let entry = item_repo
            .find_one_by_id("8F252B5884B74888AAB73A0D42C09E7F")
            .await
            .unwrap();
        assert_eq!(entry.item_name, "Non stock items 2");
        assert_eq!(entry.type_of, ItemRowType::General);
    }
}
