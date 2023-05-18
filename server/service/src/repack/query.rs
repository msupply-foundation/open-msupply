use repository::{
    EqualFilter, Invoice, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository,
    InvoiceLineRowType, InvoiceRepository, InvoiceRowType, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub struct Repack {
    pub invoice: Invoice,
    pub stock_from: StockLine,
    pub stock_to: StockLine,
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

    let stock_from_id = invoice_lines
        .iter()
        .find_map(|line| {
            if line.invoice_line_row.r#type == InvoiceLineRowType::StockOut {
                line.stock_line_option
                    .as_ref()
                    .map(|stock_line| stock_line.id.clone())
            } else {
                None
            }
        })
        .ok_or(RepositoryError::NotFound)?;

    let stock_to_id = invoice_lines
        .iter()
        .find_map(|line| {
            if line.invoice_line_row.r#type == InvoiceLineRowType::StockIn {
                line.stock_line_option
                    .as_ref()
                    .map(|stock_line| stock_line.id.clone())
            } else {
                None
            }
        })
        .ok_or(RepositoryError::NotFound)?;

    let stock_line_repo = StockLineRepository::new(connection);

    let stock_from = stock_line_repo.
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(&stock_from_id)),
            Some(ctx.store_id.clone()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let stock_to = stock_line_repo
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(&stock_to_id)),
            Some(ctx.store_id.clone()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    Ok(Repack {
        invoice,
        stock_from,
        stock_to,
    })
}

#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use chrono::Utc;
    use repository::{
        mock::{mock_item_a, mock_store_a, mock_user_account_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
        StockLineRow,
    };
    use util::inline_init;

    #[actix_rt::test]
    async fn query_repacks() {
        let invoice_a = InvoiceRow {
            id: "repack_invoice_a".to_string(),
            name_id: "name_store_a".to_string(),
            store_id: "store_a".to_string(),
            invoice_number: 10,
            r#type: InvoiceRowType::Repack,
            status: InvoiceRowStatus::Verified,
            created_datetime: Utc::now().naive_utc(),
            verified_datetime: Some(Utc::now().naive_utc()),
            ..Default::default()
        };

        let invoice_a_line_a_stock_line_a = StockLineRow {
            id: "line_a_stock_line_a".to_string(),
            item_id: mock_item_a().id,
            store_id: mock_store_a().id.clone(),
            pack_size: 5,
            cost_price_per_pack: 0.20,
            sell_price_per_pack: 0.50,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            ..Default::default()
        };

        let invoice_a_line_a = InvoiceLineRow {
            id: "invoice_a_line_a".to_string(),
            invoice_id: "repack_invoice_a".to_string(),
            item_id: mock_item_a().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            stock_line_id: Some(invoice_a_line_a_stock_line_a.id.clone()),
            cost_price_per_pack: invoice_a_line_a_stock_line_a.cost_price_per_pack,
            sell_price_per_pack: invoice_a_line_a_stock_line_a.sell_price_per_pack,
            total_before_tax: invoice_a_line_a_stock_line_a.cost_price_per_pack
                * invoice_a_line_a_stock_line_a.total_number_of_packs,
            total_after_tax: invoice_a_line_a_stock_line_a.cost_price_per_pack
                * invoice_a_line_a_stock_line_a.total_number_of_packs,
            number_of_packs: invoice_a_line_a_stock_line_a.total_number_of_packs,
            pack_size: invoice_a_line_a_stock_line_a.pack_size,
            r#type: InvoiceLineRowType::StockIn,
            ..Default::default()
        };

        let invoice_a_line_b_stock_line_b = StockLineRow {
            id: "line_b_stock_line_b".to_string(),
            item_id: mock_item_a().id,
            store_id: mock_store_a().id.clone(),
            pack_size: 10,
            cost_price_per_pack: 0.10,
            sell_price_per_pack: 0.25,
            available_number_of_packs: 5.0,
            total_number_of_packs: 5.0,
            ..Default::default()
        };

        let invoice_a_line_b = InvoiceLineRow {
            id: "invoice_b_line_b".to_string(),
            invoice_id: "repack_invoice_a".to_string(),
            item_id: mock_item_a().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            stock_line_id: Some(invoice_a_line_b_stock_line_b.id.clone()),
            cost_price_per_pack: invoice_a_line_b_stock_line_b.cost_price_per_pack,
            sell_price_per_pack: invoice_a_line_b_stock_line_b.sell_price_per_pack,
            total_before_tax: invoice_a_line_b_stock_line_b.cost_price_per_pack
                * invoice_a_line_b_stock_line_b.total_number_of_packs,
            total_after_tax: invoice_a_line_b_stock_line_b.cost_price_per_pack
                * invoice_a_line_b_stock_line_b.total_number_of_packs,
            number_of_packs: invoice_a_line_b_stock_line_b.total_number_of_packs,
            pack_size: invoice_a_line_b_stock_line_b.pack_size,
            r#type: InvoiceLineRowType::StockOut,
            ..Default::default()
        };

        let (_, _, connection_manager, _) = setup_all_with_data(
            "repack_query",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice_a.clone()];
                r.stock_lines = vec![
                    invoice_a_line_a_stock_line_a.clone(),
                    invoice_a_line_b_stock_line_b.clone(),
                ];
                r.invoice_lines = vec![invoice_a_line_a.clone(), invoice_a_line_b.clone()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id.to_string())
            .unwrap();
        let service = service_provider.repack_service;

        let repack = service.get_repack(&context, "repack_invoice_a").unwrap();

        assert_eq!(invoice_a, repack.invoice.invoice_row);
        assert_eq!(
            invoice_a_line_a_stock_line_a,
            repack.stock_to.stock_line_row
        );
        assert_eq!(
            invoice_a_line_b_stock_line_b,
            repack.stock_from.stock_line_row
        );
    }
}
