use crate::{
    invoice::query::get_invoice,
    pricing::item_price::{get_pricing_for_items, ItemPrice, ItemPriceLookup},
    service_provider::ServiceContext,
    stock_line::{
        historical_stock::{
            get_historical_stock_lines, get_historical_stock_lines_available_quantity,
        },
        query::get_stock_lines,
    },
    ListError,
};
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineType, InvoiceRow, InvoiceStatus, RepositoryError, StockLine, StockLineFilter,
    StockLineRow,
};
use util::uuid::uuid;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct DraftStockOutLine {
    pub id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub pack_size: f64,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub location_id: Option<String>,
    pub sell_price_per_pack: f64,
    pub in_store_packs: f64,
    pub available_packs: f64,
    pub stock_line_on_hold: bool,
    pub vvm_status_id: Option<String>,
    pub doses_per_unit: i32,
    pub item_variant_id: Option<String>,
    pub donor_link_id: Option<String>,
    pub campaign_id: Option<String>,
    pub program_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct DraftStockOutItemData {
    pub placeholder_quantity: Option<f64>,
    pub prescribed_quantity: Option<f64>,
    pub note: Option<String>,
}

pub fn get_draft_stock_out_lines(
    ctx: &ServiceContext,
    store_id: &str,
    item_id: &str,
    invoice_id: &str,
) -> Result<(Vec<DraftStockOutLine>, DraftStockOutItemData), ListError> {
    let invoice = get_invoice(ctx, Some(store_id), invoice_id)?.ok_or(ListError::DatabaseError(
        RepositoryError::DBError {
            msg: "Invoice not found".to_string(),
            extra: invoice_id.to_string(),
        },
    ))?;

    let historical_stock_lines = get_historical_available_stock_lines(
        ctx,
        store_id,
        item_id,
        invoice.invoice_row.backdated_datetime,
    )?;

    let existing_lines = get_outgoing_invoice_lines(ctx, item_id, &invoice.invoice_row)?;

    let existing_stock_line_ids: Vec<String> = existing_lines
        .iter()
        .map(|line| line.stock_line_id.clone())
        .collect();

    let new_lines = generate_new_draft_lines(
        ctx,
        item_id,
        invoice.name_row.id,
        existing_stock_line_ids,
        historical_stock_lines,
    )?;

    // return existing first, then new lines
    let all_lines: Vec<DraftStockOutLine> = existing_lines.into_iter().chain(new_lines).collect();

    let placeholder_quantity = InvoiceLineRepository::new(&ctx.connection)
        .query_one(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(invoice.invoice_row.id.to_string()))
                .r#type(InvoiceLineType::UnallocatedStock.equal_to())
                .item_id(EqualFilter::equal_to(item_id.to_string())),
        )?
        .map(|l| l.invoice_line_row.number_of_packs);

    let prescribed_quantity = InvoiceLineRepository::new(&ctx.connection)
        .query_one(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(invoice.invoice_row.id.to_string()))
                .item_id(EqualFilter::equal_to(item_id.to_string()))
                .has_prescribed_quantity(true),
        )?
        .map(|l| l.invoice_line_row.prescribed_quantity)
        .unwrap_or_default();

    let note = InvoiceLineRepository::new(&ctx.connection)
        .query_one(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(invoice.invoice_row.id.to_string()))
                .item_id(EqualFilter::equal_to(item_id.to_string()))
                .has_note(true),
        )?
        .map(|l| l.invoice_line_row.note)
        .unwrap_or_default();

    let draft_stock_out_data = DraftStockOutItemData {
        placeholder_quantity,
        prescribed_quantity,
        note,
    };

    Ok((all_lines, draft_stock_out_data))
}

/// Gets all stock lines that were available at the given datetime,
/// and are still available today - with their available quantities
/// as of the given datetime
fn get_historical_available_stock_lines(
    ctx: &ServiceContext,
    store_id: &str,
    item_id: &str,
    datetime: Option<NaiveDateTime>,
) -> Result<Vec<StockLine>, ListError> {
    let historical_stock_lines = match datetime {
        Some(datetime) => get_historical_stock_lines(ctx, store_id, item_id, &datetime)?,
        None => get_stock_lines(
            ctx,
            None,
            Some(
                StockLineFilter::new()
                    .store_id(EqualFilter::equal_to(store_id.to_string()))
                    .item_id(EqualFilter::equal_to(item_id.to_string()))
                    .is_available(true),
            ),
            None,
            Some(store_id.to_string()),
        )?,
    };

    Ok(historical_stock_lines.rows)
}

fn get_outgoing_invoice_lines(
    ctx: &ServiceContext,
    item_id: &str,
    outbound: &InvoiceRow,
) -> Result<Vec<DraftStockOutLine>, ListError> {
    let invoice_line_repo = InvoiceLineRepository::new(&ctx.connection);

    let existing_invoice_lines = invoice_line_repo.query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(outbound.id.to_string()))
            .r#type(InvoiceLineType::StockOut.equal_to())
            .item_id(EqualFilter::equal_to(item_id.to_string())),
    )?;

    let mut invoice_stock_lines = existing_invoice_lines
        .iter()
        .filter_map(|line| line.stock_line_option.clone())
        .collect::<Vec<StockLineRow>>();

    // If invoice is backdated, available packs should be based on the historical date
    if let Some(backdated_datetime) = outbound.backdated_datetime {
        // Separate query than get_historical_available_stock_lines
        // as we could be viewing an old invoice where the stock lines are no longer available
        let historic_quantities = get_historical_stock_lines_available_quantity(
            &ctx.connection,
            invoice_stock_lines
                .iter()
                .map(|line| (line, None))
                .collect(),
            &backdated_datetime,
        )?;

        for stock_line in invoice_stock_lines.iter_mut() {
            if let Some(historic_quantity) = historic_quantities.get(&stock_line.id) {
                stock_line.available_number_of_packs = *historic_quantity;
            }
        }
    }

    let as_draft_lines = existing_invoice_lines
        .into_iter()
        .map(|l| DraftStockOutLine::from_invoice_line(l, &outbound.status, &invoice_stock_lines))
        .collect::<Result<Vec<DraftStockOutLine>, RepositoryError>>()
        .map_err(ListError::DatabaseError)?;

    Ok(as_draft_lines)
}

fn generate_new_draft_lines(
    ctx: &ServiceContext,
    item_id: &str,
    other_party_id: String,
    existing_stock_line_ids: Vec<String>,
    historical_stock_lines: Vec<StockLine>,
) -> Result<Vec<DraftStockOutLine>, ListError> {
    // filter out the stock lines that are already in the invoice
    let available_stock_lines: Vec<StockLine> = historical_stock_lines
        .into_iter()
        .filter(|line| !existing_stock_line_ids.contains(&line.stock_line_row.id))
        .collect();

    let item_pricing = get_pricing_for_items(
        &ctx.connection,
        ItemPriceLookup {
            item_ids: vec![item_id.to_string()],
            customer_name_id: Some(other_party_id),
        },
    )
    .map_err(ListError::DatabaseError)?
    .pop()
    .unwrap_or_default();

    let new_lines: Vec<DraftStockOutLine> = available_stock_lines
        .into_iter()
        .map(|stock_line| DraftStockOutLine::from_stock_line(stock_line, &item_pricing))
        .collect();

    Ok(new_lines)
}

fn find_stock_line_by_id(
    stock_line_id: Option<String>,
    stock_lines: &Vec<StockLineRow>,
) -> Result<Option<StockLineRow>, RepositoryError> {
    let stock_line_id = match stock_line_id {
        Some(id) => id,
        None => return Ok(None),
    };
    let stock_line = stock_lines
        .iter()
        .find(|line| line.id == stock_line_id)
        .ok_or(RepositoryError::DBError {
            msg: "Stock line not found".to_string(),
            extra: stock_line_id.to_string(),
        })?;
    Ok(Some(stock_line.clone()))
}

impl DraftStockOutLine {
    fn from_stock_line(line: StockLine, item_pricing: &ItemPrice) -> Self {
        let sell_price_per_pack = get_sell_price(&line.stock_line_row, item_pricing);

        let StockLineRow {
            id,
            pack_size,
            expiry_date,
            batch,
            location_id,
            available_number_of_packs,
            total_number_of_packs,
            on_hold,
            item_variant_id,
            donor_link_id,
            ..
        } = line.stock_line_row;

        Self {
            id: uuid(),
            item_id: line.item_row.id,
            stock_line_id: id,
            item_variant_id,
            donor_link_id,
            batch,
            pack_size,
            expiry_date,
            location_id,
            sell_price_per_pack,
            in_store_packs: total_number_of_packs,
            available_packs: available_number_of_packs,
            stock_line_on_hold: on_hold,
            number_of_packs: 0.0,
            vvm_status_id: line.stock_line_row.vvm_status_id,
            doses_per_unit: line.item_row.vaccine_doses,
            campaign_id: line.stock_line_row.campaign_id,
            program_id: line.stock_line_row.program_id,
        }
    }

    fn from_invoice_line(
        line: InvoiceLine,
        status: &InvoiceStatus,
        historical_stock_lines: &Vec<StockLineRow>,
    ) -> Result<Self, RepositoryError> {
        let InvoiceLineRow {
            id,
            number_of_packs,
            pack_size,
            batch,
            expiry_date,
            location_id,
            sell_price_per_pack,
            donor_link_id,
            campaign_id,
            program_id,
            ..
        } = line.invoice_line_row;

        let StockLineRow {
            id: stock_line_id,
            total_number_of_packs,
            available_number_of_packs,
            on_hold,
            vvm_status_id,
            item_variant_id,
            ..
        } = find_stock_line_by_id(line.invoice_line_row.stock_line_id, historical_stock_lines)?
            .ok_or(RepositoryError::DBError {
                msg: "No related stock line".to_string(),
                extra: id.clone(),
            })?;

        Ok(Self {
            id,
            item_id: line.item_row.id,
            item_variant_id,
            donor_link_id,
            number_of_packs,
            stock_line_id,
            pack_size,
            batch,
            expiry_date,
            location_id,
            sell_price_per_pack,
            // Stock already included in the invoice wouldn't be on the stock line available packs,
            // but should be considered available in the context of this invoice
            available_packs: available_number_of_packs + number_of_packs,
            // Stock already included in the invoice will be removed from total packs after Picked status
            // but should be considered part of the total in the context of this invoice
            in_store_packs: match status {
                InvoiceStatus::New | InvoiceStatus::Allocated => total_number_of_packs,
                _ => total_number_of_packs + number_of_packs,
            },
            stock_line_on_hold: on_hold,
            vvm_status_id,
            doses_per_unit: line.item_row.vaccine_doses,
            campaign_id,
            program_id,
        })
    }
}

fn get_sell_price(stock_line: &StockLineRow, item_pricing: &ItemPrice) -> f64 {
    // if there's a default price, it overrides the stock line price
    let base_price = match item_pricing.default_price_per_unit {
        Some(price_per_unit) => price_per_unit * stock_line.pack_size,
        None => stock_line.sell_price_per_pack,
    };

    match item_pricing.discount_percentage {
        // if there's a discount, apply it to the base price
        Some(discount_percentage) => base_price * (1.0 - discount_percentage / 100.0),
        None => base_price,
    }
}

#[cfg(test)]
mod test {
    use crate::{
        invoice_line::get_draft_outbound_lines::get_sell_price, pricing::item_price::ItemPrice,
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_item_b, mock_outbound_shipment_a, mock_outbound_shipment_a_invoice_lines,
            mock_store_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineType, StockLineRow,
    };

    #[test]
    fn test_get_sell_price() {
        let stock_line = StockLineRow {
            sell_price_per_pack: 100.0,
            pack_size: 10.0,
            ..Default::default()
        };

        // Just stock line sell price when no item pricing
        let result = get_sell_price(&stock_line, &ItemPrice::default());
        assert_eq!(result, 100.0);

        // Applies discount from item pricing
        let result = get_sell_price(
            &stock_line,
            &ItemPrice {
                discount_percentage: Some(10.0),
                ..Default::default()
            },
        );
        assert_eq!(result, 90.0); // 10% discount on 100

        // Applies default price from item pricing
        let result = get_sell_price(
            &stock_line,
            &ItemPrice {
                default_price_per_unit: Some(20.0),
                ..Default::default()
            },
        );
        assert_eq!(result, 200.0); // 20 * 10
    }

    #[actix_rt::test]
    async fn generate_outbound_shipment_lines() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "generate_outbound_shipment_lines",
            MockDataInserts::all(),
            MockData {
                invoice_lines: vec![InvoiceLineRow {
                    id: "placeholder".to_string(),
                    item_link_id: mock_item_b().id,
                    invoice_id: mock_outbound_shipment_a().id,
                    number_of_packs: 7.0,
                    pack_size: 1.0,
                    r#type: InvoiceLineType::UnallocatedStock,
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_line_service;

        let store_id = mock_store_b().id;

        let (result, additional_data) = service
            .get_draft_stock_out_lines(
                &context,
                &store_id,
                &mock_item_b().id,
                &mock_outbound_shipment_a().id, // has 2 lines, 1 of which is for item_b
            )
            .unwrap();

        // 1 from invoice, 1 from stock lines (there are 2 available stock lines in mock data, first is already in invoice)
        assert_eq!(result.len(), 2);

        assert!(result.iter().all(|l| l.item_id == mock_item_b().id)); // all lines should be item_b

        let outbound_item_b_line = &mock_outbound_shipment_a_invoice_lines()[1];

        assert_eq!(
            result[0].number_of_packs,
            outbound_item_b_line.number_of_packs // first line returned should be the one already in the invoice
        );

        assert_eq!(additional_data.placeholder_quantity, Some(7.0));
    }

    // #[actix_rt::test]
    // TODO: Make sure the historical stock lines are correctly fetched in this context
    // async fn test_draft_outbound_lines_historical() {
    //     let (_, _, connection_manager, _) = setup_all_with_data(
    //         "test_draft_outbound_lines_historical",
    //         MockDataInserts::all(),
    //         MockData {
    //             stock_lines: vec![StockLineRow {
    //                 id: "stock_line_1".to_string(),
    //                 item_link_id: mock_item_b().id,
    //                 store_id: mock_store_b().id,
    //                 available_number_of_packs: 10.0,
    //                 total_number_of_packs: 10.0,
    //                 pack_size: 1.0,
    //                 ..Default::default()
    //             }],
    //             ..Default::default()
    //         },
    //     )
    //     .await;
}
