use chrono::Utc;
use repository::{
    mock::{
        mock_item_a, mock_item_b, mock_store_a, mock_store_b, mock_user_account_a, MockData,
        MockDataInserts,
    },
    test_db::setup_all_with_data,
    BarcodeProposalRow, BarcodeProposalRowRepository, BarcodeRow, BarcodeRowRepository,
    StockLineRow, StoreRow,
};

use super::*;
use crate::{service_provider::ServiceProvider, sync::test_util_set_is_central_server};

const SCANNED: &str = "9506682101352";
const VALUE: &str = "gtin:09506682101352";

/// A second store on store_a's site
fn store_a2() -> StoreRow {
    StoreRow {
        id: "store_a2".to_string(),
        name_id: "name_store_a".to_string(),
        site_id: mock_store_a().site_id,
        ..Default::default()
    }
}

fn proposal(id: &str, store_id: &str, item_id: &str, pack_size: Option<f64>) -> BarcodeProposalRow {
    BarcodeProposalRow {
        id: id.to_string(),
        value: VALUE.to_string(),
        item_id: item_id.to_string(),
        pack_size,
        store_id: store_id.to_string(),
        user_id: mock_user_account_a().id,
        created_datetime: Utc::now().naive_utc(),
        updated_datetime: Utc::now().naive_utc(),
        ..Default::default()
    }
}

fn confirmed(id: &str, item_id: &str) -> BarcodeRow {
    BarcodeRow {
        id: id.to_string(),
        value: VALUE.to_string(),
        item_id: item_id.to_string(),
        ..Default::default()
    }
}

async fn setup(name: &str, extra: MockData) -> (StorageConnection, ServiceProvider) {
    let (_, connection, connection_manager, _) = setup_all_with_data(
        name,
        MockDataInserts::all(),
        MockData {
            stores: vec![store_a2()],
            // item_a is visible in a store that holds stock of it
            stock_lines: vec![StockLineRow {
                id: "store_a2_stock".to_string(),
                item_id: mock_item_a().id,
                store_id: store_a2().id,
                pack_size: 1.0,
                available_number_of_packs: 1.0,
                total_number_of_packs: 1.0,
                ..Default::default()
            }],
            ..extra
        },
    )
    .await;
    (connection, ServiceProvider::new(connection_manager))
}

/// A proposal matches a scan in every store on the site that made it, and
/// proposing the same thing again updates that proposal.
#[actix_rt::test]
async fn propose_then_match_on_the_site() {
    let (connection, service_provider) =
        setup("barcode_propose_then_match", MockData::default()).await;
    let service = &service_provider.barcode_service;
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();

    assert_eq!(service.barcode_matches(&ctx, SCANNED).unwrap(), vec![]);

    let proposed = service
        .propose_barcode(
            &ctx,
            ProposeBarcodeInput {
                barcode: format!(" {SCANNED}\n"),
                item_id: mock_item_a().id,
                pack_size: Some(10.0),
                manufacturer_id: None,
            },
        )
        .unwrap();
    assert_eq!(proposed.status, BarcodeStatus::Proposed);
    assert_eq!(proposed.value, VALUE);

    // Proposing again (padded the GTIN-14 way) updates the same proposal
    let again = service
        .propose_barcode(
            &ctx,
            ProposeBarcodeInput {
                barcode: "09506682101352".to_string(),
                item_id: mock_item_a().id,
                pack_size: Some(20.0),
                manufacturer_id: None,
            },
        )
        .unwrap();
    assert_eq!(again.id, proposed.id);
    assert_eq!(again.pack_size, Some(20.0));

    // Matches in another store on the same site
    let ctx_a2 = service_provider
        .context(store_a2().id, mock_user_account_a().id)
        .unwrap();
    let matches = service.barcode_matches(&ctx_a2, SCANNED).unwrap();
    assert_eq!(matches.len(), 1);
    assert_eq!(matches[0].id, proposed.id);

    // ...but not on another site
    let ctx_b = service_provider
        .context(mock_store_b().id, mock_user_account_a().id)
        .unwrap();
    assert_eq!(service.barcode_matches(&ctx_b, SCANNED).unwrap(), vec![]);

    // Once confirmed for the item, the confirmed barcode is the one match, and
    // proposing it does nothing
    BarcodeRowRepository::new(&connection)
        .upsert_one(&confirmed("confirmed_a", &mock_item_a().id))
        .unwrap();
    let matches = service.barcode_matches(&ctx, SCANNED).unwrap();
    assert_eq!(matches.len(), 1);
    assert_eq!(matches[0].status, BarcodeStatus::Confirmed);
    assert_eq!(matches[0].id, "confirmed_a");

    let result = service
        .propose_barcode(
            &ctx_b,
            ProposeBarcodeInput {
                barcode: SCANNED.to_string(),
                item_id: mock_item_a().id,
                pack_size: None,
                manufacturer_id: None,
            },
        )
        .unwrap();
    assert_eq!(result.status, BarcodeStatus::Confirmed);
    assert_eq!(
        BarcodeProposalRowRepository::new(&connection)
            .find_one_by_store_value_and_item(&mock_store_b().id, VALUE, &mock_item_a().id)
            .unwrap(),
        None
    );
}

/// A barcode confirmed for one item and proposed on this site for another
/// matches both, confirmed first. A removed barcode doesn't match.
#[actix_rt::test]
async fn matches_confirmed_and_proposed_items() {
    let (connection, service_provider) = setup(
        "barcode_matches_confirmed_and_proposed",
        MockData {
            barcode_proposals: vec![proposal(
                "proposal_b",
                &mock_store_a().id,
                &mock_item_b().id,
                None,
            )],
            ..Default::default()
        },
    )
    .await;
    let service = &service_provider.barcode_service;
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let repo = BarcodeRowRepository::new(&connection);
    repo.upsert_one(&confirmed("confirmed_a", &mock_item_a().id))
        .unwrap();

    let matches = service.barcode_matches(&ctx, SCANNED).unwrap();
    let found: Vec<(BarcodeStatus, &str)> = matches
        .iter()
        .map(|m| (m.status, m.item_id.as_str()))
        .collect();
    assert_eq!(
        found,
        vec![
            (BarcodeStatus::Confirmed, "item_a"),
            (BarcodeStatus::Proposed, "item_b")
        ]
    );

    repo.upsert_one(&BarcodeRow {
        deleted_datetime: Some(Utc::now().naive_utc()),
        ..confirmed("confirmed_a", &mock_item_a().id)
    })
    .unwrap();
    let matches = service.barcode_matches(&ctx, SCANNED).unwrap();
    assert_eq!(matches.len(), 1);
    assert_eq!(matches[0].item_id, mock_item_b().id);
}

#[actix_rt::test]
async fn propose_errors() {
    let (_, service_provider) = setup("barcode_propose_errors", MockData::default()).await;
    let service = &service_provider.barcode_service;
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();

    let propose = |barcode: &str, item_id: &str| {
        service.propose_barcode(
            &ctx,
            ProposeBarcodeInput {
                barcode: barcode.to_string(),
                item_id: item_id.to_string(),
                pack_size: None,
                manufacturer_id: None,
            },
        )
    };
    assert_eq!(
        propose(" \t", &mock_item_a().id),
        Err(ProposeBarcodeError::InvalidBarcode)
    );
    assert_eq!(
        propose(SCANNED, "not_an_item"),
        Err(ProposeBarcodeError::InvalidItem)
    );
}

/// Only central confirms, moves and removes barcodes. Removing keeps the row;
/// adding the barcode again brings it back.
#[actix_rt::test]
async fn central_manages_confirmed_barcodes() {
    let (connection, service_provider) = setup(
        "barcode_central_manages",
        MockData {
            barcode_proposals: vec![proposal(
                "proposal_a",
                &mock_store_b().id,
                &mock_item_a().id,
                Some(12.0),
            )],
            ..Default::default()
        },
    )
    .await;
    let service = &service_provider.barcode_service;
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();

    test_util_set_is_central_server(false);
    assert_eq!(
        service
            .confirm_barcode_proposal(&ctx, "proposal_a")
            .map(|_| ()),
        Err(ManageBarcodeError::NotCentralServer)
    );

    test_util_set_is_central_server(true);
    assert_eq!(
        service
            .item_barcode_proposals(&ctx, &mock_item_a().id)
            .unwrap()
            .len(),
        1
    );

    // Confirm the proposal: it drops out of the item's proposals
    let barcode = service
        .confirm_barcode_proposal(&ctx, "proposal_a")
        .unwrap()
        .barcode_row;
    assert_eq!(barcode.value, VALUE);
    assert_eq!(barcode.pack_size, Some(12.0));
    assert_eq!(
        service
            .item_barcode_proposals(&ctx, &mock_item_a().id)
            .unwrap(),
        vec![]
    );

    // Move it to item_b, then remove it
    let moved = service
        .update_barcode(
            &ctx,
            UpdateBarcodeInput {
                id: barcode.id.clone(),
                item_id: Some(mock_item_b().id),
                pack_size: None,
            },
        )
        .unwrap()
        .barcode_row;
    assert_eq!(moved.item_id, mock_item_b().id);
    assert_eq!(
        service.item_barcodes(&ctx, &mock_item_a().id).unwrap(),
        vec![]
    );

    service.delete_barcode(&ctx, &barcode.id).unwrap();
    let removed = BarcodeRowRepository::new(&connection)
        .find_one_by_id(&barcode.id)
        .unwrap()
        .unwrap();
    assert!(removed.deleted_datetime.is_some());
    assert_eq!(
        service.item_barcodes(&ctx, &mock_item_b().id).unwrap(),
        vec![]
    );
    assert_eq!(
        service.delete_barcode(&ctx, &barcode.id),
        Err(ManageBarcodeError::BarcodeDoesNotExist)
    );

    // Adding it again brings the same row back
    let restored = service
        .insert_barcode(
            &ctx,
            InsertBarcodeInput {
                barcode: SCANNED.to_string(),
                item_id: mock_item_b().id,
                pack_size: None,
                manufacturer_id: None,
            },
        )
        .unwrap()
        .barcode_row;
    assert_eq!(restored.id, barcode.id);
    assert_eq!(restored.deleted_datetime, None);

    // Moving onto an item that already has the barcode is refused
    let other = service
        .insert_barcode(
            &ctx,
            InsertBarcodeInput {
                barcode: SCANNED.to_string(),
                item_id: mock_item_a().id,
                pack_size: None,
                manufacturer_id: None,
            },
        )
        .unwrap()
        .barcode_row;
    assert_eq!(
        service
            .update_barcode(
                &ctx,
                UpdateBarcodeInput {
                    id: other.id,
                    item_id: Some(mock_item_b().id),
                    pack_size: None,
                },
            )
            .map(|_| ()),
        Err(ManageBarcodeError::BarcodeAlreadyExistsForItem)
    );
}

/// Two sites agreeing confirm a barcode, unless central already confirmed the
/// barcode or removed it for the item. Pack size is copied only when they agree.
#[actix_rt::test]
async fn auto_confirm_rules() {
    let (connection, _) = setup("barcode_auto_confirm_rules", MockData::default()).await;
    let proposals = BarcodeProposalRowRepository::new(&connection);
    let barcodes = BarcodeRowRepository::new(&connection);
    let item_a = mock_item_a().id;

    // One store isn't enough
    proposals
        .upsert_one(&proposal("p1", &mock_store_a().id, &item_a, Some(10.0)))
        .unwrap();
    assert_eq!(auto_confirm(&connection, VALUE, &item_a).unwrap(), None);

    // Nor is a second store on the same site: it already shared the proposal
    proposals
        .upsert_one(&proposal("p1b", &store_a2().id, &item_a, Some(10.0)))
        .unwrap();
    assert_eq!(auto_confirm(&connection, VALUE, &item_a).unwrap(), None);

    // A store on another site, with a different pack size: confirmed without one
    proposals
        .upsert_one(&proposal("p2", &mock_store_b().id, &item_a, Some(20.0)))
        .unwrap();
    let barcode = auto_confirm(&connection, VALUE, &item_a).unwrap().unwrap();
    assert_eq!(barcode.pack_size, None);

    // Already confirmed: nothing more to do
    assert_eq!(auto_confirm(&connection, VALUE, &item_a).unwrap(), None);

    // Removed by central: stays removed
    barcodes
        .upsert_one(&BarcodeRow {
            deleted_datetime: Some(Utc::now().naive_utc()),
            ..barcode.clone()
        })
        .unwrap();
    assert_eq!(auto_confirm(&connection, VALUE, &item_a).unwrap(), None);

    // Confirmed for another item: a second item needs review
    let item_b = mock_item_b().id;
    barcodes.upsert_one(&confirmed("other", "item_c")).unwrap();
    proposals
        .upsert_one(&proposal("p3", &mock_store_a().id, &item_b, Some(5.0)))
        .unwrap();
    proposals
        .upsert_one(&proposal("p4", &mock_store_b().id, &item_b, Some(5.0)))
        .unwrap();
    assert_eq!(auto_confirm(&connection, VALUE, &item_b).unwrap(), None);

    // Once that's removed, the agreeing pack size is copied
    barcodes
        .upsert_one(&BarcodeRow {
            deleted_datetime: Some(Utc::now().naive_utc()),
            ..confirmed("other", "item_c")
        })
        .unwrap();
    let barcode = auto_confirm(&connection, VALUE, &item_b).unwrap().unwrap();
    assert_eq!(barcode.pack_size, Some(5.0));
}
