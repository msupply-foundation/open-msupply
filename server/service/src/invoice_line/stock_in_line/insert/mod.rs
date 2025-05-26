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
    pub campaign_id: Option<String>,
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
            mock_customer_return_a, mock_customer_return_a_invoice_line_a, mock_inbound_shipment_a,
            mock_inbound_shipment_c, mock_inbound_shipment_e, mock_item_a, mock_name_b,
            mock_name_customer_a, mock_name_store_b, mock_outbound_shipment_e, mock_store_a,
            mock_store_b, mock_user_account_a, mock_vaccine_item_a, mock_vvm_status_a, MockData,
            MockDataInserts,
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
    use util::{inline_edit, inline_init};

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
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = mock_customer_return_a_invoice_line_a().id;
                }),
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // PackSizeBelowOne
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 0.0;
                }),
            ),
            Err(ServiceError::PackSizeBelowOne)
        );

        // NumberOfPacksBelowZero
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1.0;
                    r.number_of_packs = -1.0;
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowZero)
        );

        // ItemNotFound
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1.0;
                    r.number_of_packs = 1.0;
                    r.item_id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // LocationDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1.0;
                    r.number_of_packs = 1.0;
                    r.item_id = mock_item_a().id;
                    r.location = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                }),
            ),
            Err(ServiceError::LocationDoesNotExist)
        );

        // ItemVariantDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1.0;
                    r.number_of_packs = 1.0;
                    r.item_id = mock_item_a().id;
                    r.item_variant_id = Some("invalid".to_string());
                }),
            ),
            Err(ServiceError::ItemVariantDoesNotExist)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1.0;
                    r.number_of_packs = 1.0;
                    r.item_id = mock_item_a().id;
                    r.invoice_id = "new invoice id".to_string();
                }),
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotAStockIn
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.item_id.clone_from(&mock_item_a().id);
                    r.pack_size = 1.0;
                    r.number_of_packs = 1.0;
                    r.invoice_id = mock_outbound_shipment_e().id;
                }),
            ),
            Err(ServiceError::NotAStockIn)
        );

        // CannotEditFinalised
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.item_id.clone_from(&mock_item_a().id);
                    r.pack_size = 1.0;
                    r.number_of_packs = 1.0;
                    r.invoice_id = verified_customer_return().id; // VERIFIED
                }),
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // NotThisStoreInvoice
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1.0;
                    r.number_of_packs = 1.0;
                    r.item_id = mock_item_a().id;
                    r.invoice_id = mock_customer_return_a().id; // Store B
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // VVMStatusDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1.0;
                    r.number_of_packs = 1.0;
                    r.item_id = mock_vaccine_item_a().id;
                    r.invoice_id = mock_inbound_shipment_a().id; // DELIVERED
                    r.vvm_status_id = Some("vvm_status".to_string());
                }),
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

        // DonorNotVisible
        assert_eq!(
            insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new invoice line id".to_string(),
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    item_id: mock_item_a().id,
                    invoice_id: mock_inbound_shipment_c().id,
                    r#type: StockInType::InboundShipment,
                    donor_id: Some(mock_name_b().id), // Not visible in store_a
                    ..Default::default()
                },
            ),
            Err(ServiceError::DonorNotVisible)
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
            inline_init(|r: &mut InsertStockInLine| {
                r.id = "new_invoice_line_id".to_string();
                r.invoice_id = mock_customer_return_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 1.0;
                r.number_of_packs = 1.0;
                r.barcode = Some(gtin.clone());
            }),
        )
        .unwrap();

        let InvoiceLine {
            invoice_line_row: inbound_line,
            stock_line_option,
            ..
        } = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new().id(EqualFilter::equal_to("new_invoice_line_id")),
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(
            inbound_line,
            inline_edit(&inbound_line, |mut u| {
                u.id = "new_invoice_line_id".to_string();
                u.item_link_id = mock_item_a().id;
                u.pack_size = 1.0;
                u.number_of_packs = 1.0;
                u
            })
        );

        let barcode = BarcodeRepository::new(&connection)
            .query_by_filter(BarcodeFilter::new().gtin(EqualFilter::equal_to(&gtin)))
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
            inline_init(|r: &mut InsertStockInLine| {
                r.id = "new_invoice_line_pack_to_one".to_string();
                r.invoice_id = mock_customer_return_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 10.0;
                r.number_of_packs = 20.0;
                r.sell_price_per_pack = 100.0;
            }),
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_pack_to_one")
            .unwrap()
            .unwrap();

        assert_eq!(
            inbound_line,
            inline_edit(&inbound_line, |mut u| {
                u.id = "new_invoice_line_pack_to_one".to_string();
                u.item_link_id = mock_item_a().id;
                u.pack_size = 1.0;
                u.number_of_packs = 200.0;
                u.sell_price_per_pack = 10.0;
                u
            })
        );

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

        assert_eq!(
            inbound_line,
            inline_edit(&inbound_line, |mut u| {
                u.id = "new_invoice_line_id_with_donor".to_string();
                u.donor_link_id = Some("donor_a".to_string());

                u
            })
        );

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

        assert_eq!(
            inbound_line,
            inline_edit(&inbound_line, |mut u| {
                u.id = "new_invoice_line_id_with_no_donor".to_string();
                u.donor_link_id = None;
                u
            })
        );

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

        let log_filter =
            VVMStatusLogFilter::new().invoice_line_id(EqualFilter::equal_to(&invoice_line.id));

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
            "delivered_invoice_line_with_vvm_status",
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
