use repository::{
    EqualFilter, Invoice, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceRow,
    InvoiceType, ItemRow, ItemStoreJoinRow, ItemStoreJoinRowRepository,
    ItemStoreJoinRowRepositoryTrait, NameFilter, NameRepository, Pagination,
};
use repository::{InvoiceLineRow, RepositoryError, StockLineRow, StorageConnection};
use util::uuid::uuid;

use crate::invoice::common::calculate_total_after_tax;
use crate::invoice::inbound_shipment::{
    update_inbound_shipment, InboundShipmentType, UpdateInboundShipment,
    UpdateInboundShipmentStatus,
};
use crate::preference::{InboundShipmentAutoVerify, ItemMarginOverridesSupplierMargin, Preference};
use crate::pricing::calculate_sell_price::issue_at_cost_price;
use crate::service_provider::ServiceContext;

pub(crate) fn generate_inbound_lines(
    connection: &StorageConnection,
    inbound_invoice_id: &str,
    inbound_store_id: &str,
    source_invoice: &Invoice,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let invoice_row = &source_invoice.invoice_row;

    let outbound_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_row.id.to_string()))
            // In mSupply you can finalise customer invoice with placeholder lines, we should remove them
            // when duplicating lines from outbound invoice to inbound invoice
            .r#type(InvoiceLineType::UnallocatedStock.not_equal_to()),
    )?;
    let item_properties_repo = ItemStoreJoinRowRepository::new(connection);

    // When the source outbound shipment was issued at cost, its sell price is the
    // supplying store's cost price, so it can't also carry a sell price to base the
    // inbound line's sell price on - we take that from the source stock line instead.
    // See `issue_at_cost_price` and #12517.
    let issued_at_cost_price = issue_at_cost_price(connection, invoice_row)?;

    let inbound_lines = outbound_lines
        .into_iter()
        .map(|l| (l.invoice_line_row, l.item_row, l.stock_line_option))
        .map(
            |(
                InvoiceLineRow {
                    id: source_line_id,
                    invoice_id: _,
                    stock_line_id: _,
                    location_id: _,
                    cost_price_per_pack,
                    total_after_tax: _,
                    linked_invoice_id: _,
                    linked_invoice_line_id: _,
                    reason_option_id,
                    item_id: _,
                    item_name,
                    item_code,
                    batch,
                    expiry_date,
                    pack_size,
                    sell_price_per_pack,
                    number_of_packs,
                    prescribed_quantity,
                    note,
                    r#type,
                    total_before_tax,
                    tax_percentage,
                    foreign_currency_price_before_tax,
                    item_variant_id,
                    donor_id: donor_link_id,
                    manufacturer_id,
                    vvm_status_id,
                    campaign_id,
                    program_id,
                    shipped_number_of_packs,
                    volume_per_pack,
                    shipped_pack_size,
                    status,
                    manufacture_date,
                    purchase_order_line_id,
                    received_number_of_packs: _,
                    legacy_goods_received_line_id: _,
                },
                ItemRow {
                    id: item_id,
                    default_pack_size,
                    ..
                },
                source_stock_line,
            )| {
                let item_properties = item_properties_repo
                    .find_one_by_item_and_store_id(&item_id, inbound_store_id)
                    .unwrap_or(None);

                let supplier_id = &source_invoice.store_row.name_id;

                let trans_cost_price = sell_price_per_pack;

                let total_before_tax = match r#type {
                    // Service lines don't work in packs
                    InvoiceLineType::Service => total_before_tax,
                    _ => trans_cost_price * number_of_packs,
                };

                let default_price_per_default_pack = item_properties
                    .as_ref()
                    .map_or(0.0, |i| i.default_sell_price_per_pack);

                let default_price_for_inbound_pack = get_default_price_for_pack(
                    default_price_per_default_pack,
                    default_pack_size,
                    pack_size,
                );

                let supplying_store_sell_price =
                    get_supplying_store_sell_price(issued_at_cost_price, source_stock_line);

                let adjusted_sell_price_per_pack = match supplying_store_sell_price {
                    // Issued at cost: the receiving store keeps the supplying store's
                    // sell price, the default price list and margins don't apply
                    Some(sell_price_per_pack) => sell_price_per_pack,
                    // Default price per pack takes priority over cost + margin
                    None if default_price_for_inbound_pack > 0.0 => default_price_for_inbound_pack,
                    None => get_cost_plus_margin(
                        connection,
                        trans_cost_price,
                        item_properties,
                        supplier_id,
                    )
                    .unwrap_or(trans_cost_price),
                };

                InvoiceLineRow {
                    id: uuid(),
                    invoice_id: inbound_invoice_id.to_string(),
                    item_id,
                    item_name,
                    item_code,
                    batch,
                    expiry_date,
                    manufacture_date,
                    purchase_order_line_id,
                    pack_size,
                    total_before_tax,
                    total_after_tax: calculate_total_after_tax(total_before_tax, tax_percentage),
                    cost_price_per_pack: match invoice_row.r#type {
                        InvoiceType::SupplierReturn => cost_price_per_pack,
                        _ => sell_price_per_pack,
                    },
                    r#type: match r#type {
                        InvoiceLineType::Service => InvoiceLineType::Service,
                        _ => InvoiceLineType::StockIn,
                    },
                    number_of_packs,
                    prescribed_quantity,
                    note,
                    tax_percentage,
                    foreign_currency_price_before_tax,
                    item_variant_id,
                    linked_invoice_id: Some(invoice_row.id.to_string()),
                    vvm_status_id,
                    donor_id: donor_link_id,
                    manufacturer_id,
                    campaign_id,
                    program_id,
                    shipped_number_of_packs,
                    volume_per_pack,
                    sell_price_per_pack: match invoice_row.r#type {
                        InvoiceType::SupplierReturn => cost_price_per_pack,
                        _ => adjusted_sell_price_per_pack,
                    },
                    shipped_pack_size,
                    reason_option_id,
                    linked_invoice_line_id: Some(source_line_id),
                    // Default
                    stock_line_id: None,
                    location_id: None,
                    status,
                    received_number_of_packs: None,
                    legacy_goods_received_line_id: None,
                }
            },
        )
        .collect();

    Ok(inbound_lines)
}

pub(crate) fn convert_invoice_line_to_single_pack(
    invoice_lines: Vec<InvoiceLineRow>,
) -> Vec<InvoiceLineRow> {
    invoice_lines
        .into_iter()
        .map(|mut line| {
            // Service lines don't work in packs
            if line.r#type == InvoiceLineType::Service {
                return line;
            }

            line.number_of_packs *= line.pack_size;
            line.cost_price_per_pack /= line.pack_size;
            line.volume_per_pack /= line.pack_size;
            line.sell_price_per_pack /= line.pack_size;
            line.pack_size = 1.0;
            line.shipped_number_of_packs = Some(line.number_of_packs);
            line.shipped_pack_size = Some(line.pack_size);
            line
        })
        .collect()
}

pub(crate) fn auto_verify_if_store_preference(
    ctx: &ServiceContext,
    inbound_shipment: &InvoiceRow,
) -> Result<(), RepositoryError> {
    if inbound_shipment.r#type != InvoiceType::InboundShipment {
        return Ok(());
    }

    match inbound_shipment.status {
        repository::InvoiceStatus::New
        | repository::InvoiceStatus::Allocated
        | repository::InvoiceStatus::Picked
        | repository::InvoiceStatus::Verified
        | repository::InvoiceStatus::Cancelled => return Ok(()),
        repository::InvoiceStatus::Shipped
        | repository::InvoiceStatus::Received
        | repository::InvoiceStatus::Delivered => (), // proceed to check auto verify pref
    };
    let should_auto_verify = InboundShipmentAutoVerify {}
        .load(&ctx.connection, Some(inbound_shipment.store_id.to_string()))
        .map_err(|e| {
            RepositoryError::as_db_error(
                "Could not load inbound shipment auto verify preference",
                e,
            )
        })?;

    if should_auto_verify {
        update_inbound_shipment(
            ctx,
            UpdateInboundShipment {
                id: inbound_shipment.id.to_string(),
                status: Some(UpdateInboundShipmentStatus::Verified),
                ..Default::default()
            },
            Some(&inbound_shipment.store_id),
            InboundShipmentType::InboundShipment,
        )
        .map_err(|e| {
            log::error!("{e:?}");
            RepositoryError::as_db_error("Error attempting to verify inbound shipment", e)
        })?;
    }
    Ok(())
}

/// The sell price the transferred inbound line should take when the source
/// outbound shipment was issued at the supplying store's cost price.
///
/// `Some` only when the source line came from a stock line - service lines, and
/// lines whose stock line has since gone, fall back to the usual default price /
/// cost + margin calculation. The outbound line's pack size is the stock line's
/// pack size, so the price needs no pack conversion.
fn get_supplying_store_sell_price(
    issued_at_cost_price: bool,
    source_stock_line: Option<StockLineRow>,
) -> Option<f64> {
    if !issued_at_cost_price {
        return None;
    }

    source_stock_line.map(|stock_line| stock_line.sell_price_per_pack)
}

pub(super) fn get_default_price_for_pack(
    default_sell_price_per_pack: f64,
    default_pack_size: f64,
    inbound_pack_size: f64,
) -> f64 {
    if default_pack_size == 0.0 {
        return 0.0;
    }
    let price_per_unit = default_sell_price_per_pack / default_pack_size;
    price_per_unit * inbound_pack_size
}

pub(super) fn get_cost_plus_margin(
    connection: &StorageConnection,
    cost_price_per_pack: f64,
    item_properties: Option<ItemStoreJoinRow>,
    supplier_id: &String,
) -> Result<f64, RepositoryError> {
    let item_margin_overrides_supplier_margin = ItemMarginOverridesSupplierMargin
        .load(connection, None)
        .unwrap_or(false);

    let margin = if item_margin_overrides_supplier_margin {
        get_item_margin(item_properties)
            .filter(|&m| m != 0.0)
            .or_else(|| get_supplier_margin(connection, supplier_id))
    } else {
        get_supplier_margin(connection, supplier_id)
            .filter(|&m| m != 0.0)
            .or_else(|| get_item_margin(item_properties))
    }
    .unwrap_or(0.0);

    Ok(cost_price_per_pack + (cost_price_per_pack * margin) / 100.0)
}

fn get_item_margin(item_properties: Option<ItemStoreJoinRow>) -> Option<f64> {
    item_properties.as_ref().map(|i| i.margin)
}

fn get_supplier_margin(connection: &StorageConnection, supplier_id: &String) -> Option<f64> {
    let suppliers = NameRepository::new(connection)
        .query(
            supplier_id,
            Pagination::all(),
            Some(NameFilter::new().id(EqualFilter::equal_to(supplier_id.to_string()))),
            None,
        )
        .ok()?;

    suppliers
        .into_iter()
        .next()
        .and_then(|name| name.name_row.margin)
}

#[cfg(test)]
mod test {
    use super::{generate_inbound_lines, get_cost_plus_margin, get_default_price_for_pack};

    use repository::{
        mock::{
            mock_item_a_join_store_a, mock_name_store_a, mock_store_a, mock_store_b, mock_store_c,
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        Invoice, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, ItemRow,
        ItemStoreJoinRow, PreferenceRow, PreferenceRowRepository, StockLineRow, StorageConnection,
    };

    use crate::{
        preference::{
            ItemMarginOverridesSupplierMargin, Preference,
            TransferStockToInternalCustomersAtCostPrice,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn test_get_cost_plus_margin() {
        let (_, _, connection_manager, _) =
            setup_all("transfer_invoice_processor", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        let connection = context.connection;

        let cost_price_per_pack = 5.0;

        let outbound_store = mock_store_b();
        let supplier_id = outbound_store.name_id;
        let item_properties = mock_item_a_join_store_a();

        // Set preference to true -> item margin has priority
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "item margin overrides supplier margin".to_string(),
                store_id: None,
                key: ItemMarginOverridesSupplierMargin.key().to_string(),
                value: "true".to_string(),
            })
            .unwrap();

        assert_eq!(
            get_cost_plus_margin(
                &connection,
                cost_price_per_pack,
                Some(item_properties.clone()),
                &supplier_id
            ),
            Ok(cost_price_per_pack + (cost_price_per_pack * 15.0) / 100.0)
        );

        // No item properties, fallback to supplier margin
        assert_eq!(
            get_cost_plus_margin(&connection, cost_price_per_pack, None, &supplier_id),
            Ok(cost_price_per_pack + (cost_price_per_pack * 10.0) / 100.0)
        );

        // Set preference to false -> supplier margin has priority
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "item margin overrides supplier margin".to_string(),
                store_id: None,
                key: ItemMarginOverridesSupplierMargin.key().to_string(),
                value: "false".to_string(),
            })
            .unwrap();

        assert_eq!(
            get_cost_plus_margin(
                &connection,
                cost_price_per_pack,
                Some(item_properties.clone()),
                &supplier_id
            ),
            Ok(cost_price_per_pack + (cost_price_per_pack * 10.0) / 100.0)
        );

        let store_c = mock_store_c();
        let supplier_no_margin_id = store_c.name_id;

        // No supplier margin, fallback to item margin
        assert_eq!(
            get_cost_plus_margin(
                &connection,
                cost_price_per_pack,
                Some(item_properties),
                &supplier_no_margin_id
            ),
            Ok(cost_price_per_pack + (cost_price_per_pack * 15.0) / 100.0)
        );

        // No item properties or supplier margin, use cost price (margin 0%)
        assert_eq!(
            get_cost_plus_margin(
                &connection,
                cost_price_per_pack,
                None,
                &supplier_no_margin_id
            ),
            Ok(cost_price_per_pack)
        );
    }

    #[test]
    fn test_get_default_price_for_pack_conversion() {
        let default_price = 5.0;
        let default_pack_size = 10.0;

        // Exact pack
        let inbound_pack_size = 10.0;
        assert_eq!(
            get_default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            5.0
        );

        // Pack of one
        let inbound_pack_size = 1.0;
        assert_eq!(
            get_default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            0.5
        );

        // Larger pack
        let inbound_pack_size = 100.0;
        assert_eq!(
            get_default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            50.0
        );

        // Zero default pack size
        let default_pack_size = 0.0;
        let inbound_pack_size = 10.0;
        assert_eq!(
            get_default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            0.0
        );

        // Zero default price
        let default_price = 0.0;
        let inbound_pack_size = 10.0;
        assert_eq!(
            get_default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            0.0
        );
    }

    const ITEM_ID: &str = "transfer_at_cost_item";
    const SUPPLYING_STORE_COST_PRICE: f64 = 2.0;
    const SUPPLYING_STORE_SELL_PRICE: f64 = 3.0;
    const DEFAULT_SELL_PRICE_PER_PACK: f64 = 50.0;

    fn set_transfer_at_cost_price(connection: &StorageConnection, value: bool) {
        PreferenceRowRepository::new(connection)
            .upsert_one(&PreferenceRow {
                id: "transfer stock to internal customers at cost price".to_string(),
                store_id: None,
                key: TransferStockToInternalCustomersAtCostPrice
                    .key()
                    .to_string(),
                value: value.to_string(),
            })
            .unwrap();
    }

    /// An outbound shipment from store_b to store_a, an internal customer
    fn transfer_at_cost_invoice() -> InvoiceRow {
        InvoiceRow {
            id: "transfer_at_cost_outbound".to_string(),
            name_id: mock_name_store_a().id,
            name_store_id: Some(mock_store_a().id),
            store_id: mock_store_b().id,
            invoice_number: 100,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::Picked,
            ..Default::default()
        }
    }

    /// The outbound shipment above, issued at cost - so its line's sell price is
    /// the supplying store's cost price
    fn transfer_at_cost_mock_data() -> MockData {
        let item = ItemRow {
            id: ITEM_ID.to_string(),
            name: "Transfer at cost item".to_string(),
            code: ITEM_ID.to_string(),
            default_pack_size: 1.0,
            ..Default::default()
        };

        // A default sell price is configured in the receiving store, so it's
        // unambiguous which price the inbound line ends up with
        let item_properties = ItemStoreJoinRow {
            id: "transfer_at_cost_item_store_a".to_string(),
            item_id: item.id.clone(),
            store_id: mock_store_a().id,
            default_sell_price_per_pack: DEFAULT_SELL_PRICE_PER_PACK,
            margin: 15.0,
            ..Default::default()
        };

        let stock_line = StockLineRow {
            id: "transfer_at_cost_stock_line".to_string(),
            item_id: item.id.clone(),
            store_id: mock_store_b().id,
            pack_size: 1.0,
            cost_price_per_pack: SUPPLYING_STORE_COST_PRICE,
            sell_price_per_pack: SUPPLYING_STORE_SELL_PRICE,
            available_number_of_packs: 10.0,
            total_number_of_packs: 10.0,
            ..Default::default()
        };

        let invoice = transfer_at_cost_invoice();

        let invoice_line = InvoiceLineRow {
            id: "transfer_at_cost_outbound_line".to_string(),
            invoice_id: invoice.id.clone(),
            item_id: item.id.clone(),
            item_name: item.name.clone(),
            item_code: item.code.clone(),
            stock_line_id: Some(stock_line.id.clone()),
            r#type: InvoiceLineType::StockOut,
            pack_size: 1.0,
            number_of_packs: 5.0,
            cost_price_per_pack: SUPPLYING_STORE_COST_PRICE,
            // Issued at cost, so the sell price is the supplying store's cost price
            sell_price_per_pack: SUPPLYING_STORE_COST_PRICE,
            ..Default::default()
        };

        MockData {
            items: vec![item],
            item_store_joins: vec![item_properties],
            stock_lines: vec![stock_line],
            invoices: vec![invoice],
            invoice_lines: vec![invoice_line],
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn generate_inbound_lines_pricing_when_issued_at_cost_price() {
        let (_, connection, _, _) = setup_all_with_data(
            "generate_inbound_lines_pricing_when_issued_at_cost_price",
            MockDataInserts::all(),
            transfer_at_cost_mock_data(),
        )
        .await;

        let source_invoice = Invoice {
            invoice_row: transfer_at_cost_invoice(),
            name_row: mock_name_store_a(),
            store_row: mock_store_b(),
            clinician_row: None,
        };
        let inbound_store_id = mock_store_a().id;

        // Preference off: the receiving store's default sell price applies, as before
        let lines = generate_inbound_lines(
            &connection,
            "inbound_id",
            &inbound_store_id,
            &source_invoice,
        )
        .unwrap();

        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].cost_price_per_pack, SUPPLYING_STORE_COST_PRICE);
        assert_eq!(lines[0].sell_price_per_pack, DEFAULT_SELL_PRICE_PER_PACK);

        set_transfer_at_cost_price(&connection, true);

        // Preference on: the cost price is still the supplying store's cost price,
        // and the sell price is now the supplying store's sell price - the receiving
        // store's default price and margin don't apply
        let lines = generate_inbound_lines(
            &connection,
            "inbound_id",
            &inbound_store_id,
            &source_invoice,
        )
        .unwrap();

        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].cost_price_per_pack, SUPPLYING_STORE_COST_PRICE);
        assert_eq!(lines[0].sell_price_per_pack, SUPPLYING_STORE_SELL_PRICE);

        set_transfer_at_cost_price(&connection, false);

        let lines = generate_inbound_lines(
            &connection,
            "inbound_id",
            &inbound_store_id,
            &source_invoice,
        )
        .unwrap();

        assert_eq!(lines[0].sell_price_per_pack, DEFAULT_SELL_PRICE_PER_PACK);
    }
}
