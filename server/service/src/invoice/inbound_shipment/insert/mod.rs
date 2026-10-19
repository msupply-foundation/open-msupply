use crate::WithDBError;
use crate::activity_log::activity_log_entry;
use crate::invoice::inbound_shipment::{InboundShipmentType, add_from_purchase_order};
use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;
use repository::{ActivityLogType, Invoice};
use repository::{InvoiceRowRepository, RepositoryError};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertInboundShipment {
    pub id: String,
    pub other_party_id: String,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
    pub requisition_id: Option<String>,
    pub purchase_order_id: Option<String>,
    pub insert_lines_from_purchase_order: bool,
}

type OutError = InsertInboundShipmentError;

pub fn insert_inbound_shipment(
    ctx: &ServiceContext,
    input: InsertInboundShipment,
    r#type: InboundShipmentType,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(connection, &ctx.store_id, &input, r#type)?;
            let new_invoice = generate(
                connection,
                &ctx.store_id,
                &ctx.user_id,
                input.clone(),
                other_party,
            )?;
            InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;

            if input.insert_lines_from_purchase_order {
                add_from_purchase_order(
                    connection,
                    &ctx.store_id,
                    new_invoice.id.clone(),
                    input.purchase_order_id,
                )?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceCreated,
                Some(new_invoice.id.clone()),
                None,
                None,
            )?;

            get_invoice(ctx, None, &new_invoice.id, None)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

#[derive(Debug, PartialEq)]
pub enum InsertInboundShipmentError {
    InvoiceAlreadyExists,
    WrongInboundShipmentType,
    PurchaseOrderDoesNotExist,
    AddLinesFromPurchaseOrderWithoutPurchaseOrder,
    // Name validation
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotASupplier,
    CannotLinkARequisitionToInboundShipment,
    RequisitionDoesNotExist,
    InternalOrderDoesNotBelongToStore,
    NotAnInternalOrder,
    // Internal error
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for InsertInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        InsertInboundShipmentError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertInboundShipmentError
where
    ERR: Into<InsertInboundShipmentError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow,
        InvoiceRowRepository, InvoiceStatus, InvoiceType, NameRow, NameStoreJoinRow,
        PurchaseOrderLineRow, PurchaseOrderLineRowRepository, PurchaseOrderLineStatus,
        PurchaseOrderRow, PurchaseOrderRowRepository,
        mock::{
            MockData, MockDataInserts, currency_a, currency_b, mock_donor_a,
            mock_inbound_shipment_c, mock_item_a, mock_item_service_item, mock_name_a,
            mock_name_linked_to_store_join, mock_name_not_linked_to_store, mock_store_a,
            mock_store_linked_to_name, mock_user_account_a,
        },
        test_db::setup_all_with_data,
    };

    use crate::{
        invoice::inbound_shipment::{InboundShipmentType, InsertInboundShipment},
        service_provider::ServiceProvider,
    };

    use super::InsertInboundShipmentError;

    type ServiceError = InsertInboundShipmentError;

    #[actix_rt::test]
    async fn insert_inbound_shipment_errors() {
        fn not_visible() -> NameRow {
            NameRow {
                id: "not_visible".to_string(),
                ..Default::default()
            }
        }

        fn not_a_supplier() -> NameRow {
            NameRow {
                id: "not_a_supplier".to_string(),
                ..Default::default()
            }
        }

        fn not_a_supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "not_a_supplier_join".to_string(),
                name_id: not_a_supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: false,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_inbound_shipment_errors",
            MockDataInserts::all(),
            MockData {
                names: vec![not_visible(), not_a_supplier()],
                name_store_joins: vec![not_a_supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceAlreadyExists
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: mock_inbound_shipment_c().id.clone(),
                    other_party_id: mock_name_a().id.clone(),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );
        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "new_id".to_string(),
                    other_party_id: "invalid".to_string(),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "new_id".to_string(),
                    other_party_id: not_visible().id,
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotASupplier
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "new_id".to_string(),
                    other_party_id: not_a_supplier().id,
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // NewlyCreatedInvoiceDoesNotExist
    }

    #[actix_rt::test]
    async fn insert_inbound_shipment_success() {
        fn supplier() -> NameRow {
            NameRow {
                id: "supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_inbound_shipment_success",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Success
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "new_id".to_string(),
                    other_party_id: supplier().id,
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_id")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_id: supplier().id,
                user_id: Some(mock_user_account_a().id),
                currency_id: Some(currency_a().id),
                ..invoice.clone()
            }
        );

        //Test success On Hold
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "test_on_hold".to_string(),
                    other_party_id: supplier().id,
                    on_hold: Some(true),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_on_hold")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_id: supplier().id,
                on_hold: true,
                ..invoice.clone()
            }
        );

        //Test success name_store_id linked to store
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "test_name_store_id_linked".to_string(),
                    other_party_id: mock_name_linked_to_store_join().name_id.clone(),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_name_store_id_linked")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_store_id: Some(mock_store_linked_to_name().id),
                ..invoice.clone()
            }
        );

        //Test success name_store_id, not linked to store
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "test_name_store_id_not_linked".to_string(),
                    other_party_id: mock_name_not_linked_to_store().id.clone(),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_name_store_id_not_linked")
            .unwrap()
            .unwrap();

        assert_eq!(invoice.name_store_id, None);
    }

    #[actix_rt::test]
    async fn insert_inbound_shipment_uses_po_currency() {
        fn supplier() -> NameRow {
            NameRow {
                id: "po_currency_supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "po_currency_supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        fn po_with_foreign_currency() -> PurchaseOrderRow {
            PurchaseOrderRow {
                id: "po_with_foreign_currency".to_string(),
                store_id: mock_store_a().id,
                supplier_name_id: supplier().id,
                currency_id: Some(currency_b().id), // EUR
                foreign_exchange_rate: 0.9,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_inbound_shipment_uses_po_currency",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                ..Default::default()
            },
        )
        .await;

        PurchaseOrderRowRepository::new(&connection)
            .upsert_one(&po_with_foreign_currency())
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // When linked to a PO with a foreign currency, the invoice should use the PO's currency
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "test_po_currency".to_string(),
                    other_party_id: supplier().id,
                    purchase_order_id: Some(po_with_foreign_currency().id),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_po_currency")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice.currency_id,
            Some(currency_b().id),
            "Invoice should use the PO's currency (EUR), not the home currency"
        );
        assert_eq!(
            invoice.currency_rate,
            currency_b().rate,
            "Invoice currency_rate should match the latest rate from the currency table"
        );

        // Without a PO, should still default to home currency
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "test_no_po_currency".to_string(),
                    other_party_id: supplier().id,
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_no_po_currency")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice.currency_id,
            Some(currency_a().id),
            "Invoice without PO should use home currency"
        );
        assert_eq!(
            invoice.currency_rate, 1.0,
            "Invoice without PO should have currency_rate 1.0"
        );
    }

    /// The order's donor becomes the shipment's default donor and is stamped on
    /// every line seeded from the order; an order without a donor sets neither.
    #[actix_rt::test]
    async fn insert_inbound_shipment_carries_po_donor() {
        fn supplier() -> NameRow {
            NameRow {
                id: "po_donor_supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "po_donor_supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        fn po(id: &str, donor_id: Option<String>) -> PurchaseOrderRow {
            PurchaseOrderRow {
                id: id.to_string(),
                store_id: mock_store_a().id,
                supplier_name_id: supplier().id,
                donor_id,
                foreign_exchange_rate: 1.0,
                ..Default::default()
            }
        }

        fn po_line(id: &str, purchase_order_id: &str) -> PurchaseOrderLineRow {
            PurchaseOrderLineRow {
                id: id.to_string(),
                purchase_order_id: purchase_order_id.to_string(),
                store_id: mock_store_a().id,
                line_number: 1,
                item_id: mock_item_a().id,
                requested_pack_size: 1.0,
                requested_number_of_units: 10.0,
                status: PurchaseOrderLineStatus::Sent,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_inbound_shipment_carries_po_donor",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let po_repo = PurchaseOrderRowRepository::new(&connection);
        let po_line_repo = PurchaseOrderLineRowRepository::new(&connection);
        po_repo
            .upsert_one(&po("po_with_donor", Some(mock_donor_a().id)))
            .unwrap();
        po_line_repo
            .upsert_one(&po_line("po_with_donor_line", "po_with_donor"))
            .unwrap();
        po_repo.upsert_one(&po("po_without_donor", None)).unwrap();
        po_line_repo
            .upsert_one(&po_line("po_without_donor_line", "po_without_donor"))
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;
        let invoice_repo = InvoiceRowRepository::new(&connection);
        let line_repo = InvoiceLineRowRepository::new(&connection);

        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "from_po_with_donor".to_string(),
                    other_party_id: supplier().id,
                    purchase_order_id: Some("po_with_donor".to_string()),
                    insert_lines_from_purchase_order: true,
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id("from_po_with_donor")
            .unwrap()
            .unwrap();
        assert_eq!(invoice.default_donor_id, Some(mock_donor_a().id));
        let lines = line_repo
            .find_many_by_invoice_id("from_po_with_donor")
            .unwrap();
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].donor_id, Some(mock_donor_a().id));

        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "from_po_without_donor".to_string(),
                    other_party_id: supplier().id,
                    purchase_order_id: Some("po_without_donor".to_string()),
                    insert_lines_from_purchase_order: true,
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let invoice = invoice_repo
            .find_one_by_id("from_po_without_donor")
            .unwrap()
            .unwrap();
        assert_eq!(invoice.default_donor_id, None);
        let lines = line_repo
            .find_many_by_invoice_id("from_po_without_donor")
            .unwrap();
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].donor_id, None);
    }

    /// Seeding lines from a purchase order takes each line's STORED total,
    /// pro-rated to the units still to ship, rather than multiplying price by
    /// packs again — and only the outstanding packs are added.
    #[actix_rt::test]
    async fn insert_inbound_shipment_pro_rates_stored_line_total() {
        fn supplier() -> NameRow {
            NameRow {
                id: "pro_rate_supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "pro_rate_supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        // Same rate on the order as in the currency table, so the assertions
        // hold whichever of the two the conversion uses.
        fn po() -> PurchaseOrderRow {
            PurchaseOrderRow {
                id: "pro_rate_po".to_string(),
                store_id: mock_store_a().id,
                supplier_name_id: supplier().id,
                currency_id: Some(currency_b().id),
                foreign_exchange_rate: currency_b().rate,
                ..Default::default()
            }
        }

        // 100 units at pack size 10, stored total 60.00 in the order's currency.
        fn po_line() -> PurchaseOrderLineRow {
            PurchaseOrderLineRow {
                id: "pro_rate_po_line".to_string(),
                purchase_order_id: po().id,
                store_id: mock_store_a().id,
                line_number: 1,
                item_id: mock_item_a().id,
                requested_pack_size: 10.0,
                requested_number_of_units: 100.0,
                price_per_pack_after_discount: 6.0,
                line_total: 60.0,
                status: PurchaseOrderLineStatus::Sent,
                ..Default::default()
            }
        }

        // An earlier shipment already carries 4 packs (40 units) of the line.
        fn shipped_invoice() -> InvoiceRow {
            InvoiceRow {
                id: "pro_rate_shipped".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::Shipped,
                purchase_order_id: Some(po().id),
                ..Default::default()
            }
        }

        fn shipped_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "pro_rate_shipped_line".to_string(),
                invoice_id: shipped_invoice().id,
                item_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                purchase_order_line_id: Some(po_line().id),
                number_of_packs: 4.0,
                pack_size: 10.0,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_inbound_shipment_pro_rates_stored_line_total",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                ..Default::default()
            },
        )
        .await;

        PurchaseOrderRowRepository::new(&connection)
            .upsert_one(&po())
            .unwrap();
        PurchaseOrderLineRowRepository::new(&connection)
            .upsert_one(&po_line())
            .unwrap();
        InvoiceRowRepository::new(&connection)
            .upsert_one(&shipped_invoice())
            .unwrap();
        InvoiceLineRowRepository::new(&connection)
            .upsert_one(&shipped_line())
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "pro_rate_new".to_string(),
                    other_party_id: supplier().id,
                    purchase_order_id: Some(po().id),
                    insert_lines_from_purchase_order: true,
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("pro_rate_new")
            .unwrap()
            .unwrap();
        let lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("pro_rate_new")
            .unwrap();
        assert_eq!(lines.len(), 1);
        let line = &lines[0];

        // 60 of 100 units remain: 6 packs, and 60% of the stored 60.00 = 36.00
        let close = |a: f64, b: f64| (a - b).abs() < 1e-9;
        assert_eq!(line.number_of_packs, 6.0);
        assert!(
            close(line.foreign_currency_price_before_tax.unwrap(), 36.0),
            "foreign total should be the stored total pro-rated, got {:?}",
            line.foreign_currency_price_before_tax
        );
        assert!(
            close(line.total_before_tax, 36.0 * invoice.currency_rate),
            "local total should be the pro-rated total at the rate, got {}",
            line.total_before_tax
        );
        assert!(close(line.total_after_tax, line.total_before_tax));
    }

    /// The order's supplier discount is apportioned to every seeded line: its
    /// cost (and sell) price and its totals are the order line's figures net of
    /// the discount, so the shipment's value reconciles with the discounted order.
    #[actix_rt::test]
    async fn insert_inbound_shipment_applies_supplier_discount() {
        fn supplier() -> NameRow {
            NameRow {
                id: "discount_supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "discount_supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        fn po() -> PurchaseOrderRow {
            PurchaseOrderRow {
                id: "discount_po".to_string(),
                store_id: mock_store_a().id,
                supplier_name_id: supplier().id,
                currency_id: Some(currency_b().id),
                foreign_exchange_rate: currency_b().rate,
                supplier_discount_percentage: Some(10.0),
                ..Default::default()
            }
        }

        // 100 units at pack size 10, 6.00 a pack after the line's own discount.
        fn po_line() -> PurchaseOrderLineRow {
            PurchaseOrderLineRow {
                id: "discount_po_line".to_string(),
                purchase_order_id: po().id,
                store_id: mock_store_a().id,
                line_number: 1,
                item_id: mock_item_a().id,
                requested_pack_size: 10.0,
                requested_number_of_units: 100.0,
                price_per_pack_after_discount: 6.0,
                line_total: 60.0,
                status: PurchaseOrderLineStatus::Sent,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_inbound_shipment_applies_supplier_discount",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                ..Default::default()
            },
        )
        .await;

        PurchaseOrderRowRepository::new(&connection)
            .upsert_one(&po())
            .unwrap();
        PurchaseOrderLineRowRepository::new(&connection)
            .upsert_one(&po_line())
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "discount_new".to_string(),
                    other_party_id: supplier().id,
                    purchase_order_id: Some(po().id),
                    insert_lines_from_purchase_order: true,
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("discount_new")
            .unwrap()
            .unwrap();
        let lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("discount_new")
            .unwrap();
        assert_eq!(lines.len(), 1);
        let line = &lines[0];

        // 10% off 6.00 a pack is 5.40; 10% off the stored 60.00 is 54.00
        let close = |a: f64, b: f64| (a - b).abs() < 1e-9;
        assert_eq!(line.number_of_packs, 10.0);
        assert!(
            close(line.cost_price_per_pack, 5.4 * invoice.currency_rate),
            "cost should be the discounted pack price at the rate, got {}",
            line.cost_price_per_pack
        );
        assert!(close(line.sell_price_per_pack, line.cost_price_per_pack));
        assert!(
            close(line.foreign_currency_price_before_tax.unwrap(), 54.0),
            "foreign total should be the discounted stored total, got {:?}",
            line.foreign_currency_price_before_tax
        );
        assert!(close(line.total_before_tax, 54.0 * invoice.currency_rate));
        assert!(close(line.total_after_tax, line.total_before_tax));
    }

    /// A service order line is seeded once, as a service line for its stored total,
    /// with no supplier discount.
    #[actix_rt::test]
    async fn insert_inbound_shipment_seeds_service_lines() {
        fn supplier() -> NameRow {
            NameRow {
                id: "service_supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "service_supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        fn po() -> PurchaseOrderRow {
            PurchaseOrderRow {
                id: "service_po".to_string(),
                store_id: mock_store_a().id,
                supplier_name_id: supplier().id,
                currency_id: Some(currency_b().id),
                foreign_exchange_rate: currency_b().rate,
                supplier_discount_percentage: Some(10.0),
                ..Default::default()
            }
        }

        fn stock_line() -> PurchaseOrderLineRow {
            PurchaseOrderLineRow {
                id: "service_po_stock_line".to_string(),
                purchase_order_id: po().id,
                store_id: mock_store_a().id,
                line_number: 1,
                item_id: mock_item_a().id,
                requested_pack_size: 10.0,
                requested_number_of_units: 100.0,
                price_per_pack_after_discount: 6.0,
                line_total: 60.0,
                status: PurchaseOrderLineStatus::Sent,
                ..Default::default()
            }
        }

        // Freight: one unit at 25.00
        fn service_line() -> PurchaseOrderLineRow {
            PurchaseOrderLineRow {
                id: "service_po_service_line".to_string(),
                purchase_order_id: po().id,
                store_id: mock_store_a().id,
                line_number: 2,
                item_id: mock_item_service_item().id,
                requested_pack_size: 1.0,
                requested_number_of_units: 1.0,
                price_per_pack_after_discount: 25.0,
                line_total: 25.0,
                status: PurchaseOrderLineStatus::Sent,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_inbound_shipment_seeds_service_lines",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                ..Default::default()
            },
        )
        .await;

        PurchaseOrderRowRepository::new(&connection)
            .upsert_one(&po())
            .unwrap();
        for line in [stock_line(), service_line()] {
            PurchaseOrderLineRowRepository::new(&connection)
                .upsert_one(&line)
                .unwrap();
        }

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let insert = |id: &str| {
            service_provider
                .invoice_service
                .insert_inbound_shipment(
                    &context,
                    InsertInboundShipment {
                        id: id.to_string(),
                        other_party_id: supplier().id,
                        purchase_order_id: Some(po().id),
                        insert_lines_from_purchase_order: true,
                        ..Default::default()
                    },
                    InboundShipmentType::InboundShipmentExternal,
                )
                .unwrap();
        };

        insert("service_first");
        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("service_first")
            .unwrap()
            .unwrap();
        let lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("service_first")
            .unwrap();
        assert_eq!(lines.len(), 2);
        let service = lines
            .iter()
            .find(|line| line.r#type == InvoiceLineType::Service)
            .expect("the service item should be seeded as a service line");
        let close = |a: f64, b: f64| (a - b).abs() < 1e-9;
        // The supplier discount takes 10% off the stock line only
        let stock = lines
            .iter()
            .find(|line| line.r#type == InvoiceLineType::StockIn)
            .unwrap();
        assert!(close(
            stock.foreign_currency_price_before_tax.unwrap(),
            54.0
        ));
        assert_eq!(service.item_id, mock_item_service_item().id);
        assert_eq!(
            service.purchase_order_line_id,
            Some(service_line().id),
            "the service line keeps its link to the order line"
        );
        assert_eq!(service.number_of_packs, 0.0);
        assert_eq!(service.status, None);
        assert!(close(
            service.foreign_currency_price_before_tax.unwrap(),
            25.0
        ));
        assert!(close(
            service.total_before_tax,
            25.0 * invoice.currency_rate
        ));
        assert!(close(service.total_after_tax, service.total_before_tax));

        // The first shipment is still New, so the line stats don't count it yet
        insert("service_second");
        let lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("service_second")
            .unwrap();
        assert!(
            lines
                .iter()
                .all(|line| line.r#type != InvoiceLineType::Service),
            "a service already on another shipment is not seeded again"
        );
    }
}
