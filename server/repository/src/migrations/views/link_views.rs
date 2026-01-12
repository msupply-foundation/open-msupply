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
            "#
        )?;

        Ok(())
    }
}
