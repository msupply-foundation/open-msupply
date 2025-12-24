use crate::StorageConnection;

mod adjustments;
mod changelog_deduped;
mod consumption;
mod contact_trace_name_link_view;
mod inbound_shipment_stock_movement;
mod inventory_adjustment_stock_movement;
mod invoice_line_stock_movement;
mod invoice_stats;
mod item_ledger;
mod latest_asset_log;
mod latest_document;
mod link_views;
mod outbound_shipment_stock_movement;
mod purchase_order_stats;
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
mod vaccination_course;

pub(crate) trait ViewMigrationFragment {
    fn drop_view(&self, _connection: &StorageConnection) -> anyhow::Result<()>;
    fn rebuild_view(&self, _connection: &StorageConnection) -> anyhow::Result<()>;
}

// List of all view migrations, they need be in the order required for creation.
// Dropped will be in the reverse order.
// Check before adding a new view.
fn all_views() -> Vec<Box<dyn ViewMigrationFragment>> {
    vec![
        Box::new(invoice_line_stock_movement::ViewMigration),
        Box::new(outbound_shipment_stock_movement::ViewMigration),
        Box::new(inbound_shipment_stock_movement::ViewMigration),
        Box::new(inventory_adjustment_stock_movement::ViewMigration),
        Box::new(stock_movement::ViewMigration),
        Box::new(stock_line_ledger::ViewMigration),
        Box::new(stock_line_ledger_discrepancy::ViewMigration),
        Box::new(item_ledger::ViewMigration),
        Box::new(replenishment::ViewMigration),
        Box::new(adjustments::ViewMigration),
        Box::new(consumption::ViewMigration),
        Box::new(store_items::ViewMigration),
        Box::new(stock_on_hand::ViewMigration),
        Box::new(changelog_deduped::ViewMigration),
        Box::new(latest_document::ViewMigration),
        Box::new(latest_asset_log::ViewMigration),
        Box::new(report_document::ViewMigration),
        Box::new(report_encounter::ViewMigration),
        Box::new(report_store::ViewMigration),
        Box::new(report_patient::ViewMigration),
        Box::new(report_program_event::ViewMigration),
        Box::new(report_program_enrolment::ViewMigration),
        Box::new(requisitions_in_period::ViewMigration),
        Box::new(vaccination_card::ViewMigration),
        Box::new(vaccination_course::ViewMigration),
        Box::new(purchase_order_stats::ViewMigration),
        Box::new(invoice_stats::ViewMigration),
        Box::new(contact_trace_name_link_view::ViewMigration),
        Box::new(link_views::ViewMigration),
    ]
}

pub(crate) fn drop_views(connection: &StorageConnection) -> anyhow::Result<()> {
    // Drop views in reverse order of creation
    log::info!("Dropping database views...");
    for view in all_views().iter().rev() {
        view.drop_view(connection)?;
    }
    Ok(())
}

pub(crate) fn rebuild_views(connection: &StorageConnection) -> anyhow::Result<()> {
    log::info!("Re-creating database views...");
    for view in all_views().iter() {
        view.rebuild_view(connection)?;
    }
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
