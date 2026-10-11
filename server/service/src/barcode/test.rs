use chrono::Utc;
use repository::{
    mock::{
        mock_customer_return_a, mock_item_a, mock_item_a_variant_1, mock_item_b,
        mock_item_b_variant_1, mock_name_c, mock_store_a, mock_store_b, mock_user_account_a,
        MockData, MockDataInserts,
    },
    test_db::setup_all_with_data,
    BarcodeProposalRow, BarcodeProposalRowRepository, StockLineRow, StoreRow,
};

use super::*;
use crate::{
    invoice_line::stock_in_line::{insert_stock_in_line, InsertStockInLine},
    item::packaging_variant::{UpsertPackagingVariant, UpsertPackagingVariantError},
    service_provider::ServiceProvider,
    sync::test_util_set_is_central_server,
    NullableUpdate,
};

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

/// Confirms `value` for the item on its auto-created variant, as central would
fn confirmed(connection: &StorageConnection, value: &str, item_id: &str) -> ConfirmedBarcode {
    confirm(
        connection,
        &mock_user_account_a().id,
        Confirm {
            value: value.to_string(),
            item_id: item_id.to_string(),
            pack_size: None,
            manufacturer_id: None,
        },
        BarcodeTarget::AutoCreated,
    )
    .unwrap()
}

/// A real packaging variant of item_a, with no barcode
fn real_packaging_variant(connection: &StorageConnection) -> PackagingVariantRow {
    let row = PackagingVariantRow {
        id: "real_packaging".to_string(),
        name: "Box".to_string(),
        item_variant_id: mock_item_a_variant_1().id,
        packaging_level: 2,
        pack_size: Some(100.0),
        ..Default::default()
    };
    PackagingVariantRowRepository::new(connection)
        .upsert_one(&row)
        .unwrap();
    row
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
    assert_eq!(proposed.item_variant_id, None);

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

    // Once confirmed for the item, the confirmed barcode is the one match, with
    // its variants, and proposing it does nothing
    let barcode = confirmed(&connection, VALUE, &mock_item_a().id);
    let matches = service.barcode_matches(&ctx, SCANNED).unwrap();
    assert_eq!(matches.len(), 1);
    assert_eq!(matches[0].status, BarcodeStatus::Confirmed);
    assert_eq!(matches[0].id, barcode.packaging_variant.id);
    assert_eq!(
        matches[0].packaging_variant_id,
        Some(barcode.packaging_variant.id.clone())
    );
    assert_eq!(
        matches[0].item_variant_id,
        Some(barcode.item_variant.id.clone())
    );

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
    let barcode = confirmed(&connection, VALUE, &mock_item_a().id);

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

    test_util_set_is_central_server(true);
    service
        .delete_barcode(&ctx, &barcode.packaging_variant.id)
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

/// A store withdraws a proposal made on its site: it stops matching, and
/// proposing again makes a new one. Another site's proposal can't be withdrawn.
#[actix_rt::test]
async fn withdraw_a_proposal() {
    let (connection, service_provider) = setup(
        "barcode_withdraw_a_proposal",
        MockData {
            barcode_proposals: vec![
                proposal("on_site", &store_a2().id, &mock_item_a().id, None),
                proposal("other_site", &mock_store_b().id, &mock_item_a().id, None),
            ],
            ..Default::default()
        },
    )
    .await;
    let service = &service_provider.barcode_service;
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let repo = BarcodeProposalRowRepository::new(&connection);

    assert_eq!(
        service.delete_barcode_proposal(&ctx, "other_site"),
        Err(DeleteBarcodeProposalError::ProposalDoesNotExist)
    );
    assert!(repo.find_one_by_id("other_site").unwrap().is_some());
    assert_eq!(
        service.delete_barcode_proposal(&ctx, "not_a_proposal"),
        Err(DeleteBarcodeProposalError::ProposalDoesNotExist)
    );

    // Made by another store on this site
    assert_eq!(
        service.delete_barcode_proposal(&ctx, "on_site"),
        Ok("on_site".to_string())
    );
    assert_eq!(repo.find_one_by_id("on_site").unwrap(), None);
    assert_eq!(service.barcode_matches(&ctx, SCANNED).unwrap(), vec![]);

    let again = service
        .propose_barcode(
            &ctx,
            ProposeBarcodeInput {
                barcode: SCANNED.to_string(),
                item_id: mock_item_a().id,
                pack_size: None,
                manufacturer_id: None,
            },
        )
        .unwrap();
    assert_ne!(again.id, "on_site");
}

/// Central confirms a proposal onto the item's auto-created variant for the
/// manufacturer, created the first time and hidden from variant lists. Barcodes
/// with the same manufacturer share it.
#[actix_rt::test]
async fn central_confirms_onto_auto_created_variants() {
    let (_, service_provider) = setup(
        "barcode_central_confirms_onto_auto_created",
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
    let insert = |barcode: &str, manufacturer_id: Option<String>| {
        service.insert_barcode(
            &ctx,
            InsertBarcodeInput {
                barcode: barcode.to_string(),
                item_id: mock_item_a().id,
                pack_size: None,
                manufacturer_id,
                target: BarcodeTarget::AutoCreated,
            },
        )
    };

    test_util_set_is_central_server(false);
    assert_eq!(
        service
            .confirm_barcode_proposal(&ctx, "proposal_a", BarcodeTarget::AutoCreated)
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
        .confirm_barcode_proposal(&ctx, "proposal_a", BarcodeTarget::AutoCreated)
        .unwrap();
    assert_eq!(barcode.value(), VALUE);
    assert_eq!(barcode.packaging_variant.pack_size, Some(12.0));
    assert_eq!(barcode.packaging_variant.packaging_level, 1);
    assert_eq!(barcode.packaging_variant.name, SCANNED);
    assert!(barcode.item_variant.is_auto_created);
    assert_eq!(barcode.item_variant.name, "Barcodes");
    assert_eq!(barcode.item_variant.item_id, mock_item_a().id);
    assert_eq!(
        service
            .item_barcode_proposals(&ctx, &mock_item_a().id)
            .unwrap(),
        vec![]
    );
    let listed = service_provider
        .item_service
        .get_item_variants(&ctx, None, None, None)
        .unwrap()
        .rows;
    assert!(listed
        .iter()
        .all(|variant| variant.item_variant_row.id != barcode.item_variant.id));

    // Confirming it again gives the same barcode
    assert_eq!(insert(SCANNED, None).unwrap(), barcode);

    // Another barcode, same manufacturer (none): same auto-created variant
    let plain = insert("ABC-1", None).unwrap();
    assert_eq!(plain.item_variant.id, barcode.item_variant.id);
    assert_ne!(plain.packaging_variant.id, barcode.packaging_variant.id);

    // Another manufacturer: its own auto-created variant, named for it
    let manufactured = insert("ABC-2", Some(mock_name_c().id)).unwrap();
    assert_ne!(manufactured.item_variant.id, barcode.item_variant.id);
    assert_eq!(
        manufactured.item_variant.name,
        format!("Barcodes: {}", mock_name_c().name)
    );
    assert_eq!(
        manufactured.item_variant.manufacturer_id,
        Some(mock_name_c().id)
    );

    assert_eq!(
        service
            .item_barcodes(&ctx, &mock_item_a().id)
            .unwrap()
            .len(),
        3
    );
}

/// Central can confirm a barcode onto a real packaging variant, or as a new
/// packaging level of a real item variant, of the same item
#[actix_rt::test]
async fn central_confirms_onto_real_variants() {
    let (connection, service_provider) =
        setup("barcode_central_confirms_onto_real", MockData::default()).await;
    let service = &service_provider.barcode_service;
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    test_util_set_is_central_server(true);
    let packaging = real_packaging_variant(&connection);
    let insert = |barcode: &str, item_id: String, target: BarcodeTarget| {
        service.insert_barcode(
            &ctx,
            InsertBarcodeInput {
                barcode: barcode.to_string(),
                item_id,
                pack_size: Some(1.0),
                manufacturer_id: None,
                target,
            },
        )
    };

    let on_packaging = insert(
        SCANNED,
        mock_item_a().id,
        BarcodeTarget::PackagingVariant(packaging.id.clone()),
    )
    .unwrap();
    assert_eq!(on_packaging.packaging_variant.id, packaging.id);
    // The packaging variant's own pack size stays
    assert_eq!(on_packaging.packaging_variant.pack_size, Some(100.0));
    assert!(!on_packaging.item_variant.is_auto_created);

    assert_eq!(
        insert(
            "ABC-1",
            mock_item_a().id,
            BarcodeTarget::PackagingVariant(packaging.id.clone())
        ),
        Err(ManageBarcodeError::PackagingVariantHasBarcode)
    );
    // The item has the barcode already, on another packaging variant
    assert_eq!(
        insert(
            SCANNED,
            mock_item_a().id,
            BarcodeTarget::ItemVariant(mock_item_a_variant_1().id)
        )
        .map(|_| ()),
        Ok(())
    );
    assert_eq!(
        insert(
            SCANNED,
            mock_item_a().id,
            BarcodeTarget::PackagingVariant("other".to_string())
        ),
        Err(ManageBarcodeError::BarcodeAlreadyExistsForItem)
    );

    let new_level = insert(
        "ABC-1",
        mock_item_a().id,
        BarcodeTarget::ItemVariant(mock_item_a_variant_1().id),
    )
    .unwrap();
    assert_eq!(new_level.item_variant.id, mock_item_a_variant_1().id);
    assert_ne!(new_level.packaging_variant.id, packaging.id);
    assert_eq!(new_level.packaging_variant.pack_size, Some(1.0));

    // Variants of another item are refused
    assert_eq!(
        insert(
            "ABC-2",
            mock_item_b().id,
            BarcodeTarget::PackagingVariant(packaging.id.clone())
        ),
        Err(ManageBarcodeError::PackagingVariantDoesNotExist)
    );
    assert_eq!(
        insert(
            "ABC-2",
            mock_item_a().id,
            BarcodeTarget::ItemVariant(mock_item_b_variant_1().id)
        ),
        Err(ManageBarcodeError::ItemVariantDoesNotExist)
    );
}

/// Removing a barcode clears it from its packaging variant. An auto-created
/// variant goes once it has no barcode left; a real one stays.
#[actix_rt::test]
async fn central_removes_barcodes() {
    let (connection, service_provider) =
        setup("barcode_central_removes", MockData::default()).await;
    let service = &service_provider.barcode_service;
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let item_variants = ItemVariantRowRepository::new(&connection);

    let first = confirmed(&connection, VALUE, &mock_item_a().id);
    let second = confirmed(&connection, "plain:ABC-1", &mock_item_a().id);
    assert_eq!(first.item_variant.id, second.item_variant.id);

    test_util_set_is_central_server(false);
    assert_eq!(
        service.delete_barcode(&ctx, &first.packaging_variant.id),
        Err(ManageBarcodeError::NotCentralServer)
    );

    test_util_set_is_central_server(true);
    service
        .delete_barcode(&ctx, &first.packaging_variant.id)
        .unwrap();
    assert_eq!(
        PackagingVariantRowRepository::new(&connection)
            .find_one_by_id(&first.packaging_variant.id)
            .unwrap()
            .unwrap()
            .barcode,
        None
    );
    assert_eq!(
        service.delete_barcode(&ctx, &first.packaging_variant.id),
        Err(ManageBarcodeError::PackagingVariantDoesNotExist)
    );
    let auto = |id: &str| item_variants.find_one_by_id(id).unwrap().unwrap();
    assert_eq!(auto(&first.item_variant.id).deleted_datetime, None);

    service
        .delete_barcode(&ctx, &second.packaging_variant.id)
        .unwrap();
    assert!(auto(&first.item_variant.id).deleted_datetime.is_some());

    // A real variant stays when its barcode goes
    let packaging = real_packaging_variant(&connection);
    service
        .insert_barcode(
            &ctx,
            InsertBarcodeInput {
                barcode: SCANNED.to_string(),
                item_id: mock_item_a().id,
                pack_size: None,
                manufacturer_id: None,
                target: BarcodeTarget::PackagingVariant(packaging.id.clone()),
            },
        )
        .unwrap();
    service.delete_barcode(&ctx, &packaging.id).unwrap();
    assert_eq!(auto(&mock_item_a_variant_1().id).deleted_datetime, None);
}

/// Two sites agreeing confirm a barcode onto the item's auto-created variant,
/// unless a packaging variant already has the barcode. Pack size is used only
/// when they agree.
#[actix_rt::test]
async fn auto_confirm_rules() {
    let (connection, _) = setup("barcode_auto_confirm_rules", MockData::default()).await;
    let proposals = BarcodeProposalRowRepository::new(&connection);
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
    assert_eq!(barcode.packaging_variant.pack_size, None);
    assert!(barcode.item_variant.is_auto_created);

    // Already confirmed: nothing more to do
    assert_eq!(auto_confirm(&connection, VALUE, &item_a).unwrap(), None);

    // Confirmed for another item: a second item needs review
    let item_b = mock_item_b().id;
    proposals
        .upsert_one(&proposal("p3", &mock_store_a().id, &item_b, Some(5.0)))
        .unwrap();
    proposals
        .upsert_one(&proposal("p4", &mock_store_b().id, &item_b, Some(5.0)))
        .unwrap();
    assert_eq!(auto_confirm(&connection, VALUE, &item_b).unwrap(), None);

    // Once that's removed, the agreeing pack size is used
    PackagingVariantRowRepository::new(&connection)
        .upsert_one(&PackagingVariantRow {
            barcode: None,
            ..barcode.packaging_variant
        })
        .unwrap();
    let barcode = auto_confirm(&connection, VALUE, &item_b).unwrap().unwrap();
    assert_eq!(barcode.packaging_variant.pack_size, Some(5.0));
}

/// Editing a packaging variant on central can set its barcode, in standard form.
/// Leaving the barcode out keeps it; another packaging variant of the item can't
/// have it too.
#[actix_rt::test]
async fn packaging_variant_upsert_sets_barcode() {
    let (connection, service_provider) =
        setup("barcode_packaging_variant_upsert", MockData::default()).await;
    let ctx = service_provider
        .context(mock_store_a().id, mock_user_account_a().id)
        .unwrap();
    let packaging = real_packaging_variant(&connection);
    let upsert = |id: &str, barcode: Option<NullableUpdate<String>>| {
        service_provider.item_service.upsert_packaging_variant(
            &ctx,
            UpsertPackagingVariant {
                id: id.to_string(),
                item_variant_id: packaging.item_variant_id.clone(),
                name: packaging.name.clone(),
                packaging_level: packaging.packaging_level,
                pack_size: packaging.pack_size,
                volume_per_unit: None,
                barcode,
            },
        )
    };
    let set = |barcode: &str| {
        Some(NullableUpdate {
            value: Some(barcode.to_string()),
        })
    };

    let saved = upsert(&packaging.id, set(SCANNED)).unwrap();
    assert_eq!(saved.barcode.as_deref(), Some(VALUE));

    let saved = upsert(&packaging.id, None).unwrap();
    assert_eq!(saved.barcode.as_deref(), Some(VALUE));

    assert_eq!(
        upsert("other_packaging", set(SCANNED)),
        Err(UpsertPackagingVariantError::BarcodeAlreadyExistsForItem)
    );
    assert_eq!(
        upsert(&packaging.id, set("  ")),
        Err(UpsertPackagingVariantError::InvalidBarcode)
    );

    let saved = upsert(&packaging.id, Some(NullableUpdate { value: None })).unwrap();
    assert_eq!(saved.barcode, None);
}

/// Receiving stock with a barcode confirmed for the item puts its item variant
/// on the line and the stock. One that isn't confirmed leaves them without one.
#[actix_rt::test]
async fn stock_in_takes_the_scanned_item_variant() {
    let (connection, service_provider) =
        setup("barcode_stock_in_item_variant", MockData::default()).await;
    let ctx = service_provider
        .context(mock_store_b().id, mock_user_account_a().id)
        .unwrap();
    let barcode = confirmed(&connection, VALUE, &mock_item_a().id);

    let receive = |id: &str, scanned: &str| {
        insert_stock_in_line(
            &ctx,
            InsertStockInLine {
                id: id.to_string(),
                invoice_id: mock_customer_return_a().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                barcode: Some(scanned.to_string()),
                ..Default::default()
            },
            None,
        )
        .unwrap()
    };

    let line = receive("scanned_confirmed", SCANNED);
    assert_eq!(
        line.invoice_line_row.item_variant_id,
        Some(barcode.item_variant.id.clone())
    );
    assert_eq!(
        line.stock_line_option.unwrap().item_variant_id,
        Some(barcode.item_variant.id)
    );

    let line = receive("scanned_unconfirmed", "ABC-1");
    assert_eq!(line.invoice_line_row.item_variant_id, None);
    assert_eq!(
        line.invoice_line_row.barcode.as_deref(),
        Some("plain:ABC-1")
    );
}
