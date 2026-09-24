//! Regression tests for the plugin processor's changelog walk.
//!
//! Plugin processors read the changelog through the compatibility query. The processor
//! loop stores the cursor of the last row processed and passes it straight back in, so
//! that query must be exclusive of the stored cursor. When it was inclusive, a plugin
//! processor re-processed the newest matching row forever and, because all processors
//! share one task, starved the requisition and shipment transfer processors behind it.
//!
//! The plugin used here is `test_plugin/plugin.js`, which is also shipped ready to
//! install as `test_plugin/bundle.json` so a reviewer can watch the same behaviour in a
//! running server (see `test_plugin/README.md`).

use std::{sync::Arc, time::Duration};

use base64::{prelude::BASE64_STANDARD, Engine};
use repository::{
    mock::{MockData, MockDataInserts},
    BackendPluginRow, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, PluginType,
    PluginTypes, PluginVariantType, RowActionType, StorageConnection,
};
use tokio::time::timeout;

use crate::{
    backend_plugin::plugin_provider::{PluginBundle, PluginInstance},
    cursor_controller::{CursorController, CursorType},
    processors::{general_processor::process_records, ProcessorType},
    service_provider::ServiceProvider,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

const PLUGIN_CODE: &str = "processor_cursor_probe";
const PLUGIN_SOURCE: &str = include_str!("test_plugin/plugin.js");
const PLUGIN_BUNDLE_JSON: &str = include_str!("test_plugin/bundle.json");

/// How long we give one `process_records` run over a handful of rows. A correct loop
/// finishes in well under a second; the buggy loop never finishes.
const RUN_TIMEOUT: Duration = Duration::from_secs(60);

fn probe_plugin_row() -> BackendPluginRow {
    BackendPluginRow {
        id: format!("backend_{PLUGIN_CODE}_1_0_0"),
        code: PLUGIN_CODE.to_string(),
        // Major 1 is compatible with every server version (see `PluginInstance::bind`).
        version: "1.0.0".to_string(),
        bundle_base64: BASE64_STANDARD.encode(PLUGIN_SOURCE),
        types: PluginTypes(vec![PluginType::Processor]),
        variant_type: PluginVariantType::BoaJs,
    }
}

fn insert_changelog(
    connection: &StorageConnection,
    table_name: ChangelogTableName,
    record_id: &str,
) -> u64 {
    let repo = ChangelogRepository::new(connection);
    repo.insert(&ChangeLogInsertRow {
        table_name,
        record_id: record_id.to_string(),
        row_action: RowActionType::Upsert,
        store_id: None,
        source_site_id: None,
        transfer_store_id: None,
        patient_id: None,
    })
    .unwrap();
    repo.max_cursor().unwrap()
}

fn plugin_cursor(connection: &StorageConnection) -> u64 {
    CursorController::from_cursor_type(CursorType::Dynamic(PLUGIN_CODE.to_string()))
        .get(connection)
        .unwrap()
}

/// Runs the plugin processors once, failing the test if the run does not terminate.
async fn run_plugin_processors(service_provider: &Arc<ServiceProvider>) {
    timeout(
        RUN_TIMEOUT,
        process_records(service_provider, ProcessorType::Plugins),
    )
    .await
    .unwrap_or_else(|_| {
        panic!(
            "plugin processor run did not terminate within {:?}: \
             the processor loop is re-reading the last processed changelog row",
            RUN_TIMEOUT
        )
    })
    .unwrap();
}

#[actix_rt::test]
async fn plugin_processor_terminates_after_last_matching_row() {
    let ServiceTestContext {
        connection,
        service_provider,
        ..
    } = setup_all_with_data_and_service_provider(
        "plugin_processor_terminates_after_last_matching_row",
        MockDataInserts::none(),
        MockData::default(),
    )
    .await;

    PluginInstance::bind(probe_plugin_row());
    assert!(
        PluginInstance::get_one_with_code(PLUGIN_CODE, PluginType::Processor).is_some(),
        "probe plugin was not bound"
    );

    // Two rows the plugin's filter matches, with one it ignores in between.
    insert_changelog(&connection, ChangelogTableName::Invoice, "invoice_1");
    insert_changelog(&connection, ChangelogTableName::Location, "location_1");
    let invoice_2 = insert_changelog(&connection, ChangelogTableName::Invoice, "invoice_2");

    // First run: walks up to and including the newest invoice row, then stops.
    run_plugin_processors(&service_provider).await;
    assert_eq!(plugin_cursor(&connection), invoice_2);

    // Nothing new: must return straight away and leave the cursor alone.
    run_plugin_processors(&service_provider).await;
    assert_eq!(plugin_cursor(&connection), invoice_2);

    // A new matching row is picked up on the next run.
    let invoice_3 = insert_changelog(&connection, ChangelogTableName::Invoice, "invoice_3");
    run_plugin_processors(&service_provider).await;
    assert_eq!(plugin_cursor(&connection), invoice_3);

    // A new non-matching row is not walked, so the cursor stays on the last invoice.
    insert_changelog(&connection, ChangelogTableName::Location, "location_2");
    run_plugin_processors(&service_provider).await;
    assert_eq!(plugin_cursor(&connection), invoice_3);
}

/// `test_plugin/bundle.json` is the ready-to-install form of `test_plugin/plugin.js`
/// for reviewers; keep the two from drifting apart.
#[test]
fn bundle_json_matches_plugin_source() {
    let bundle: PluginBundle = serde_json::from_str(PLUGIN_BUNDLE_JSON).unwrap();
    assert!(bundle.frontend_plugins.is_empty());
    assert_eq!(bundle.backend_plugins.len(), 1);

    let row = &bundle.backend_plugins[0];
    assert_eq!(row.code, PLUGIN_CODE);
    assert_eq!(row.types, PluginTypes(vec![PluginType::Processor]));
    assert_eq!(row.variant_type, PluginVariantType::BoaJs);

    let shipped = BASE64_STANDARD.decode(&row.bundle_base64).unwrap();
    assert_eq!(
        String::from_utf8(shipped).unwrap(),
        PLUGIN_SOURCE,
        "test_plugin/bundle.json is out of date; regenerate it as described in test_plugin/README.md"
    );
}
