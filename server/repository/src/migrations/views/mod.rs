use crate::{migrations::sql, StorageConnection};

mod adjustments;
mod changelog_deduped;
mod consumption;
mod inbound_shipment_stock_movement;
mod inventory_adjustment_stock_movement;
mod invoice_line_stock_movement;
mod item_ledger;
mod latest_asset_log;
mod latest_document;
mod outbound_shipment_stock_movement;
mod replenishment;
mod report_document;
mod report_encounter;
mod report_patient;
mod report_program_enrolment;
mod report_program_event;
mod report_store;
mod requisitions_in_period;
mod stock_line_ledger;
mod stock_line_ledger_discrepancy;
mod stock_movement;
mod stock_on_hand;
mod store_items;
mod vaccination_card;

pub(crate) trait ViewMigrationFragment {
    fn drop_view(&self, _connection: &StorageConnection) -> anyhow::Result<()>;
    fn rebuild_view(&self, _connection: &StorageConnection) -> anyhow::Result<()>;
}

// List of all view migrations, they need be in the order required for creation.
// Dropped will be in the reverse order.
fn all_views() -> Vec<Box<dyn ViewMigrationFragment>> {
    vec![
        Box::new(invoice_line_stock_movement::ViewMigration),
        Box::new(outbound_shipment_stock_movement::ViewMigration),
        Box::new(inbound_shipment_stock_movement::ViewMigration),
        Box::new(inventory_adjustment_stock_movement::ViewMigration),
        Box::new(stock_movement::ViewMigration),
        Box::new(stock_line_ledger::ViewMigration),
        Box::new(stock_line_ledger_discrepancy::ViewMigration),
        // lot 2:
        Box::new(item_ledger::ViewMigration),
        Box::new(replenishment::ViewMigration),
        Box::new(adjustments::ViewMigration),
        Box::new(consumption::ViewMigration),
        Box::new(store_items::ViewMigration),
        Box::new(stock_on_hand::ViewMigration),
        // lot 3:
        Box::new(changelog_deduped::ViewMigration),
        Box::new(latest_document::ViewMigration),
        Box::new(latest_asset_log::ViewMigration),
        Box::new(report_document::ViewMigration),
        Box::new(report_encounter::ViewMigration),
        Box::new(report_store::ViewMigration),
        // lot 4:
        Box::new(report_patient::ViewMigration),
        Box::new(report_program_event::ViewMigration),
        Box::new(report_program_enrolment::ViewMigration),
        Box::new(requisitions_in_period::ViewMigration),
        Box::new(vaccination_card::ViewMigration),
    ]
}

// Will be removed in the final PR for this issue, when all the drop view statements have been moved to different files.
pub(crate) fn legacy_drop_views(connection: &StorageConnection) -> anyhow::Result<()> {
    log::info!("Dropping database views...");
    sql!(
        connection,
        // Drop order is important here, as some views depend on others. Please
        // check when adding new views.
        r#"
      DROP VIEW IF EXISTS stock_line_ledger_discrepancy;
      DROP VIEW IF EXISTS purchase_order_stats;
      DROP VIEW IF EXISTS invoice_stats;
      
      
      
      
      
      

      
      
      
     
      
      
      DROP VIEW IF EXISTS contact_trace_name_link_view;
      DROP VIEW IF EXISTS vaccination_course;
    "#
    )?;

    Ok(())
}

// Will be removed in the final PR for this issue, when all the create view statements have been moved to different.
pub(crate) fn legacy_rebuild_views(connection: &StorageConnection) -> anyhow::Result<()> {
    log::info!("Re-creating database views...");

    sql!(
        connection,
        r#"







  
  
  

  

CREATE VIEW vaccination_course AS
    SELECT
      vc.id,
      vc.name AS vaccine_course_name,
      coverage_rate,
      wastage_rate,
      vcd.id AS vaccine_course_dose_id,
      label AS dose_label,
      min_interval_days,
      min_age,
      max_age,
      custom_age_label,
      vci.id AS vaccine_course_item_id,
      item.id AS item_id,
      il.id AS item_link_id,
      item.name AS item_name,
      item.code AS item_code,
      item.type AS item_type,
      item.default_pack_size,
      item.is_vaccine AS is_vaccine_item,
      item.vaccine_doses,
      item.unit_id AS unit_id,
      unit.name AS unit,
      unit."index" AS unit_index,
      d.id AS demographic_id,
      d.name AS demographic_name,
      d.population_percentage AS population_percentage,
      p.id AS program_id,
      p.name AS program_name
    FROM
      vaccine_course vc
      JOIN vaccine_course_dose vcd ON vc.id = vcd.vaccine_course_id
      JOIN vaccine_course_item vci ON vci.vaccine_course_id = vc.id
      JOIN item_link il ON vci.item_link_id = il.id
      JOIN item ON item.id = il.item_id
      LEFT JOIN unit ON item.unit_id = unit.id
      LEFT JOIN demographic d ON d.id = vc.demographic_id
      JOIN PROGRAM p ON p.id = vc.program_id
    WHERE
      vc.deleted_datetime IS NULL
      AND vcd.deleted_datetime IS NULL
      AND vci.deleted_datetime IS NULL;

    CREATE VIEW purchase_order_stats AS
        SELECT
            po.id AS purchase_order_id,
            COALESCE(SUM(
                CASE
                    WHEN pol.adjusted_number_of_units IS NOT NULL
                    THEN pol.adjusted_number_of_units * pol.price_per_unit_before_discount
                    ELSE pol.requested_number_of_units * pol.price_per_unit_before_discount
                END
            ), 0) AS line_total_before_discount,
            COALESCE(SUM(
                CASE
                    WHEN pol.adjusted_number_of_units IS NOT NULL
                    THEN pol.adjusted_number_of_units * pol.price_per_unit_after_discount
                    ELSE pol.requested_number_of_units * pol.price_per_unit_after_discount
                END

            ), 0) AS line_total_after_discount,
            COALESCE(SUM(
                CASE
                    WHEN pol.adjusted_number_of_units IS NOT NULL
                    THEN pol.adjusted_number_of_units * pol.price_per_unit_after_discount
                    ELSE pol.requested_number_of_units * pol.price_per_unit_after_discount
                END
            ), 0) * (1-(COALESCE(po.supplier_discount_percentage, 0)/100)) AS order_total_after_discount
        FROM
            purchase_order po JOIN purchase_order_line pol on po.id = pol.purchase_order_id
        GROUP BY
            po.id;
    "#,
    )?;

    if cfg!(not(feature = "postgres")) {
        sql!(
            connection,
            r#"
       CREATE VIEW invoice_stats AS
        SELECT
	        invoice_line.invoice_id,
            SUM(invoice_line.total_before_tax) AS total_before_tax,
	        SUM(invoice_line.total_after_tax) AS total_after_tax,
            (SUM(invoice_line.total_after_tax) / SUM(invoice_line.total_before_tax) - 1) * 100 AS tax_percentage,
            SUM(invoice_line.foreign_currency_price_before_tax) + (SUM(invoice_line.foreign_currency_price_before_tax) * COALESCE(invoice_line.tax_percentage, 0) / 100) AS foreign_currency_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
	        COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_before_tax,
	         COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_after_tax
        FROM
	        invoice_line
        GROUP BY
	        invoice_line.invoice_id;

    CREATE VIEW contact_trace_name_link_view AS
      SELECT
        ct.id AS id,
        ct.program_id AS program_id,
        ct.document_id AS document_id,
        ct.datetime AS datetime,
        ct.contact_trace_id AS contact_trace_id,
        patient_name_link.name_id AS patient_id,
        contact_patient_name_link.name_id AS contact_patient_id,
        ct.first_name AS first_name,
        ct.last_name AS last_name,
        ct.gender AS gender,
        ct.date_of_birth AS date_of_birth,
        ct.store_id AS store_id,
        ct.relationship AS relationship
      FROM contact_trace ct
      INNER JOIN name_link as patient_name_link
        ON ct.patient_link_id = patient_name_link.id
      LEFT JOIN name_link as contact_patient_name_link
        ON ct.contact_patient_link_id = contact_patient_name_link.id;
      "#
        )?;
    }

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
              CREATE VIEW invoice_stats AS
        SELECT
	        invoice_line.invoice_id,
            SUM(invoice_line.total_before_tax) AS total_before_tax,
	        SUM(invoice_line.total_after_tax) AS total_after_tax,
            COALESCE((SUM(invoice_line.total_after_tax) / NULLIF(SUM(invoice_line.total_before_tax), 0) - 1), 0) * 100 AS tax_percentage,
            COALESCE(SUM(invoice_line.foreign_currency_price_before_tax), 0) + (COALESCE(SUM(invoice_line.foreign_currency_price_before_tax), 0) * (COALESCE((SUM(invoice_line.total_after_tax) / NULLIF(SUM(invoice_line.total_before_tax), 0) - 1), 0))) AS foreign_currency_total_after_tax,
            COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
	        COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_before_tax,
	         COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_after_tax
        FROM
	        invoice_line
        GROUP BY
	        invoice_line.invoice_id;

    CREATE VIEW contact_trace_name_link_view AS
      SELECT
        ct.id AS id,
        ct.program_id AS program_id,
        ct.document_id AS document_id,
        ct.datetime AS datetime,
        ct.contact_trace_id AS contact_trace_id,
        patient_name_link.name_id AS patient_id,
        contact_patient_name_link.name_id AS contact_patient_id,
        ct.first_name AS first_name,
        ct.last_name AS last_name,
        ct.gender AS gender,
        CAST(ct.date_of_birth AS DATE) AS date_of_birth,
        ct.store_id AS store_id,
        ct.relationship AS relationship
      FROM contact_trace ct
      INNER JOIN name_link as patient_name_link
        ON ct.patient_link_id = patient_name_link.id
      LEFT JOIN name_link as contact_patient_name_link
        ON ct.contact_patient_link_id = contact_patient_name_link.id;
        "#
        )?;
    }

    Ok(())
}

pub(crate) fn drop_views(connection: &StorageConnection) -> anyhow::Result<()> {
    // Drop views in reverse order of creation
    log::info!("Dropping database views...");
    for view in all_views().iter().rev() {
        view.drop_view(connection)?;
    }
    legacy_drop_views(connection)?;
    Ok(())
}

pub(crate) fn rebuild_views(connection: &StorageConnection) -> anyhow::Result<()> {
    log::info!("Re-creating database views...");
    for view in all_views().iter() {
        view.rebuild_view(connection)?;
    }
    legacy_rebuild_views(connection)?;
    Ok(())
}

#[cfg(test)]
mod test {
    use crate::test_db::{setup_test, SetupOption, SetupResult};

    use super::{drop_views, rebuild_views};

    #[actix_rt::test]
    async fn drop_and_rebuild_views() {
        // Setup will run initial migrations, which will create the views
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "drop_and_rebuild_views",
            ..Default::default()
        })
        .await;

        // Ensure views can be dropped and recreated without error
        drop_views(&connection).unwrap();

        // Rebuild should be fine, this already happens in our setup_test, but just to be sure :)
        rebuild_views(&connection).unwrap();

        // Note: what this test does not capture is whether previous views can be dropped
        // successfully (as we only have current state of the views)
        // This is handled in CI, the validate-db-migration-with-views workflow
    }
}
