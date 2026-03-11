use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS document_view;
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
                DROP VIEW IF EXISTS vaccination_view;
                DROP VIEW IF EXISTS barcode_view;
                DROP VIEW IF EXISTS goods_received_view;  -- removed but keep drop for cleanup
                DROP VIEW IF EXISTS goods_received_line_view;  -- removed but keep drop for cleanup
                DROP VIEW IF EXISTS item_variant_view;
                DROP VIEW IF EXISTS program_event_view;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW document_view AS
                SELECT document.*, name_link.name_id as owner_name_id
                FROM document
                LEFT JOIN name_link ON document.owner_name_link_id = name_link.id;

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
                    name_link.name_id as name_id,
                    default_donor_link.name_id as default_donor_id
                FROM
                    invoice
                JOIN
                    name_link ON invoice.name_link_id = name_link.id
                LEFT JOIN
                    name_link AS default_donor_link ON invoice.default_donor_link_id = default_donor_link.id;

                CREATE VIEW requisition_view AS
                SELECT
                    requisition.*,
                    name_link.name_id as name_id,
                    original_customer_link.name_id as original_customer_id
                FROM
                    requisition
                JOIN
                    name_link ON requisition.name_link_id = name_link.id
                LEFT JOIN
                    name_link AS original_customer_link ON requisition.original_customer_link_id = original_customer_link.id;

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
                    stock_line.*,
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
                    purchase_order.*,
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
                    invoice_line.*,
                    donor_link.name_id as donor_id
                FROM
                    invoice_line
                LEFT JOIN
                    name_link AS donor_link ON invoice_line.donor_link_id = donor_link.id;

                CREATE VIEW purchase_order_line_view AS
                SELECT
                    purchase_order_line.*,
                    manufacturer_link.name_id as manufacturer_id
                FROM
                    purchase_order_line
                LEFT JOIN
                    name_link AS manufacturer_link ON purchase_order_line.manufacturer_link_id = manufacturer_link.id;

                CREATE VIEW stocktake_line_view AS
                SELECT
                    stocktake_line.*,
                    donor_link.name_id as donor_id
                FROM
                    stocktake_line
                LEFT JOIN
                    name_link AS donor_link ON stocktake_line.donor_link_id = donor_link.id;

                CREATE VIEW encounter_view AS
                SELECT
                    encounter.*,
                    patient_link.name_id as patient_id
                FROM
                    encounter
                JOIN
                    name_link AS patient_link ON encounter.patient_link_id = patient_link.id;

                CREATE VIEW program_enrolment_view AS
                SELECT
                    program_enrolment.*,
                    patient_link.name_id as patient_id
                FROM
                    program_enrolment
                JOIN
                    name_link AS patient_link ON program_enrolment.patient_link_id = patient_link.id;

                CREATE VIEW vaccination_view AS
                SELECT
                    vaccination.*,
                    patient_link.name_id as patient_id,
                    facility_link.name_id as facility_name_id
                FROM
                    vaccination
                JOIN
                    name_link AS patient_link ON vaccination.patient_link_id = patient_link.id
                LEFT JOIN
                    name_link AS facility_link ON vaccination.facility_name_link_id = facility_link.id;

                CREATE VIEW barcode_view AS
                SELECT
                    barcode.*,
                    manufacturer_link.name_id as manufacturer_id
                FROM
                    barcode
                LEFT JOIN
                    name_link AS manufacturer_link ON barcode.manufacturer_link_id = manufacturer_link.id;

                CREATE VIEW item_variant_view AS
                SELECT
                    item_variant.*,
                    manufacturer_link.name_id as manufacturer_id
                FROM
                    item_variant
                LEFT JOIN
                    name_link AS manufacturer_link ON item_variant.manufacturer_link_id = manufacturer_link.id;

                CREATE VIEW program_event_view AS
                SELECT
                    program_event.*,
                    patient_link.name_id as patient_id
                FROM
                    program_event
                LEFT JOIN
                    name_link AS patient_link ON program_event.patient_link_id = patient_link.id;
            "#
        )?;

        Ok(())
    }
}
