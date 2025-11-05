use crate::{
    invoice_line::query::get_invoice_line, service_provider::ServiceContext, NullableUpdate,
    WithDBError,
};
use chrono::NaiveDate;
use repository::{
    vvm_status::vvm_status_log_row::VVMStatusLogRowRepository, BarcodeRowRepository, InvoiceLine,
    InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError, StockLineRowRepository,
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
    pub program_id: Option<String>,
    pub campaign_id: Option<String>,
    pub shipped_number_of_packs: Option<f64>,
    pub volume_per_pack: Option<f64>,
    pub shipped_pack_size: Option<f64>,
}

type OutError = InsertStockInLineError;

pub fn insert_stock_in_line(
    ctx: &ServiceContext,
    input: InsertStockInLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice) = validate(&input, &ctx.store_id, connection)?;
            let GenerateResult {
                invoice: invoice_user_update,
                invoice_line,
                stock_line,
                barcode,
                vvm_status_log,
            } = generate(connection, &ctx.user_id, input.clone(), item, invoice)?;

            if let Some(barcode_row) = barcode {
                BarcodeRowRepository::new(connection).upsert_one(&barcode_row)?;
            }

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
    LocationDoesNotExist,
    ItemVariantDoesNotExist,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowZero,
    NewlyCreatedLineDoesNotExist,
    VVMStatusDoesNotExist,
    ProgramNotVisible,
    IncorrectLocationType,
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
        barcode::{BarcodeFilter, BarcodeRepository},
        mock::{
            mock_customer_return_a, mock_customer_return_a_invoice_line_a,
            mock_immunisation_program_a, mock_inbound_shipment_a, mock_inbound_shipment_c,
            mock_inbound_shipment_e, mock_item_a, mock_item_restricted_location_type_b,
            mock_location_with_restricted_location_type_a, mock_name_customer_a, mock_name_store_b,
            mock_outbound_shipment_e, mock_store_a, mock_store_b, mock_user_account_a,
            mock_vaccine_item_a, mock_vvm_status_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        vvm_status::{
            vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
            vvm_status_log_row::VVMStatusLogRow,
        },
        EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository,
        InvoiceLineRowRepository, InvoiceRow, InvoiceStatus, InvoiceType, StorePreferenceRow,
        StorePreferenceRowRepository,
    };

    use crate::{
        invoice_line::stock_in_line::{
            insert::InsertStockInLine, InsertStockInLineError as ServiceError, StockInType,
        },
        service_provider::ServiceProvider,
        NullableUpdate,
    };

    use super::super::insert_stock_in_line;

    #[actix_rt::test]
    async fn insert_stock_in_line_errors() {
        fn verified_customer_return() -> InvoiceRow {
            InvoiceRow {
                id: "verified_customer_return".to_string(),
                status: InvoiceStatus::Verified,
                store_id: mock_store_a().id,
                name_link_id: mock_name_store_b().id,
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
            ),
            Err(ServiceError::NumberOfPacksBelowZero)
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
            ),
            Err(ServiceError::SelectedDonorPartyIsNotADonor)
        );

        // ProgramNotVisible
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
                    program_id: Some(mock_immunisation_program_a().id), // Not master list visible to store_b
                    ..Default::default()
                },
            ),
            Err(ServiceError::ProgramNotVisible)
        );
    }

    #[actix_rt::test]
    async fn insert_stock_in_line_success() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stock_in_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        let gtin = "new-gtin-123".to_string();

        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "new_invoice_line_id".to_string(),
                invoice_id: mock_customer_return_a().id,
                item_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                barcode: Some(gtin.clone()),
                ..Default::default()
            },
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
            expected.item_link_id = mock_item_a().id;
            expected.pack_size = 1.0;
            expected.number_of_packs = 1.0;
            expected
        });

        let barcode = BarcodeRepository::new(&connection)
            .query_by_filter(BarcodeFilter::new().gtin(EqualFilter::equal_to(gtin.to_owned())))
            .unwrap()
            .pop()
            .unwrap();

        let stock_line = stock_line_option.unwrap();
        assert_eq!(stock_line.barcode_id, Some(barcode.barcode_row.id));

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
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_pack_to_one")
            .unwrap()
            .unwrap();

        assert_eq!(inbound_line, {
            let mut expected = inbound_line.clone();
            expected.id = "new_invoice_line_pack_to_one".to_string();
            expected.item_link_id = mock_item_a().id;
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
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_id_with_donor")
            .unwrap()
            .unwrap();

        assert_eq!(inbound_line, {
            let mut expected = inbound_line.clone();
            expected.id = "new_invoice_line_id_with_donor".to_string();
            expected.donor_link_id = Some("donor_a".to_string());
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
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_id_with_no_donor")
            .unwrap()
            .unwrap();

        assert_eq!(inbound_line, {
            let mut expected = inbound_line.clone();
            expected.id = "new_invoice_line_id_with_no_donor".to_string();
            expected.donor_link_id = None;
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
            created_datetime: log.created_datetime.clone(),
            stock_line_id: log.stock_line_id.clone(),
            comment: None,
            created_by: "user_account_a".to_string(),
            invoice_line_id: Some("delivered_invoice_line_with_vvm_status".to_string()),
            store_id: mock_store_a().id,
        };
        assert_eq!(log, &expected_vvm_log);
    }
}
