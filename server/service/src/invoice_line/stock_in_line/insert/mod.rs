use crate::{
    invoice_line::query::get_invoice_line, service_provider::ServiceContext, NullableUpdate,
    WithDBError,
};
use chrono::NaiveDate;
use repository::{
    BarcodeRowRepository, InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository,
    RepositoryError, StockLineRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

use super::StockInType;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertStockInLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub location: Option<NullableUpdate<String>>,
    pub pack_size: u32,
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
}

type OutError = InsertStockInLineError;

pub fn insert_stock_in_line(
    ctx: &ServiceContext,
    input: InsertStockInLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice) = validate(&input, &ctx.store_id, &connection)?;
            let GenerateResult {
                invoice: invoice_user_update,
                invoice_line,
                stock_line,
                barcode,
            } = generate(&connection, &ctx.user_id, input, item, invoice)?;

            if let Some(barcode_row) = barcode {
                BarcodeRowRepository::new(connection).upsert_one(&barcode_row)?;
            }

            if let Some(stock_line_row) = stock_line {
                StockLineRowRepository::new(&connection).upsert_one(&stock_line_row)?;
            }
            InvoiceLineRowRepository::new(&connection).upsert_one(&invoice_line)?;

            if let Some(invoice_row) = invoice_user_update {
                InvoiceRowRepository::new(&connection).upsert_one(&invoice_row)?;
            }

            get_invoice_line(ctx, &invoice_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
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
    CannotEditFinalised,
    LocationDoesNotExist,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowOne,
    NewlyCreatedLineDoesNotExist,
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
            mock_inbound_return_a, mock_inbound_return_a_invoice_line_a, mock_item_a,
            mock_name_store_b, mock_outbound_shipment_e, mock_store_a, mock_store_b,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository,
        InvoiceLineRowRepository, InvoiceRow, InvoiceStatus, InvoiceType, StorePreferenceRow,
        StorePreferenceRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::stock_in_line::{
            insert::InsertStockInLine, InsertStockInLineError as ServiceError,
        },
        service_provider::ServiceProvider,
        NullableUpdate,
    };

    use super::insert_stock_in_line;

    #[actix_rt::test]
    async fn insert_stock_in_line_errors() {
        fn verified_inbound_return() -> InvoiceRow {
            InvoiceRow {
                id: "verified_inbound_return".to_string(),
                status: InvoiceStatus::Verified,
                store_id: mock_store_a().id,
                name_link_id: mock_name_store_b().id,
                r#type: InvoiceType::InboundReturn,
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_stock_in_line_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![verified_inbound_return()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // LineAlreadyExists
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = mock_inbound_return_a_invoice_line_a().id;
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
                    r.pack_size = 0;
                }),
            ),
            Err(ServiceError::PackSizeBelowOne)
        );

        // NumberOfPacksBelowOne
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1;
                    r.number_of_packs = 0.0;
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowOne)
        );

        // ItemNotFound
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1;
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
                    r.pack_size = 1;
                    r.number_of_packs = 1.0;
                    r.item_id = mock_item_a().id;
                    r.location = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                }),
            ),
            Err(ServiceError::LocationDoesNotExist)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            insert_stock_in_line(
                &context,
                inline_init(|r: &mut InsertStockInLine| {
                    r.id = "new invoice line id".to_string();
                    r.pack_size = 1;
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
                    r.item_id = mock_item_a().id.clone();
                    r.pack_size = 1;
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
                    r.item_id = mock_item_a().id.clone();
                    r.pack_size = 1;
                    r.number_of_packs = 1.0;
                    r.invoice_id = verified_inbound_return().id; // VERIFIED
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
                    r.pack_size = 1;
                    r.number_of_packs = 1.0;
                    r.item_id = mock_item_a().id;
                    r.invoice_id = mock_inbound_return_a().id; // Store B
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn insert_stock_in_line_success() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_stock_in_line_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        let gtin = "new-gtin-123".to_string();

        insert_stock_in_line(
            &context,
            inline_init(|r: &mut InsertStockInLine| {
                r.id = "new_invoice_line_id".to_string();
                r.invoice_id = mock_inbound_return_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 1;
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
                u.pack_size = 1;
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
                r.invoice_id = mock_inbound_return_a().id;
                r.item_id = mock_item_a().id;
                r.pack_size = 10;
                r.number_of_packs = 20.0;
                r.sell_price_per_pack = 100.0;
            }),
        )
        .unwrap();

        let inbound_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_invoice_line_pack_to_one")
            .unwrap();

        assert_eq!(
            inbound_line,
            inline_edit(&inbound_line, |mut u| {
                u.id = "new_invoice_line_pack_to_one".to_string();
                u.item_link_id = mock_item_a().id;
                u.pack_size = 1;
                u.number_of_packs = 200.0;
                u.sell_price_per_pack = 10.0;
                u
            })
        );
    }
}
