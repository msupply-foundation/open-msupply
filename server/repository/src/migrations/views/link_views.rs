use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS name_store_join_view;
                DROP VIEW IF EXISTS store_view;
                DROP VIEW IF EXISTS name_tag_join_view;
                DROP VIEW IF EXISTS master_list_name_join_view;
                DROP VIEW IF EXISTS invoice_view;
                DROP VIEW IF EXISTS requisition_view;
                DROP VIEW IF EXISTS rnr_form_view;
                DROP VIEW IF EXISTS name_insurance_join_view;
                DROP VIEW IF EXISTS contact_view;
                DROP VIEW IF EXISTS indicator_value_view;
                DROP VIEW IF EXISTS stock_line_view;
                DROP VIEW IF EXISTS purchase_order_view;
                DROP VIEW IF EXISTS invoice_line_view;
                DROP VIEW IF EXISTS purchase_order_line_view;
                DROP VIEW IF EXISTS stocktake_line_view;
                DROP VIEW IF EXISTS encounter_view;
                DROP VIEW IF EXISTS program_enrolment_view;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW name_store_join_view AS
                SELECT
                    name_store_join.*,
                    name_link.name_id as name_id
                FROM
                    name_store_join
                JOIN
                    name_link ON name_store_join.name_link_id = name_link.id;

                CREATE VIEW store_view AS
                SELECT
                    store.*,
                    name_link.name_id as name_id
                FROM
                    store
                JOIN
                    name_link ON store.name_link_id = name_link.id;


                CREATE VIEW name_tag_join_view AS
                SELECT
                    name_tag_join.*,
                    name_link.name_id as name_id
                FROM
                    name_tag_join
                JOIN
                    name_link ON name_tag_join.name_link_id = name_link.id;

                CREATE VIEW master_list_name_join_view AS
                SELECT
                    master_list_name_join.*,
                    name_link.name_id as name_id
                FROM
                    master_list_name_join
                JOIN
                    name_link ON master_list_name_join.name_link_id = name_link.id;

                CREATE VIEW invoice_view AS
                SELECT
                    invoice.*,
                    name_link.name_id as name_id
                FROM
                    invoice
                JOIN
                    name_link ON invoice.name_link_id = name_link.id;

                CREATE VIEW requisition_view AS
                SELECT
                    requisition.*,
                    name_link.name_id as name_id
                FROM
                    requisition
                JOIN
                    name_link ON requisition.name_link_id = name_link.id;

                CREATE VIEW rnr_form_view AS
                SELECT
                    rnr_form.*,
                    name_link.name_id as name_id
                FROM
                    rnr_form
                JOIN
                    name_link ON rnr_form.name_link_id = name_link.id;

                CREATE VIEW name_insurance_join_view AS
                SELECT
                    name_insurance_join.*,
                    name_link.name_id as name_id
                FROM
                    name_insurance_join
                JOIN
                    name_link ON name_insurance_join.name_link_id = name_link.id;

                CREATE VIEW contact_view AS
                SELECT
                    contact.*,
                    name_link.name_id as name_id
                FROM
                    contact
                JOIN
                    name_link ON contact.name_link_id = name_link.id;

                CREATE VIEW indicator_value_view AS
                SELECT
                    indicator_value.*,
                    name_link.name_id as customer_name_id
                FROM
                    indicator_value
                JOIN
                    name_link ON indicator_value.customer_name_link_id = name_link.id;

                CREATE VIEW stock_line_view AS
                SELECT
                    stock_line.id,
                    stock_line.item_link_id,
                    stock_line.store_id,
                    stock_line.location_id,
                    stock_line.batch,
                    stock_line.pack_size,
                    stock_line.cost_price_per_pack,
                    stock_line.sell_price_per_pack,
                    stock_line.available_number_of_packs,
                    stock_line.total_number_of_packs,
                    stock_line.expiry_date,
                    stock_line.on_hold,
                    stock_line.note,
                    stock_line.barcode_id,
                    stock_line.item_variant_id,
                    stock_line.vvm_status_id,
                    stock_line.campaign_id,
                    stock_line.program_id,
                    stock_line.total_volume,
                    stock_line.volume_per_pack,
                    supplier_link.name_id as supplier_id,
                    donor_link.name_id as donor_id
                FROM
                    stock_line
                LEFT JOIN
                    name_link AS supplier_link ON stock_line.supplier_link_id = supplier_link.id
                LEFT JOIN
                    name_link AS donor_link ON stock_line.donor_link_id = donor_link.id;

                CREATE VIEW purchase_order_view AS
                SELECT
                    purchase_order.id,
                    purchase_order.store_id,
                    purchase_order.created_by,
                    purchase_order.purchase_order_number,
                    purchase_order.status,
                    purchase_order.created_datetime,
                    purchase_order.confirmed_datetime,
                    purchase_order.target_months,
                    purchase_order.comment,
                    purchase_order.reference,
                    purchase_order.currency_id,
                    purchase_order.foreign_exchange_rate,
                    purchase_order.shipping_method,
                    purchase_order.sent_datetime,
                    purchase_order.contract_signed_date,
                    purchase_order.advance_paid_date,
                    purchase_order.received_at_port_date,
                    purchase_order.requested_delivery_date,
                    purchase_order.supplier_agent,
                    purchase_order.authorising_officer_1,
                    purchase_order.authorising_officer_2,
                    purchase_order.additional_instructions,
                    purchase_order.heading_message,
                    purchase_order.agent_commission,
                    purchase_order.document_charge,
                    purchase_order.communications_charge,
                    purchase_order.insurance_charge,
                    purchase_order.freight_charge,
                    purchase_order.freight_conditions,
                    purchase_order.supplier_discount_percentage,
                    purchase_order.request_approval_datetime,
                    purchase_order.finalised_datetime,
                    supplier_link.name_id as supplier_name_id,
                    donor_link.name_id as donor_id
                FROM
                    purchase_order
                LEFT JOIN
                    name_link AS supplier_link ON purchase_order.supplier_name_link_id = supplier_link.id
                LEFT JOIN
                    name_link AS donor_link ON purchase_order.donor_link_id = donor_link.id;

                CREATE VIEW invoice_line_view AS
                SELECT
                    invoice_line.id,
                    invoice_line.invoice_id,
                    invoice_line.item_link_id,
                    invoice_line.item_name,
                    invoice_line.item_code,
                    invoice_line.stock_line_id,
                    invoice_line.location_id,
                    invoice_line.batch,
                    invoice_line.expiry_date,
                    invoice_line.pack_size,
                    invoice_line.cost_price_per_pack,
                    invoice_line.sell_price_per_pack,
                    invoice_line.total_before_tax,
                    invoice_line.total_after_tax,
                    invoice_line.tax_percentage,
                    invoice_line.type,
                    invoice_line.number_of_packs,
                    invoice_line.prescribed_quantity,
                    invoice_line.note,
                    invoice_line.foreign_currency_price_before_tax,
                    invoice_line.item_variant_id,
                    invoice_line.linked_invoice_id,
                    invoice_line.vvm_status_id,
                    invoice_line.reason_option_id,
                    invoice_line.campaign_id,
                    invoice_line.program_id,
                    invoice_line.shipped_number_of_packs,
                    invoice_line.volume_per_pack,
                    invoice_line.shipped_pack_size,
                    donor_link.name_id as donor_id
                FROM
                    invoice_line
                LEFT JOIN
                    name_link AS donor_link ON invoice_line.donor_link_id = donor_link.id;

                CREATE VIEW purchase_order_line_view AS
                SELECT
                    purchase_order_line.id,
                    purchase_order_line.store_id,
                    purchase_order_line.purchase_order_id,
                    purchase_order_line.line_number,
                    purchase_order_line.item_link_id,
                    purchase_order_line.item_name,
                    purchase_order_line.requested_pack_size,
                    purchase_order_line.requested_number_of_units,
                    purchase_order_line.adjusted_number_of_units,
                    purchase_order_line.received_number_of_units,
                    purchase_order_line.requested_delivery_date,
                    purchase_order_line.expected_delivery_date,
                    purchase_order_line.stock_on_hand_in_units,
                    purchase_order_line.supplier_item_code,
                    purchase_order_line.price_per_pack_before_discount,
                    purchase_order_line.price_per_pack_after_discount,
                    purchase_order_line.comment,
                    purchase_order_line.note,
                    purchase_order_line.unit,
                    purchase_order_line.status,
                    manufacturer_link.name_id as manufacturer_id
                FROM
                    purchase_order_line
                LEFT JOIN
                    name_link AS manufacturer_link ON purchase_order_line.manufacturer_link_id = manufacturer_link.id;

                CREATE VIEW stocktake_line_view AS
                SELECT
                    stocktake_line.id,
                    stocktake_line.stocktake_id,
                    stocktake_line.stock_line_id,
                    stocktake_line.location_id,
                    stocktake_line.comment,
                    stocktake_line.snapshot_number_of_packs,
                    stocktake_line.counted_number_of_packs,
                    stocktake_line.item_link_id,
                    stocktake_line.item_name,
                    stocktake_line.batch,
                    stocktake_line.expiry_date,
                    stocktake_line.pack_size,
                    stocktake_line.cost_price_per_pack,
                    stocktake_line.sell_price_per_pack,
                    stocktake_line.note,
                    stocktake_line.item_variant_id,
                    stocktake_line.reason_option_id,
                    stocktake_line.vvm_status_id,
                    stocktake_line.volume_per_pack,
                    stocktake_line.campaign_id,
                    stocktake_line.program_id,
                    donor_link.name_id as donor_id
                FROM
                    stocktake_line
                LEFT JOIN
                    name_link AS donor_link ON stocktake_line.donor_link_id = donor_link.id;

                CREATE VIEW encounter_view AS
                SELECT
                    encounter.id,
                    encounter.document_type,
                    encounter.document_name,
                    encounter.program_id,
                    encounter.created_datetime,
                    encounter.start_datetime,
                    encounter.end_datetime,
                    encounter.status,
                    encounter.clinician_link_id,
                    encounter.store_id,
                    patient_link.name_id as patient_id
                FROM
                    encounter
                JOIN
                    name_link AS patient_link ON encounter.patient_link_id = patient_link.id;

                CREATE VIEW program_enrolment_view AS
                SELECT
                    program_enrolment.id,
                    program_enrolment.document_type,
                    program_enrolment.document_name,
                    program_enrolment.program_id,
                    program_enrolment.enrolment_datetime,
                    program_enrolment.program_enrolment_id,
                    program_enrolment.status,
                    program_enrolment.store_id,
                    patient_link.name_id as patient_id
                FROM
                    program_enrolment
                JOIN
                    name_link AS patient_link ON program_enrolment.patient_link_id = patient_link.id;
            "#
        )?;

        Ok(())
    }
}
