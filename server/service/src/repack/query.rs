use repository::{
    EqualFilter, Invoice, InvoiceFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository,
    InvoiceLineRowType, InvoiceRepository, InvoiceRowType, RepositoryError,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq, Clone)]
pub struct Repack {
    pub invoice: Invoice,
    pub invoice_line_from: InvoiceLine,
    pub invoice_line_to: InvoiceLine,
}

pub fn get_repack(ctx: &ServiceContext, invoice_id: &str) -> Result<Repack, RepositoryError> {
    let connection = &ctx.connection;

    let invoice = InvoiceRepository::new(connection)
        .query_by_filter(
            InvoiceFilter::new()
                .id(EqualFilter::equal_to(invoice_id))
                .store_id(EqualFilter::equal_to(&ctx.store_id))
                .r#type(InvoiceRowType::Repack.equal_to()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let invoice_lines = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))?;

    let invoice_line_from = invoice_lines
        .iter()
        .find(|line| line.invoice_line_row.r#type == InvoiceLineRowType::StockOut)
        .ok_or(RepositoryError::NotFound)?
        .clone();

    let invoice_line_to = invoice_lines
        .iter()
        .find(|line| line.invoice_line_row.r#type == InvoiceLineRowType::StockIn)
        .ok_or(RepositoryError::NotFound)?
        .clone();

    Ok(Repack {
        invoice,
        invoice_line_from,
        invoice_line_to,
    })
}

pub fn get_repacks_by_stock_line(
    ctx: &ServiceContext,
    stock_line_id: &str,
) -> Result<Vec<Repack>, RepositoryError> {
    let connection = &ctx.connection;

    let invoices = InvoiceRepository::new(connection).query_by_filter(
        InvoiceFilter::new()
            .store_id(EqualFilter::equal_to(&ctx.store_id))
            .r#type(InvoiceRowType::Repack.equal_to())
            .stock_line_id(stock_line_id.to_owned()),
    )?;
    let invoice_ids: Vec<String> = invoices
        .iter()
        .map(|invoice| invoice.invoice_row.id.clone())
        .collect();

    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(invoice_ids)),
    )?;

    let mut repacks = Vec::new();

    for invoice in invoices {
        let invoice_line_from = invoice_lines
            .iter()
            .find(|line| {
                line.invoice_line_row.r#type == InvoiceLineRowType::StockOut
                    && line.invoice_line_row.invoice_id == invoice.invoice_row.id
            })
            .ok_or(RepositoryError::NotFound)?
            .clone();

        let invoice_line_to = invoice_lines
            .iter()
            .find(|line| {
                line.invoice_line_row.r#type == InvoiceLineRowType::StockIn
                    && line.invoice_line_row.invoice_id == invoice.invoice_row.id
            })
            .ok_or(RepositoryError::NotFound)?
            .clone();

        repacks.push(Repack {
            invoice,
            invoice_line_from,
            invoice_line_to,
        });
    }

    repacks.sort_by(|a, b| {
        b.invoice
            .invoice_row
            .verified_datetime
            .cmp(&a.invoice.invoice_row.verified_datetime)
    });

    Ok(repacks)
}

#[cfg(test)]
mod test {
    use crate::{
        repack::{query::Repack, InsertRepack},
        service_provider::ServiceProvider,
    };
    use chrono::NaiveDate;
    use repository::{
        mock::{
            currency_a, mock_item_a, mock_location_1, mock_location_on_hold, mock_store_a,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
        InvoiceLineRowType, InvoiceRepository, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
        StockLineRow, StockLineRowRepository,
    };
    use util::inline_init;

    #[actix_rt::test]
    async fn query_repacks() {
        let invoice = InvoiceRow {
            id: "repack_invoice_a".to_string(),
            name_link_id: "name_store_a".to_string(),
            store_id: "store_a".to_string(),
            invoice_number: 10,
            r#type: InvoiceRowType::Repack,
            status: InvoiceRowStatus::Verified,
            created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            verified_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0),
            currency_id: currency_a().id,
            ..Default::default()
        };

        let invoice_line_a_stock_line_a = StockLineRow {
            id: "line_a_stock_line_a".to_string(),
            item_link_id: mock_item_a().id,
            store_id: mock_store_a().id.clone(),
            pack_size: 5,
            cost_price_per_pack: 0.20,
            sell_price_per_pack: 0.50,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            location_id: Some(mock_location_1().id.clone()),
            ..Default::default()
        };

        let invoice_line_a = InvoiceLineRow {
            id: "invoice_a_line_a".to_string(),
            invoice_id: "repack_invoice_a".to_string(),
            item_link_id: mock_item_a().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            stock_line_id: Some(invoice_line_a_stock_line_a.id.clone()),
            cost_price_per_pack: invoice_line_a_stock_line_a.cost_price_per_pack,
            sell_price_per_pack: invoice_line_a_stock_line_a.sell_price_per_pack,
            total_before_tax: invoice_line_a_stock_line_a.cost_price_per_pack
                * invoice_line_a_stock_line_a.total_number_of_packs,
            total_after_tax: invoice_line_a_stock_line_a.cost_price_per_pack
                * invoice_line_a_stock_line_a.total_number_of_packs,
            number_of_packs: invoice_line_a_stock_line_a.total_number_of_packs,
            pack_size: invoice_line_a_stock_line_a.pack_size,
            r#type: InvoiceLineRowType::StockIn,
            location_id: Some(mock_location_1().id.clone()),
            ..Default::default()
        };

        let original_stock_line = StockLineRow {
            id: "original_stock_line".to_string(),
            item_link_id: mock_item_a().id,
            store_id: mock_store_a().id.clone(),
            pack_size: 10,
            cost_price_per_pack: 0.10,
            sell_price_per_pack: 0.25,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            ..Default::default()
        };

        let invoice_line_b = InvoiceLineRow {
            id: "invoice_b_line_b".to_string(),
            invoice_id: "repack_invoice_a".to_string(),
            item_link_id: mock_item_a().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            stock_line_id: Some(original_stock_line.id.clone()),
            cost_price_per_pack: original_stock_line.cost_price_per_pack,
            sell_price_per_pack: original_stock_line.sell_price_per_pack,
            total_before_tax: original_stock_line.cost_price_per_pack
                * original_stock_line.total_number_of_packs,
            total_after_tax: original_stock_line.cost_price_per_pack
                * original_stock_line.total_number_of_packs,
            number_of_packs: original_stock_line.total_number_of_packs,
            pack_size: original_stock_line.pack_size,
            r#type: InvoiceLineRowType::StockOut,
            ..Default::default()
        };

        fn sort_repacks_by_invoice_timestamp(mut repacks: Vec<Repack>) -> Vec<Repack> {
            repacks.sort_by(|a, b| {
                a.invoice
                    .invoice_row
                    .created_datetime
                    .cmp(&b.invoice.invoice_row.created_datetime)
            });
            repacks
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "repack_query",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice.clone()];
                r.stock_lines = vec![
                    invoice_line_a_stock_line_a.clone(),
                    original_stock_line.clone(),
                ];
                r.invoice_lines = vec![invoice_line_a.clone(), invoice_line_b.clone()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id.to_string())
            .unwrap();
        let service = service_provider.repack_service;

        let repack = service.get_repack(&context, "repack_invoice_a").unwrap();

        // Change location of repack line to test that location is the repack location
        let update_stock_line_location = StockLineRow {
            location_id: Some(mock_location_on_hold().id.clone()),
            ..invoice_line_a_stock_line_a.clone()
        };

        StockLineRowRepository::new(&context.connection)
            .upsert_one(&update_stock_line_location)
            .unwrap();

        assert_eq!(invoice, repack.invoice.invoice_row);
        assert_eq!(
            repack.invoice_line_to.location_row_option.unwrap().id,
            mock_location_1().id
        );
        assert_eq!(
            invoice_line_a_stock_line_a,
            repack.invoice_line_to.stock_line_option.unwrap()
        );
        assert_eq!(
            original_stock_line,
            repack.invoice_line_from.stock_line_option.unwrap()
        );

        // Repack original stock line again
        let repack = service
            .insert_repack(
                &context,
                InsertRepack {
                    stock_line_id: original_stock_line.id.clone(),
                    number_of_packs: 6.0,
                    new_pack_size: 5,
                    new_location_id: None,
                },
            )
            .unwrap();

        let repacks = service
            .get_repacks_by_stock_line(&context, &original_stock_line.id)
            .unwrap();

        let sorted_repacks = sort_repacks_by_invoice_timestamp(repacks.clone());
        let invoice_a = InvoiceRepository::new(&context.connection)
            .query_by_filter(
                InvoiceFilter::new()
                    .id(EqualFilter::equal_to(&repack.invoice_row.id))
                    .store_id(EqualFilter::equal_to(&context.store_id))
                    .r#type(InvoiceRowType::Repack.equal_to()),
            )
            .unwrap()
            .pop()
            .unwrap();
        let invoice_a_lines = InvoiceLineRepository::new(&context.connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(&invoice_a.invoice_row.id)),
            )
            .unwrap();

        let invoice_b = InvoiceRepository::new(&context.connection)
            .query_by_filter(
                InvoiceFilter::new()
                    .id(EqualFilter::equal_to(&invoice.id))
                    .store_id(EqualFilter::equal_to(&context.store_id))
                    .r#type(InvoiceRowType::Repack.equal_to()),
            )
            .unwrap()
            .pop()
            .unwrap();
        let invoice_b_lines = InvoiceLineRepository::new(&context.connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(&invoice_b.invoice_row.id)),
            )
            .unwrap();

        assert_eq!(2, sorted_repacks.len());
        assert_eq!(
            repacks,
            vec![
                Repack {
                    invoice: invoice_a,
                    invoice_line_from: invoice_a_lines
                        .iter()
                        .find(|line| line.invoice_line_row.r#type == InvoiceLineRowType::StockOut)
                        .unwrap()
                        .clone(),
                    invoice_line_to: invoice_a_lines
                        .iter()
                        .find(|line| line.invoice_line_row.r#type == InvoiceLineRowType::StockIn)
                        .unwrap()
                        .clone(),
                },
                Repack {
                    invoice: invoice_b,
                    invoice_line_from: invoice_b_lines
                        .iter()
                        .find(|line| line.invoice_line_row.r#type == InvoiceLineRowType::StockOut)
                        .unwrap()
                        .clone(),
                    invoice_line_to: invoice_b_lines
                        .iter()
                        .find(|line| line.invoice_line_row.r#type == InvoiceLineRowType::StockIn)
                        .unwrap()
                        .clone(),
                }
            ]
        );
    }
}
