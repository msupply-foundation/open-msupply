use chrono::Utc;
use repository::{
    barcode::{BarcodeFilter, BarcodeRepository},
    mock::{
        mock_item_a, mock_store_a, mock_store_b, mock_user_account_a, MockData, MockDataInserts,
    },
    BarcodeProposalRow, BarcodeProposalRowRepository, EqualFilter,
};

use crate::{
    processors::ProcessorType,
    sync::test_util_set_is_central_server,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

const VALUE: &str = "gtin:09506682101352";

fn proposal(id: &str, store_id: &str) -> BarcodeProposalRow {
    BarcodeProposalRow {
        id: id.to_string(),
        value: VALUE.to_string(),
        item_id: mock_item_a().id,
        pack_size: Some(10.0),
        store_id: store_id.to_string(),
        user_id: mock_user_account_a().id,
        created_datetime: Utc::now().naive_utc(),
        updated_datetime: Utc::now().naive_utc(),
        ..Default::default()
    }
}

/// On central, a second site proposing a barcode for the same item confirms it
#[tokio::test]
async fn confirms_when_a_second_store_proposes() {
    test_util_set_is_central_server(true);
    let ServiceTestContext {
        service_provider, ..
    } = setup_all_with_data_and_service_provider(
        "barcode_auto_confirm_processor",
        MockDataInserts::all(),
        MockData::default(),
    )
    .await;
    let ctx = service_provider.basic_context().unwrap();
    let proposals = BarcodeProposalRowRepository::new(&ctx.connection);
    let confirmed = || {
        BarcodeRepository::new(&ctx.connection)
            .query_by_filter(BarcodeFilter::new().value(EqualFilter::equal_to(VALUE.to_string())))
            .unwrap()
    };
    let process = || async {
        ctx.processors_trigger
            .general_processor
            .try_send(ProcessorType::BarcodeAutoConfirm)
            .unwrap();
        ctx.processors_trigger.await_events_processed().await;
    };

    proposals
        .upsert_one(&proposal("first", &mock_store_a().id))
        .unwrap();
    process().await;
    assert_eq!(confirmed(), vec![]);

    proposals
        .upsert_one(&proposal("second", &mock_store_b().id))
        .unwrap();
    process().await;
    let barcodes = confirmed();
    assert_eq!(barcodes.len(), 1);
    assert_eq!(barcodes[0].barcode_row.item_id, mock_item_a().id);
    assert_eq!(barcodes[0].barcode_row.pack_size, Some(10.0));
}
