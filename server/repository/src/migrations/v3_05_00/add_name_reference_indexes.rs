use crate::migrations::*;

/// `NameRowRepository::used_by` checks these columns, which had no index. A nullable column
/// indexes only the rows that have a name.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_reference_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX index_invoice_default_donor_link_id
                    ON invoice (default_donor_link_id) WHERE default_donor_link_id IS NOT NULL;
                CREATE INDEX index_invoice_line_donor_link_id
                    ON invoice_line (donor_link_id) WHERE donor_link_id IS NOT NULL;
                CREATE INDEX index_stock_line_donor_link_id
                    ON stock_line (donor_link_id) WHERE donor_link_id IS NOT NULL;
                CREATE INDEX index_stocktake_line_donor_link_id
                    ON stocktake_line (donor_link_id) WHERE donor_link_id IS NOT NULL;
                CREATE INDEX index_purchase_order_supplier_name_link_id
                    ON purchase_order (supplier_name_link_id);
                CREATE INDEX index_purchase_order_donor_link_id
                    ON purchase_order (donor_link_id) WHERE donor_link_id IS NOT NULL;
                CREATE INDEX index_purchase_order_line_manufacturer_link_id
                    ON purchase_order_line (manufacturer_link_id) WHERE manufacturer_link_id IS NOT NULL;
                CREATE INDEX index_item_variant_manufacturer_link_id
                    ON item_variant (manufacturer_link_id) WHERE manufacturer_link_id IS NOT NULL;
                CREATE INDEX index_barcode_proposal_manufacturer_link_id
                    ON barcode_proposal (manufacturer_link_id) WHERE manufacturer_link_id IS NOT NULL;
                CREATE INDEX index_requisition_destination_customer_link_id
                    ON requisition (destination_customer_link_id)
                    WHERE destination_customer_link_id IS NOT NULL;
                CREATE INDEX index_rnr_form_name_link_id ON rnr_form (name_link_id);
                CREATE INDEX index_asset_donor_name_id
                    ON asset (donor_name_id) WHERE donor_name_id IS NOT NULL;
                CREATE INDEX index_vaccination_facility_name_link_id
                    ON vaccination (facility_name_link_id) WHERE facility_name_link_id IS NOT NULL;
            "#,
        )?;

        Ok(())
    }
}
