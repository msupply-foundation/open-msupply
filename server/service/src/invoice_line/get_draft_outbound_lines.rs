use crate::{
    invoice::query::get_invoice,
    pricing::item_price::{get_pricing_for_item, ItemPrice, ItemPriceLookup},
    service_provider::ServiceContext,
    ListError,
};
use chrono::NaiveDate;
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository, StockLineRow,
};
use util::uuid::uuid;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct DraftOutboundShipmentLine {
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
}

pub fn get_draft_outbound_shipment_lines(
    ctx: &ServiceContext,
    store_id: &str,
    item_id: &str,
    invoice_id: &str,
) -> Result<
    (
        Vec<DraftOutboundShipmentLine>,
        Option<f64>, /* placeholder_quantity */
    ),
    ListError,
> {
    let outbound = get_invoice(ctx, Some(&store_id), invoice_id)?.ok_or(
        ListError::DatabaseError(RepositoryError::DBError {
            msg: "Invoice not found".to_string(),
            extra: invoice_id.to_string(),
        }),
    )?;

    let existing_lines = get_existing_shipment_lines(ctx, &item_id, &outbound.invoice_row)?;

    let existing_stock_line_ids: Vec<String> = existing_lines
        .iter()
        .map(|line| line.stock_line_id.clone())
        .collect();

    let new_lines = generate_new_draft_lines(
        ctx,
        store_id.to_string(),
        &item_id,
        outbound.name_row.id,
        existing_stock_line_ids,
    )?;

    // return existing first, then new lines
    let all_lines: Vec<DraftOutboundShipmentLine> =
        existing_lines.into_iter().chain(new_lines).collect();

    let placeholder_quantity = InvoiceLineRepository::new(&ctx.connection)
        .query_one(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(&outbound.invoice_row.id))
                .r#type(InvoiceLineType::UnallocatedStock.equal_to())
                .item_id(EqualFilter::equal_to(item_id)),
        )?
        .map(|l| l.invoice_line_row.number_of_packs);

    Ok((all_lines, placeholder_quantity))
}

fn get_existing_shipment_lines(
    ctx: &ServiceContext,
    item_id: &str,
    outbound: &InvoiceRow,
) -> Result<Vec<DraftOutboundShipmentLine>, ListError> {
    let invoice_line_repo = InvoiceLineRepository::new(&ctx.connection);

    let existing_invoice_lines = invoice_line_repo.query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&outbound.id))
            .invoice_type(InvoiceType::OutboundShipment.equal_to())
            .r#type(InvoiceLineType::StockOut.equal_to())
            .item_id(EqualFilter::equal_to(item_id)),
    )?;

    let as_draft_lines = existing_invoice_lines
        .into_iter()
        .map(|l| DraftOutboundShipmentLine::from_invoice_line(l, &outbound.status))
        .collect::<Result<Vec<DraftOutboundShipmentLine>, RepositoryError>>()
        .map_err(ListError::DatabaseError)?;

    Ok(as_draft_lines)
}

fn generate_new_draft_lines(
    ctx: &ServiceContext,
    store_id: String,
    item_id: &str,
    other_party_id: String,
    existing_stock_line_ids: Vec<String>,
) -> Result<Vec<DraftOutboundShipmentLine>, ListError> {
    let stock_line_repo = StockLineRepository::new(&ctx.connection);

    let available_stock_lines = stock_line_repo.query_by_filter(
        StockLineFilter::new()
            // For selected item
            .item_id(EqualFilter::equal_to(item_id))
            // With available stock in this store
            .store_id(EqualFilter::equal_to(&store_id))
            .has_packs_in_store(true)
            // Exclude stock lines already in the invoice
            .id(EqualFilter::not_equal_all(existing_stock_line_ids)),
        Some(store_id.clone()),
    )?;

    let item_pricing = get_pricing_for_item(
        ctx,
        ItemPriceLookup {
            item_id: item_id.to_string(),
            customer_name_id: Some(other_party_id),
        },
    )
    .map_err(ListError::DatabaseError)?;

    let new_lines: Vec<DraftOutboundShipmentLine> = available_stock_lines
        .into_iter()
        .map(|stock_line| DraftOutboundShipmentLine::from_stock_line(stock_line, &item_pricing))
        .collect();

    Ok(new_lines)
}

impl DraftOutboundShipmentLine {
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
            ..
        } = line.stock_line_row;

        Self {
            id: uuid(),
            item_id: line.item_row.id,
            stock_line_id: id,
            batch,
            pack_size,
            expiry_date,
            location_id,
            sell_price_per_pack,
            in_store_packs: total_number_of_packs,
            available_packs: available_number_of_packs,
            stock_line_on_hold: on_hold,
            number_of_packs: 0.0,
        }
    }

    fn from_invoice_line(
        line: InvoiceLine,
        status: &InvoiceStatus,
    ) -> Result<Self, RepositoryError> {
        let InvoiceLineRow {
            id,
            number_of_packs,
            pack_size,
            batch,
            expiry_date,
            location_id,
            sell_price_per_pack,
            ..
        } = line.invoice_line_row;

        let StockLineRow {
            id: stock_line_id,
            total_number_of_packs,
            available_number_of_packs,
            on_hold,
            ..
        } = line.stock_line_option.ok_or(RepositoryError::DBError {
            msg: "No related stock line".to_string(),
            extra: id.clone(),
        })?;

        Ok(Self {
            id,
            item_id: line.item_row.id,
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
            mock_store_a, MockDataInserts,
        },
        test_db::setup_all,
        StockLineRow,
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
        let (_, _, connection_manager, _) =
            setup_all("generate_outbound_shipment_lines", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_line_service;

        let store_id = mock_store_a().id;

        // todo test placeholder quantity
        let (result, _) = service
            .get_draft_outbound_shipment_lines(
                &context,
                &store_id,
                &mock_item_b().id,
                &mock_outbound_shipment_a().id, // has 2 lines, 1 of which is for item_b
            )
            .unwrap();

        // 1 from invoice, 4 from stock lines (there are 4 available stock lines in mock data, first is already in invoice)
        assert_eq!(result.len(), 5);

        assert!(result.iter().all(|l| l.item_id == mock_item_b().id)); // all lines should be item_b

        let outbound_item_b_line = &mock_outbound_shipment_a_invoice_lines()[1];

        assert_eq!(
            result[0].number_of_packs,
            outbound_item_b_line.number_of_packs // first line returned should be the one already in the invoice
        );
    }
}
