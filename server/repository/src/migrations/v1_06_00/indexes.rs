use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE INDEX index_temperature_log_datetime ON temperature_log (datetime);        
        CREATE INDEX index_temperature_breach_config_store_id ON temperature_breach_config (store_id);
        CREATE INDEX index_invoice_line_inventory_adjustment_reason_id ON invoice_line (inventory_adjustment_reason_id);
        CREATE INDEX index_document_form_schema_id ON document (form_schema_id);
        CREATE INDEX index_document_owner_name_id ON document (owner_name_id);
        CREATE INDEX index_document_context_id ON document (context_id);
        CREATE INDEX index_contact_trace_program_id ON contact_trace (program_id);
        CREATE INDEX index_contact_trace_document_id ON contact_trace (document_id);
        CREATE INDEX index_contact_trace_patient_id ON contact_trace (patient_id);
        CREATE INDEX index_contact_trace_contact_patient_id ON contact_trace (contact_patient_id);
        CREATE INDEX index_contact_trace_store_id ON contact_trace (store_id);
        CREATE INDEX index_stock_line_supplier_id ON stock_line (supplier_id);
        CREATE INDEX index_stock_line_barcode_id ON stock_line (barcode_id);
        CREATE INDEX index_sensor_store_id ON sensor (store_id);
        CREATE INDEX index_sensor_location_id ON sensor (location_id);
        CREATE INDEX index_barcode_item_id ON barcode (item_id);
        CREATE INDEX index_temperature_log_sensor_id ON temperature_log (sensor_id);
        CREATE INDEX index_temperature_log_store_id ON temperature_log (store_id);
        CREATE INDEX index_temperature_log_location_id ON temperature_log (location_id);
        CREATE INDEX index_temperature_log_temperature_breach_id ON temperature_log (temperature_breach_id);
        CREATE INDEX index_encounter_clinician_id ON encounter (clinician_id);
        CREATE INDEX index_encounter_enrolment_program_id ON encounter (program_id);
        CREATE INDEX index_program_event_context_id ON program_event (context_id);
        CREATE INDEX index_program_master_list_id ON program (master_list_id);
        CREATE INDEX index_program_context_id ON program (context_id);
        CREATE INDEX i_program_requisition_ot_program_requisition_settings ON program_requisition_order_type (program_requisition_settings_id);
        CREATE INDEX index_name_tag_join_name_tag_id ON name_tag_join (name_tag_id);
        CREATE INDEX index_report_argument_schema_id ON report (argument_schema_id);
        CREATE INDEX index_temperature_breach_sensor_id ON temperature_breach (sensor_id);
        CREATE INDEX index_temperature_breach_store_id ON temperature_breach (store_id);
        CREATE INDEX index_temperature_breach_location_id ON temperature_breach (location_id);
        CREATE INDEX index_user_permission_context_id ON user_permission (context_id);
        CREATE INDEX index_requisition_period_id ON requisition (period_id);
        CREATE INDEX index_period_period_schedule_id ON period (period_schedule_id);
        CREATE INDEX index_document_registry_form_schema_id ON document_registry (form_schema_id);
        CREATE INDEX index_document_registry_context_id ON document_registry (context_id);
        CREATE INDEX index_program_requisition_settings_name_tag_id ON program_requisition_settings (name_tag_id);
        CREATE INDEX index_program_requisition_settings_program_id ON program_requisition_settings (program_id);
        CREATE INDEX index_program_requisition_settings_period_schedule_id ON program_requisition_settings (period_schedule_id);
        CREATE INDEX index_invoice_clinician_id ON invoice (clinician_id);
        CREATE INDEX index_plugin_data_store_id ON plugin_data (store_id);
        CREATE INDEX index_program_enrolment_program_id ON program_enrolment (program_id);
        CREATE INDEX index_clinician_store_join_clinician_id ON clinician_store_join (clinician_id);
        CREATE INDEX index_clinician_store_join_store_id ON clinician_store_join (store_id);
        CREATE INDEX index_stocktake_line_inventory_adjustment_reason_id ON stocktake_line (inventory_adjustment_reason_id);
        "#,
    )?;

    Ok(())
}
