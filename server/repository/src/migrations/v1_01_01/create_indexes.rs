use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        -- Foreign Keys (defined as REFERENCES)
        CREATE INDEX "index_stocktake_line_item_id_fkey" ON "stocktake_line" ("item_id");
        CREATE INDEX "index_stocktake_line_location_id_fkey" ON "stocktake_line" ("location_id");
        CREATE INDEX "index_stocktake_line_stock_line_id_fkey" ON "stocktake_line" ("stock_line_id");
        CREATE INDEX "index_stocktake_line_stocktake_id_fkey" ON "stocktake_line" ("stocktake_id");
        CREATE INDEX "index_invoice_line_location_id_fkey" ON "invoice_line" ("location_id");
        CREATE INDEX "index_invoice_line_stock_line_id_fkey" ON "invoice_line" ("stock_line_id");
        CREATE INDEX "index_invoice_line_item_id_fkey" ON "invoice_line" ("item_id");
        CREATE INDEX "index_invoice_line_invoice_id_fkey" ON "invoice_line" ("invoice_id");
        CREATE INDEX "index_activity_log_store_id_fkey" ON "activity_log" ("store_id");
        CREATE INDEX "index_stocktake_inventory_addition_id_fkey" ON "stocktake" ("inventory_addition_id");
        CREATE INDEX "index_stocktake_inventory_reduction_id_fkey" ON "stocktake" ("inventory_reduction_id");
        CREATE INDEX "index_stocktake_store_id_fkey" ON "stocktake" ("store_id");
        CREATE INDEX "index_location_store_id_fkey" ON "location" ("store_id");
        CREATE INDEX "index_user_permission_store_id_fkey" ON "user_permission" ("store_id");
        CREATE INDEX "index_user_permission_user_id_fkey" ON "user_permission" ("user_id");
        CREATE INDEX "index_store_name_id_fkey" ON "store" ("name_id");
        CREATE INDEX "index_user_store_join_store_id_fkey" ON "user_store_join" ("store_id");
        CREATE INDEX "index_user_store_join_user_id_fkey" ON "user_store_join" ("user_id");
        CREATE INDEX "index_invoice_store_id_fkey" ON "invoice" ("store_id");
        CREATE INDEX "index_invoice_name_store_id_fkey" ON "invoice" ("name_store_id");
        CREATE INDEX "index_invoice_name_id_fkey" ON "invoice" ("name_id");
        CREATE INDEX "index_location_movement_stock_line_id_fkey" ON "location_movement" ("stock_line_id");
        CREATE INDEX "index_location_movement_location_id_fkey" ON "location_movement" ("location_id");
        CREATE INDEX "index_location_movement_store_id_fkey" ON "location_movement" ("store_id");
        CREATE INDEX "index_master_list_name_join_master_list_id_fkey" ON "master_list_name_join" ("master_list_id");
        CREATE INDEX "index_master_list_name_join_name_id_fkey" ON "master_list_name_join" ("name_id");
        CREATE INDEX "index_item_unit_id_fkey" ON "item" ("unit_id");
        CREATE INDEX "index_name_store_join_store_id_fkey" ON "name_store_join" ("store_id");
        CREATE INDEX "index_name_store_join_name_id_fkey" ON "name_store_join" ("name_id");
        CREATE INDEX "index_stock_line_location_id_fkey" ON "stock_line" ("location_id");
        CREATE INDEX "index_stock_line_store_id_fkey" ON "stock_line" ("store_id");
        CREATE INDEX "index_stock_line_item_id_fkey" ON "stock_line" ("item_id");
        CREATE INDEX "index_master_list_line_master_list_id_fkey" ON "master_list_line" ("master_list_id");
        CREATE INDEX "index_master_list_line_item_id_fkey" ON "master_list_line" ("item_id");
        CREATE INDEX "index_requisition_line_requisition_id_fkey" ON "requisition_line" ("requisition_id");
        CREATE INDEX "index_requisition_name_id_fkey" ON "requisition" ("name_id");
        CREATE INDEX "index_requisition_store_id_fkey" ON "requisition" ("store_id");
        -- Store
        CREATE INDEX "index_store_site_id" ON "store" ("site_id");
        -- Stock Line
        CREATE INDEX "index_stock_line_available_number_of_packs" ON "stock_line" ("available_number_of_packs");
        CREATE INDEX "index_stock_line_total_number_of_packs" ON "stock_line" ("total_number_of_packs");
        CREATE INDEX "index_stock_line_expiry_date" ON "stock_line" ("expiry_date");
        -- Requisition
        CREATE INDEX "index_requisition_requisition_number" ON "requisition" ("requisition_number");
        CREATE INDEX "index_requisition_type" ON "requisition" ("type");
        CREATE INDEX "index_requisition_status" ON "requisition" ("status");
        CREATE INDEX "index_requisition_linked_requisition_id" ON "requisition" ("linked_requisition_id");
        CREATE INDEX "index_requisition_created_datetime" ON "requisition" ("created_datetime");
        -- Requisition Line
        CREATE INDEX "index_requisition_line_item_id_fkey" ON "requisition_line" ("item_id");
        -- Invoice
        CREATE INDEX "index_invoice_invoice_number" ON "invoice" ("invoice_number");
        CREATE INDEX "index_invoice_type" ON "invoice" ("type");
        CREATE INDEX "index_invoice_status" ON "invoice" ("status");
        CREATE INDEX "index_invoice_created_datetime" ON "invoice" ("created_datetime");
        CREATE INDEX "index_invoice_requisition_id" ON "invoice" ("requisition_id");
        CREATE INDEX "index_invoice_linked_invoice_id" ON "invoice" ("linked_invoice_id");
        -- Invoice Line
        CREATE INDEX "index_invoice_line_type" ON "invoice_line" ("type");
        CREATE INDEX "index_invoice_line_number_of_packs" ON "invoice_line" ("number_of_packs");
        -- Sync Buffer
        CREATE INDEX "index_sync_buffer_integration_datetime" ON "sync_buffer" ("integration_datetime");
        CREATE INDEX "index_sync_buffer_integration_error" ON "sync_buffer" ("integration_error");
        CREATE INDEX "index_sync_buffer_action" ON "sync_buffer" ("action");
        -- Stocktake
        CREATE INDEX "index_stocktake_stocktake_number" ON "stocktake" ("stocktake_number");
        CREATE INDEX "index_stocktake_created_datetime" ON "stocktake" ("created_datetime");
        -- Changelog
        CREATE INDEX "index_changelog_table_name" ON "changelog" ("table_name");
        CREATE INDEX "index_changelog_row_action" ON "changelog" ("row_action");
        CREATE INDEX "index_changelog_name_id_fkey" ON "changelog" ("name_id");
        CREATE INDEX "index_changelog_store_id_fkey" ON "changelog" ("store_id");
        -- Report
        CREATE INDEX "index_report_type" ON "report" ("type");
        -- Activity log
        CREATE INDEX "index_activity_log_record_id_fkey" ON "activity_log" ("record_id");
        "#
    )?;
    Ok(())
}
