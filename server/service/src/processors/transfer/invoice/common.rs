use repository::{
    EqualFilter, Invoice, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceRow,
    InvoiceType, ItemRow, ItemStoreJoinRow, ItemStoreJoinRowRepository,
    ItemStoreJoinRowRepositoryTrait, NameFilter, NameRepository, Pagination,
};
use repository::{InvoiceLineRow, RepositoryError, StorageConnection};
use util::uuid::uuid;

use crate::invoice::common::calculate_total_after_tax;
use crate::invoice::inbound_shipment::{
    update_inbound_shipment, UpdateInboundShipment, UpdateInboundShipmentStatus,
};
use crate::preference::{InboundShipmentAutoVerify, ItemMarginOverridesSupplierMargin, Preference};
use crate::service_provider::ServiceContext;

pub(crate) fn generate_inbound_lines(
    connection: &StorageConnection,
    inbound_invoice_id: &str,
    inbound_store_id: &str,
    source_invoice: &Invoice,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let outbound_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(
                source_invoice.invoice_row.id.to_string(),
            ))
            // In mSupply you can finalise customer invoice with placeholder lines, we should remove them
            // when duplicating lines from outbound invoice to inbound invoice
            .r#type(InvoiceLineType::UnallocatedStock.not_equal_to()),
    )?;
    let item_properties_repo = ItemStoreJoinRowRepository::new(connection);

    let inbound_lines = outbound_lines
        .into_iter()
        .map(|l| (l.invoice_line_row, l.item_row))
        .map(
            |(
                InvoiceLineRow {
                    id: _,
                    invoice_id: _,
                    stock_line_id: _,
                    location_id: _,
                    cost_price_per_pack: _,
                    total_after_tax: _,
                    linked_invoice_id: _,
                    reason_option_id: _,
                    item_link_id,
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
                    donor_link_id,
                    vvm_status_id,
                    campaign_id,
                    program_id,
                    shipped_number_of_packs,
                    volume_per_pack,
                    shipped_pack_size,
                },
                ItemRow {
                    id: item_id,
                    default_pack_size,
                    ..
                },
            )| {
                let item_properties = item_properties_repo
                    .find_one_by_item_and_store_id(&item_id, inbound_store_id)
                    .unwrap_or(None);

                let supplier_id = &source_invoice.store_row.name_link_id;

                let cost_price_per_pack = sell_price_per_pack;

                let total_before_tax = match r#type {
                    // Service lines don't work in packs
                    InvoiceLineType::Service => total_before_tax,
                    _ => cost_price_per_pack * number_of_packs,
                };

                let default_price_per_default_pack = item_properties
                    .as_ref()
                    .map_or(0.0, |i| i.default_sell_price_per_pack);

                let default_price_for_inbound_pack = get_default_price_for_pack(
                    default_price_per_default_pack,
                    default_pack_size,
                    pack_size,
                );

                // Default price per pack takes priority over cost + margin
                let adjusted_sell_price_per_pack = if default_price_for_inbound_pack > 0.0 {
                    default_price_for_inbound_pack
                } else {
                    get_cost_plus_margin(
                        connection,
                        cost_price_per_pack,
                        item_properties,
                        supplier_id,
                    )
                    .unwrap_or(cost_price_per_pack)
                };

                InvoiceLineRow {
                    id: uuid(),
                    invoice_id: inbound_invoice_id.to_string(),
                    item_link_id,
                    item_name,
                    item_code,
                    batch,
                    expiry_date,
                    pack_size,
                    total_before_tax,
                    total_after_tax: calculate_total_after_tax(total_before_tax, tax_percentage),
                    cost_price_per_pack: sell_price_per_pack,
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
                    linked_invoice_id: Some(source_invoice.invoice_row.id.to_string()),
                    vvm_status_id,
                    donor_link_id,
                    campaign_id,
                    program_id,
                    shipped_number_of_packs,
                    volume_per_pack,
                    sell_price_per_pack: adjusted_sell_price_per_pack,
                    shipped_pack_size,
                    // Default
                    stock_line_id: None,
                    location_id: None,
                    reason_option_id: None,
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
        )
        .map_err(|e| {
            log::error!("{:?}", e);
            RepositoryError::as_db_error("Error attempting to verify inbound shipment", e)
        })?;
    }
    Ok(())
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

    let margin = match item_margin_overrides_supplier_margin {
        // item margin (inbound store)
        true => item_properties.as_ref().map_or(0.0, |i| i.margin),
        // supplier margin (outbound store)
        false => {
            let suppliers = NameRepository::new(connection).query(
                supplier_id,
                Pagination::all(),
                Some(NameFilter::new().id(EqualFilter::equal_to(supplier_id.to_string()))),
                None,
            )?;

            suppliers
                .into_iter()
                .next()
                .and_then(|name| name.name_row.margin)
                .unwrap_or(0.0)
        }
    };

    Ok(cost_price_per_pack + (cost_price_per_pack * margin) / 100.0)
}
#[cfg(test)]
mod test {
    use super::{get_cost_plus_margin, get_default_price_for_pack};

    use repository::{
        mock::{
            mock_item_a_join_store_a, mock_store_a, mock_store_b, mock_store_c, MockDataInserts,
        },
        test_db::setup_all,
        PreferenceRow, PreferenceRowRepository,
    };

    use crate::{
        preference::{ItemMarginOverridesSupplierMargin, Preference},
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
        let supplier_id = outbound_store.name_link_id;
        let item_properties = mock_item_a_join_store_a();

        assert_eq!(
            get_cost_plus_margin(
                &connection,
                cost_price_per_pack,
                Some(item_properties.clone()),
                &supplier_id
            ),
            Ok(cost_price_per_pack + (cost_price_per_pack * 10.0) / 100.0)
        );

        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "item margin overrides supplier margin".to_string(),
                store_id: None,
                key: ItemMarginOverridesSupplierMargin.key().to_string(),
                value: "true".to_string(),
            })
            .unwrap();

        // Pref true, use item margin
        assert_eq!(
            get_cost_plus_margin(
                &connection,
                cost_price_per_pack,
                Some(item_properties),
                &supplier_id
            ),
            Ok(cost_price_per_pack + (cost_price_per_pack * 15.0) / 100.0)
        );

        // Test defaults
        // No item properties, use cost price (margin 0%)
        assert_eq!(
            get_cost_plus_margin(&connection, cost_price_per_pack, None, &supplier_id),
            Ok(cost_price_per_pack)
        );

        // Reset preference to false
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "item margin overrides supplier margin".to_string(),
                store_id: None,
                key: ItemMarginOverridesSupplierMargin.key().to_string(),
                value: "false".to_string(),
            })
            .unwrap();

        // Supplier with no margin
        let store_c = mock_store_c();
        let supplier_no_margin_id = store_c.name_link_id;
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
}
