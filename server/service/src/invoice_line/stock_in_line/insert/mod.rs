use crate::{
    NullableUpdate, WithDBError, invoice::inbound_shipment::InboundShipmentType,
    invoice_line::query::get_invoice_line, service_provider::ServiceContext,
};
use chrono::NaiveDate;
use repository::{
    InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository, vvm_status::vvm_status_log_row::VVMStatusLogRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

use super::StockInType;

// TODO: future improvement - would be nice to have two variants of this
// - StockInLine that also creates a new stock line (e.g. inbound shipment)
// - StockInLine that adjusts existing stock line (e.g. inventory adjustment)
//  - This one could be accept more `None` values and populate them from the existing stock line
#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertStockInLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub location: Option<NullableUpdate<String>>,
    pub pack_size: f64,
    pub batch: Option<String>,
    pub note: Option<String>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub expiry_date: Option<NaiveDate>,
    pub manufacture_date: Option<NaiveDate>,
    pub number_of_packs: f64,
    pub total_before_tax: Option<f64>,
    pub tax_percentage: Option<f64>,
    pub r#type: StockInType,
    /// If None, new stock line will be generated
    pub stock_line_id: Option<String>,
    pub barcode: Option<String>,
    pub stock_on_hold: bool,
    pub item_variant_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub donor_id: Option<String>,
    pub manufacturer_id: Option<String>,
    pub program_id: Option<String>,
    pub campaign_id: Option<String>,
    pub shipped_number_of_packs: Option<f64>,
    pub volume_per_pack: Option<f64>,
    pub shipped_pack_size: Option<f64>,
    pub purchase_order_line_id: Option<String>,
    pub reason_option_id: Option<String>,
}

type OutError = InsertStockInLineError;

pub fn insert_stock_in_line(
    ctx: &ServiceContext,
    input: InsertStockInLine,
    r#type: Option<InboundShipmentType>,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice) = validate(&input, &ctx.store_id, connection, r#type)?;
            let GenerateResult {
                invoice: invoice_user_update,
                invoice_line,
                stock_line,
                vvm_status_log,
            } = generate(connection, &ctx.user_id, input.clone(), item, invoice)?;

            if let Some(stock_line_row) = stock_line {
                StockLineRowRepository::new(connection).upsert_one(&stock_line_row)?;
            }
            InvoiceLineRowRepository::new(connection).upsert_one(&invoice_line)?;

            if let Some(invoice_row) = invoice_user_update {
                InvoiceRowRepository::new(connection).upsert_one(&invoice_row)?;
            }
            if let Some(vvm_status_log_row) = vvm_status_log {
                VVMStatusLogRowRepository::new(connection).upsert_one(&vvm_status_log_row)?;
            }

            get_invoice_line(ctx, &invoice_line.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

#[derive(Debug, PartialEq, Clone)]
pub enum InsertStockInLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAStockIn,
    NotThisStoreInvoice,
    DonorDoesNotExist,
    DonorNotVisible,
    SelectedDonorPartyIsNotADonor,
    CannotEditFinalised,
    OtherPartyStoreDisabled,
    CannotAddLinesToAuthorisedReceivedInvoice,
    LocationDoesNotExist,
    ItemVariantDoesNotExist,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowZero,
    SellPricePerPackBelowZero,
    CostPricePerPackBelowZero,
    NewlyCreatedLineDoesNotExist,
    ManufacturerDoesNotExist,
    ManufacturerIsNotAManufacturer,
    VVMStatusDoesNotExist,
    ProgramDoesNotExist,
    IncorrectLocationType,
    PurchaseOrderLineIdRequired,
    PurchaseOrderLineDoesNotExist,
    PurchaseOrderLineNotFromLinkedOrder,
    WrongInboundShipmentType,
    CannotSetManufactureDateInFuture,
}

impl From<RepositoryError> for InsertStockInLineError {
    fn from(error: RepositoryError) -> Self {
        InsertStockInLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertStockInLineError
where
    ERR: Into<InsertStockInLineError>,
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
        EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository,
        InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType,
        PreferenceRow, PurchaseOrderLineRow, PurchaseOrderLineRowRepository, PurchaseOrderRow,
        PurchaseOrderRowRepository, StorePreferenceRow, StorePreferenceRowRepository,
        barcode_proposal::{BarcodeProposalFilter, BarcodeProposalRepository},
        mock::{
            MockData, MockDataInserts, currency_b, mock_customer_return_a,
            mock_customer_return_a_invoice_line_a, mock_donor_a, mock_immunisation_program_a,
            mock_inbound_shipment_a, mock_inbound_shipment_c, mock_inbound_shipment_e, mock_item_a,
            mock_item_restricted_location_type_b, mock_location_with_restricted_location_type_a,
            mock_name_customer_a, mock_name_store_b, mock_outbound_shipment_e,
            mock_purchase_order_a, mock_purchase_order_a_line_1, mock_purchase_order_b_line_1,
            mock_shipment_variance_reason_option, mock_store_a, mock_store_b, mock_user_account_a,
            mock_vaccine_item_a, mock_vvm_status_a,
        },
        test_db::{setup_all, setup_all_with_data},
        vvm_status::{
            vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
            vvm_status_log_row::VVMStatusLogRow,
        },
    };

    use crate::{
        NullableUpdate,
        invoice_line::stock_in_line::{
            InsertStockInLineError as ServiceError, StockInType, insert::InsertStockInLine,
        },
        service_provider::ServiceProvider,
    };

    use super::super::insert_stock_in_line;

    #[actix_rt::test]
    async fn insert_stock_in_line_errors() {
        fn verified_customer_return() -> InvoiceRow {
            InvoiceRow {
                id: "verified_customer_return".to_string(),
                status: InvoiceStatus::Verified,
                store_id: mock_store_a().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::CustomerReturn,
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_stock_in_line_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![verified_customer_return()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // LineAlreadyExists
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: mock_customer_return_a_invoice_line_a().id,
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // PackSizeBelowOne
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 0.0,
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::PackSizeBelowOne)
        );

        // NumberOfPacksBelowZero
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: -1.0,
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::NumberOfPacksBelowZero)
        );

        // SellPricePerPackBelowZero
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    sell_price_per_pack: -1.0,
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::SellPricePerPackBelowZero)
        );

        // CostPricePerPackBelowZero
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    cost_price_per_pack: -1.0,
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::CostPricePerPackBelowZero)
        );

        // ItemNotFound
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: "invalid".to_string(),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::ItemNotFound)
        );

        // LocationDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    location: Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    }),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::LocationDoesNotExist)
        );

        // IncorrectLocationType
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_restricted_location_type_b().id,
                    location: Some(NullableUpdate {
                        value: Some(mock_location_with_restricted_location_type_a().id),
                    }),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::IncorrectLocationType)
        );

        // ItemVariantDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    item_variant_id: Some("invalid".to_string()),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::ItemVariantDoesNotExist)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    invoice_id: "new invoice id".to_string(),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotAStockIn
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    item_id: mock_item_a().id.clone(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    invoice_id: mock_outbound_shipment_e().id,
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::NotAStockIn)
        );

        // CannotEditFinalised
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    item_id: mock_item_a().id.clone(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    invoice_id: verified_customer_return().id, // VERIFIED
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // NotThisStoreInvoice
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    invoice_id: mock_customer_return_a().id, // Store B
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // VVMStatusDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_vaccine_item_a().id,
                    invoice_id: mock_inbound_shipment_a().id, // DELIVERED
                    vvm_status_id: Some("vvm_status".to_string()),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::VVMStatusDoesNotExist)
        );

        // DonorDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    invoice_id: mock_inbound_shipment_a().id,
                    r#type: StockInType::InboundShipment,
                    donor_id: Some("invalid".to_string()),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::DonorDoesNotExist)
        );

        // DonorIsNotADonor
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    invoice_id: mock_inbound_shipment_e().id,
                    r#type: StockInType::InboundShipment,
                    donor_id: Some(mock_name_customer_a().id), // Not a donor
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::SelectedDonorPartyIsNotADonor)
        );

        // ManufacturerDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    invoice_id: mock_inbound_shipment_e().id,
                    r#type: StockInType::InboundShipment,
                    manufacturer_id: Some("invalid".to_string()),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::ManufacturerDoesNotExist)
        );

        // ManufacturerIsNotAManufacturer
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    invoice_id: mock_inbound_shipment_e().id,
                    r#type: StockInType::InboundShipment,
                    manufacturer_id: Some(mock_name_customer_a().id), // Not a manufacturer
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::ManufacturerIsNotAManufacturer)
        );

        // ProgramDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    invoice_id: mock_inbound_shipment_e().id,
                    r#type: StockInType::InboundShipment,
                    program_id: Some("does-not-exist".to_string()),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::ProgramDoesNotExist)
        );

        // Program exists but is not visible to this store — accepted (see #11600).
        // This represents stock that flowed in via an upstream shipment carrying a
        // program_id the customer store doesn't have visible.
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "stock_in_line_with_invisible_program".to_string(),
                pack_size: 1.0,
                number_of_packs: 1.0,
                item_id: mock_item_a().id,
                invoice_id: mock_inbound_shipment_e().id,
                r#type: StockInType::InboundShipment,
                program_id: Some(mock_immunisation_program_a().id),
                ..Default::default()
            },
            None,
        )
        .unwrap();
    }

    /// A line added to a purchase-order-linked shipment with no default donor
    /// takes the order's donor; the shipment's own default still wins.
    #[actix_rt::test]
    async fn insert_stock_in_line_inherits_po_donor() {
        fn po() -> PurchaseOrderRow {
            PurchaseOrderRow {
                id: "po_donor_fallback".to_string(),
                store_id: mock_store_a().id,
                supplier_name_id: mock_name_store_b().id,
                donor_id: Some(mock_donor_a().id),
                ..Default::default()
            }
        }

        fn po_line() -> PurchaseOrderLineRow {
            PurchaseOrderLineRow {
                id: "po_donor_fallback_line".to_string(),
                purchase_order_id: po().id,
                store_id: mock_store_a().id,
                line_number: 1,
                item_id: mock_item_a().id,
                ..Default::default()
            }
        }

        fn inbound(id: &str, default_donor_id: Option<String>) -> InvoiceRow {
            InvoiceRow {
                id: id.to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::New,
                purchase_order_id: Some(po().id),
                default_donor_id,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all(
            "insert_stock_in_line_inherits_po_donor",
            MockDataInserts::all(),
        )
        .await;
        PurchaseOrderRowRepository::new(&connection)
            .upsert_one(&po())
            .unwrap();
        PurchaseOrderLineRowRepository::new(&connection)
            .upsert_one(&po_line())
            .unwrap();
        let invoice_repo = InvoiceRowRepository::new(&connection);
        invoice_repo
            .upsert_one(&inbound("po_donor_no_default", None))
            .unwrap();
        invoice_repo
            .upsert_one(&inbound(
                "po_donor_with_default",
                Some("donor_b".to_string()),
            ))
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let line_repo = InvoiceLineRowRepository::new(&connection);

        let new_line = |id: &str, invoice_id: &str| InsertStockInLine {
            id: id.to_string(),
            invoice_id: invoice_id.to_string(),
            item_id: mock_item_a().id,
            pack_size: 1.0,
            number_of_packs: 1.0,
            r#type: StockInType::InboundShipment,
            purchase_order_line_id: Some(po_line().id),
            ..Default::default()
        };

        insert_stock_in_line(
            &context,
            new_line("po_donor_line_fallback", "po_donor_no_default"),
            None,
        )
        .unwrap();
        let line = line_repo
            .find_one_by_id("po_donor_line_fallback")
            .unwrap()
            .unwrap();
        assert_eq!(line.donor_id, Some(mock_donor_a().id));

        insert_stock_in_line(
            &context,
            new_line("po_donor_line_default", "po_donor_with_default"),
            None,
        )
        .unwrap();
        let line = line_repo
            .find_one_by_id("po_donor_line_default")
            .unwrap()
            .unwrap();
        assert_eq!(line.donor_id, Some("donor_b".to_string()));
    }

    #[actix_rt::test]
    async fn insert_stock_in_line_purchase_order_line_from_other_order() {
        fn po_a_inbound() -> InvoiceRow {
            InvoiceRow {
                id: "po_a_inbound".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::New,
                purchase_order_id: Some(mock_purchase_order_a().id),
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_stock_in_line_purchase_order_line_from_other_order",
            MockDataInserts::all(),
            MockData {
                invoices: vec![po_a_inbound()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        let new_line = |id: &str, purchase_order_line_id: String| InsertStockInLine {
            id: id.to_string(),
            invoice_id: po_a_inbound().id,
            item_id: mock_item_a().id,
            pack_size: 1.0,
            number_of_packs: 1.0,
            r#type: StockInType::InboundShipment,
            purchase_order_line_id: Some(purchase_order_line_id),
            ..Default::default()
        };

        // A line of a different purchase order is refused
        assert_eq!(
            insert_stock_in_line(
                &context,
                new_line("other_order_line", mock_purchase_order_b_line_1().id),
                None
            ),
            Err(ServiceError::PurchaseOrderLineNotFromLinkedOrder)
        );

        // A line of the linked purchase order is accepted
        insert_stock_in_line(
            &context,
            new_line("linked_order_line", mock_purchase_order_a_line_1().id),
            None,
        )
        .unwrap();
    }

    #[actix_rt::test]
    async fn insert_stock_in_line_authorised_received_invoice() {
        fn authorised_received_inbound() -> InvoiceRow {
            InvoiceRow {
                id: "authorised_received_inbound".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::Received,
                purchase_order_id: Some(mock_purchase_order_a().id),
                ..Default::default()
            }
        }

        // Received inbound in the same store but not linked to a purchase
        // order, so not subject to line authorisation
        fn received_inbound() -> InvoiceRow {
            InvoiceRow {
                id: "received_inbound_without_auth".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::Received,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_stock_in_line_authorised_received_invoice",
            MockDataInserts::all(),
            MockData {
                invoices: vec![authorised_received_inbound(), received_inbound()],
                preferences: vec![PreferenceRow {
                    id: "ext_auth_pref_received_insert_test".to_string(),
                    key: "external_inbound_shipment_lines_must_be_authorised".to_string(),
                    value: "true".to_string(),
                    store_id: Some(mock_store_a().id),
                }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // Lines cannot be added once an authorised shipment is received
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new_line_authorised_received".to_string(),
                    invoice_id: authorised_received_inbound().id,
                    item_id: mock_item_a().id,
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    r#type: StockInType::InboundShipment,
                    purchase_order_line_id: Some(mock_purchase_order_a_line_1().id),
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::CannotAddLinesToAuthorisedReceivedInvoice)
        );

        // A received shipment not subject to line authorisation still accepts
        // new lines
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "new_line_received_no_auth".to_string(),
                invoice_id: received_inbound().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                ..Default::default()
            },
            None,
        )
        .unwrap();
    }

    #[actix_rt::test]
    async fn insert_stock_in_line_success() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stock_in_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // Stored in standard form; no barcode or proposal is created
        let scanned = " 9506682101352\n".to_string();

        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "new_invoice_line_id".to_string(),
                invoice_id: mock_customer_return_a().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                barcode: Some(scanned),
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let InvoiceLine {
            invoice_line_row: inbound_line,
            stock_line_option,
            ..
        } = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .id(EqualFilter::equal_to("new_invoice_line_id".to_string())),
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(inbound_line, {
            let mut expected = inbound_line.clone();
            expected.id = "new_invoice_line_id".to_string();
            expected.item_id = mock_item_a().id;
            expected.pack_size = 1.0;
            expected.number_of_packs = 1.0;
            expected
        });
        assert_eq!(inbound_line.barcode.as_deref(), Some("gtin:09506682101352"));

        let stock_line = stock_line_option.unwrap();
        assert_eq!(stock_line.barcode.as_deref(), Some("gtin:09506682101352"));
        assert_eq!(
            BarcodeProposalRepository::new(&connection)
                .query_by_filter(BarcodeProposalFilter::new())
                .unwrap(),
            vec![]
        );

        // pack to one preference is set
        let pack_to_one = StorePreferenceRow {
            id: mock_store_b().id,
            pack_to_one: true,
            ..StorePreferenceRow::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&pack_to_one)
            .unwrap();

        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "new_invoice_line_pack_to_one".to_string(),
                invoice_id: mock_customer_return_a().id,
                item_id: mock_item_a().id,
                pack_size: 10.0,
                number_of_packs: 20.0,
                sell_price_per_pack: 100.0,
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_pack_to_one")
            .unwrap()
            .unwrap();

        assert_eq!(inbound_line, {
            let mut expected = inbound_line.clone();
            expected.id = "new_invoice_line_pack_to_one".to_string();
            expected.item_id = mock_item_a().id;
            expected.pack_size = 1.0;
            expected.number_of_packs = 200.0;
            expected.sell_price_per_pack = 10.0;
            expected
        });

        // default donor_id to invoice's default_donor_id
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "new_invoice_line_id_with_donor".to_string(),
                invoice_id: mock_inbound_shipment_c().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_id_with_donor")
            .unwrap()
            .unwrap();

        assert_eq!(inbound_line, {
            let mut expected = inbound_line.clone();
            expected.id = "new_invoice_line_id_with_donor".to_string();
            expected.donor_id = Some("donor_a".to_string());
            expected
        });

        // Default donor_id to None if invoice has no default donor
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "new_invoice_line_id_with_no_donor".to_string(),
                invoice_id: mock_inbound_shipment_e().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_id_with_no_donor")
            .unwrap()
            .unwrap();

        assert_eq!(inbound_line, {
            let mut expected = inbound_line.clone();
            expected.id = "new_invoice_line_id_with_no_donor".to_string();
            expected.donor_id = None;
            expected
        });

        // Check vvm status log is not created on an inbound shipment with status: New
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "new_invoice_line_with_vvm_status".to_string(),
                invoice_id: mock_inbound_shipment_c().id,
                item_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                vvm_status_id: Some(mock_vvm_status_a().id),
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let invoice_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_with_vvm_status")
            .unwrap()
            .unwrap();

        assert_eq!(invoice_line.vvm_status_id, Some(mock_vvm_status_a().id));

        let log_filter = VVMStatusLogFilter::new()
            .invoice_line_id(EqualFilter::equal_to(invoice_line.id.to_string()));

        let log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(log_filter)
            .unwrap()
            .first()
            .map(|log| log.id.clone());

        assert_eq!(log, None);

        // Check vvm status log is created on an inbound shipment with status: Delivered
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "delivered_invoice_line_with_vvm_status".to_string(),
                invoice_id: mock_inbound_shipment_a().id,
                item_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                vvm_status_id: Some(mock_vvm_status_a().id),
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let vvm_log_filter = VVMStatusLogFilter::new().invoice_line_id(EqualFilter::equal_to(
            "delivered_invoice_line_with_vvm_status".to_string(),
        ));

        let vvm_status_log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter)
            .unwrap();
        let log = vvm_status_log.first().expect("VVM status log should exist");

        let expected_vvm_log = VVMStatusLogRow {
            id: log.id.clone(),
            status_id: mock_vvm_status_a().id,
            created_datetime: log.created_datetime,
            stock_line_id: log.stock_line_id.clone(),
            comment: None,
            created_by: "user_account_a".to_string(),
            invoice_line_id: Some("delivered_invoice_line_with_vvm_status".to_string()),
            store_id: mock_store_a().id,
        };
        assert_eq!(log, &expected_vvm_log);
    }

    #[actix_rt::test]
    async fn insert_external_inbound_line_no_stock_line_when_auth_preference_enabled() {
        // Negative test: when ExternalInboundShipmentLinesMustBeAuthorised is enabled,
        // inserting a line on an external inbound shipment (has purchase_order_id) should
        // NOT create a stock line, even if the invoice status would normally allow it.
        fn external_inbound_shipment() -> InvoiceRow {
            InvoiceRow {
                id: "external_inbound_auth_test".to_string(),
                name_id: mock_name_store_b().id,
                store_id: mock_store_a().id,
                invoice_number: 999,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::Delivered,
                purchase_order_id: Some(mock_purchase_order_a().id),
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_external_inbound_no_stock_line_auth_pref",
            MockDataInserts::all(),
            MockData {
                invoices: vec![external_inbound_shipment()],
                preferences: vec![PreferenceRow {
                    id: "ext_auth_pref_insert_test".to_string(),
                    key: "external_inbound_shipment_lines_must_be_authorised".to_string(),
                    value: "true".to_string(),
                    store_id: Some(mock_store_a().id),
                }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "ext_inbound_line_auth_test".to_string(),
                invoice_id: external_inbound_shipment().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 5.0,
                r#type: StockInType::InboundShipment,
                purchase_order_line_id: Some(mock_purchase_order_a_line_1().id),
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let invoice_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("ext_inbound_line_auth_test")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice_line.stock_line_id, None,
            "Stock line should NOT be created for external inbound shipment when authorisation preference is enabled"
        );
    }

    #[actix_rt::test]
    async fn insert_stock_in_line_persists_reason() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_stock_in_line_persists_reason",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // A discrepancy reason set on a new line must persist on the first save
        // (the insert path, not only a later update).
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "reason_line".to_string(),
                invoice_id: mock_customer_return_a().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                reason_option_id: Some(mock_shipment_variance_reason_option().id),
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("reason_line")
            .unwrap()
            .unwrap();
        assert_eq!(
            line.reason_option_id,
            Some(mock_shipment_variance_reason_option().id)
        );
    }
    #[actix_rt::test]
    async fn insert_stock_in_line_shipped_inbound_shipment() {
        /// A transfer from another store, its lines are the sending store's record
        fn transferred_shipment() -> InvoiceRow {
            InvoiceRow {
                id: "shipped_transferred_shipment".to_string(),
                status: InvoiceStatus::Shipped,
                store_id: mock_store_a().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::InboundShipment,
                linked_invoice_id: Some(mock_outbound_shipment_e().id),
                ..Default::default()
            }
        }

        /// Raised against a purchase order, the user records what the supplier despatched
        fn external_shipment() -> InvoiceRow {
            InvoiceRow {
                id: "shipped_external_shipment".to_string(),
                status: InvoiceStatus::Shipped,
                store_id: mock_store_a().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::InboundShipment,
                purchase_order_id: Some(mock_purchase_order_a().id),
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_stock_in_line_shipped_inbound_shipment",
            MockDataInserts::all(),
            MockData {
                invoices: vec![transferred_shipment(), external_shipment()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // Lines of a transferred shipment are locked while it is in transit
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "line_on_transferred_shipment".to_string(),
                    invoice_id: transferred_shipment().id,
                    item_id: mock_item_a().id,
                    pack_size: 1.0,
                    number_of_packs: 5.0,
                    r#type: StockInType::InboundShipment,
                    ..Default::default()
                },
                None
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // An external shipment stays editable while in transit
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "line_on_external_shipment".to_string(),
                invoice_id: external_shipment().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 5.0,
                r#type: StockInType::InboundShipment,
                purchase_order_line_id: Some(mock_purchase_order_a_line_1().id),
                ..Default::default()
            },
            None,
        )
        .unwrap();

        // ...but the goods are still in transit, so no stock is created for it yet
        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("line_on_external_shipment")
            .unwrap()
            .unwrap();
        assert_eq!(line.stock_line_id, None);
    }

    /// A line added by hand to a foreign-currency shipment carries its total in
    /// the shipment's currency from the start — the local total at the
    /// shipment's own rate — rather than a null the Financial tab reads as 0.
    #[actix_rt::test]
    async fn insert_stock_in_line_writes_foreign_currency_total() {
        let invoice = InvoiceRow {
            id: "foreign_currency_inbound".to_string(),
            store_id: mock_store_b().id,
            name_id: mock_name_store_b().id,
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::New,
            currency_id: Some(currency_b().id),
            currency_rate: 2.0,
            ..Default::default()
        };

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_stock_in_line_writes_foreign_currency_total",
            MockDataInserts::all(),
            MockData {
                invoices: vec![invoice.clone()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // 5 packs at 10.00 local = 50.00 local = 25.00 in the shipment's currency.
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "foreign_currency_line".to_string(),
                invoice_id: invoice.id.clone(),
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 5.0,
                cost_price_per_pack: 10.0,
                r#type: StockInType::InboundShipment,
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("foreign_currency_line")
            .unwrap()
            .unwrap();
        assert_eq!(line.total_before_tax, 50.0);
        assert_eq!(line.foreign_currency_price_before_tax, Some(25.0));
    }
}
