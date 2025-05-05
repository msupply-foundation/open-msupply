use crate::migrations::*;

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        DROP TRIGGER IF EXISTS location__insert_trigger;
        DROP TRIGGER IF EXISTS location__update_trigger;
        DROP TRIGGER IF EXISTS location__delete_trigger;
        DROP TRIGGER IF EXISTS stock_line_insert_trigger;
        DROP TRIGGER IF EXISTS stock_line_update_trigger;
        DROP TRIGGER IF EXISTS stock_line_delete_trigger;
        DROP TRIGGER IF EXISTS stocktake_insert_trigger;
        DROP TRIGGER IF EXISTS stocktake_update_trigger;
        DROP TRIGGER IF EXISTS stocktake_delete_trigger;
        DROP TRIGGER IF EXISTS stocktake_line_insert_trigger;
        DROP TRIGGER IF EXISTS stocktake_line_update_trigger;
        DROP TRIGGER IF EXISTS stocktake_line_delete_trigger;
        DROP TRIGGER IF EXISTS activity_log_insert_trigger;
        DROP TRIGGER IF EXISTS barcode_delete_trigger;
        DROP TRIGGER IF EXISTS location_movement_insert_trigger;
        DROP TRIGGER IF EXISTS location_movement_update_trigger;
        DROP TRIGGER IF EXISTS location_movement_delete_trigger;
        DROP TRIGGER IF EXISTS barcode_insert_trigger;
        DROP TRIGGER IF EXISTS barcode_update_trigger;
        DROP TRIGGER IF EXISTS clinician_insert_trigger;
        DROP TRIGGER IF EXISTS clinician_update_trigger;
        DROP TRIGGER IF EXISTS clinician_delete_trigger;
        DROP TRIGGER IF EXISTS clinician_store_join_insert_trigger;
        DROP TRIGGER IF EXISTS clinician_store_join_update_trigger;
        DROP TRIGGER IF EXISTS clinician_store_join_delete_trigger;
        DROP TRIGGER IF EXISTS document_insert_trigger;
        DROP TRIGGER IF EXISTS document_update_trigger;
        DROP TRIGGER IF EXISTS sensor_insert_trigger;
        DROP TRIGGER IF EXISTS sensor_update_trigger;
        DROP TRIGGER IF EXISTS sensor_delete_trigger;
        DROP TRIGGER IF EXISTS temperature_breach_insert_trigger;
        DROP TRIGGER IF EXISTS temperature_log_insert_trigger;
        DROP TRIGGER IF EXISTS temperature_breach_config_insert_trigger;
        DROP TRIGGER IF EXISTS temperature_breach_update_trigger;
        DROP TRIGGER IF EXISTS temperature_log_update_trigger;
        DROP TRIGGER IF EXISTS temperature_breach_config_update_trigger;
        DROP TRIGGER IF EXISTS temperature_breach_delete_trigger;
        DROP TRIGGER IF EXISTS temperature_log_delete_trigger;
        DROP TRIGGER IF EXISTS temperature_breach_config_delete_trigger;
        DROP TRIGGER IF EXISTS currency_insert_trigger;
        DROP TRIGGER IF EXISTS currency_update_trigger;
        DROP TRIGGER IF EXISTS currency_delete_trigger;
        DROP TRIGGER IF EXISTS invoice_insert_trigger;
        DROP TRIGGER IF EXISTS invoice_update_trigger;
        DROP TRIGGER IF EXISTS invoice_delete_trigger;
        DROP TRIGGER IF EXISTS invoice_line_insert_trigger;
        DROP TRIGGER IF EXISTS invoice_line_update_trigger;
        DROP TRIGGER IF EXISTS invoice_line_delete_trigger;
        DROP TRIGGER IF EXISTS name_store_join_insert_trigger;
        DROP TRIGGER IF EXISTS name_store_join_update_trigger;
        DROP TRIGGER IF EXISTS requisition_insert_trigger;
        DROP TRIGGER IF EXISTS requisition_update_trigger;
        DROP TRIGGER IF EXISTS requisition_delete_trigger;
        DROP TRIGGER IF EXISTS requisition_line_insert_trigger;
        DROP TRIGGER IF EXISTS requisition_line_update_trigger;
        DROP TRIGGER IF EXISTS requisition_line_delete_trigger;
        DROP TRIGGER IF EXISTS asset_class_insert_trigger;
        DROP TRIGGER IF EXISTS asset_class_update_trigger;
        DROP TRIGGER IF EXISTS asset_category_insert_trigger;
        DROP TRIGGER IF EXISTS asset_category_update_trigger;
        DROP TRIGGER IF EXISTS asset_catalogue_type_insert_trigger;
        DROP TRIGGER IF EXISTS asset_catalogue_type_update_trigger;
        DROP TRIGGER IF EXISTS asset_catalogue_item_insert_trigger;
        DROP TRIGGER IF EXISTS asset_catalogue_item_update_trigger;
        DROP TRIGGER IF EXISTS pack_variant_insert_trigger;
        DROP TRIGGER IF EXISTS pack_variant_update_trigger;
    "#,
    )?;
    Ok(())
}

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            DROP TRIGGER IF EXISTS activity_log_upsert_trigger on activity_log;
            DROP TRIGGER IF EXISTS asset_catalogue_item_trigger on asset_catalogue_item;
            DROP TRIGGER IF EXISTS asset_catalogue_type_trigger on asset_catalogue_type;
            DROP TRIGGER IF EXISTS asset_category_trigger on asset_category;
            DROP TRIGGER IF EXISTS asset_class_trigger on asset_class;
            DROP TRIGGER IF EXISTS barcode_delete_trigger on barcode;
            DROP TRIGGER IF EXISTS barcode_upsert_trigger on barcode;
            DROP TRIGGER IF EXISTS clinician_trigger on clinician;
            DROP TRIGGER IF EXISTS clinician_store_join_trigger on clinician_store_join;
            DROP TRIGGER IF EXISTS currency_trigger on currency;
            DROP TRIGGER IF EXISTS document_trigger on document;
            DROP TRIGGER IF EXISTS invoice_delete_trigger on invoice;
            DROP TRIGGER IF EXISTS invoice_upsert_trigger on invoice;
            DROP TRIGGER IF EXISTS invoice_line_delete_trigger on invoice_line;
            DROP TRIGGER IF EXISTS invoice_line_upsert_trigger on invoice_line;
            DROP TRIGGER IF EXISTS location_trigger on location;
            DROP TRIGGER IF EXISTS location_movement_trigger on location_movement;
            DROP TRIGGER IF EXISTS name_store_join_upsert_trigger on name_store_join;
            DROP TRIGGER IF EXISTS pack_variant_trigger on pack_variant;
            DROP TRIGGER IF EXISTS requisition_delete_trigger on requisition;
            DROP TRIGGER IF EXISTS requisition_upsert_trigger on requisition;
            DROP TRIGGER IF EXISTS requisition_line_delete_trigger on requisition_line;
            DROP TRIGGER IF EXISTS requisition_line_upsert_trigger on requisition_line;
            DROP TRIGGER IF EXISTS sensor_trigger on sensor;
            DROP TRIGGER IF EXISTS stock_line_trigger on stock_line;
            DROP TRIGGER IF EXISTS stocktake_trigger on stocktake;
            DROP TRIGGER IF EXISTS stocktake_line_trigger on stocktake_line;
            DROP TRIGGER IF EXISTS temperature_breach_trigger on temperature_breach;
            DROP TRIGGER IF EXISTS temperature_breach_config_trigger on temperature_breach_config;
            DROP TRIGGER IF EXISTS temperature_log_trigger on temperature_log;
        "#,
    )?;

    Ok(())
}
