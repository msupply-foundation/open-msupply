use repository::{InvoiceRow, InvoiceType, RepositoryError, StorageConnection};

use super::item_price::ItemPrice;
use crate::preference::{Preference, TransferStockToInternalCustomersAtCostPrice};

/// Whether stock issued on this invoice should be priced at the supplying
/// store's cost price instead of its sell price.
///
/// True only for an outbound shipment to an internal customer (another store on
/// this system) while the `TransferStockToInternalCustomersAtCostPrice`
/// preference is on. This reproduces legacy 4D mSupply's `getCustomerLinePrice`
/// for store-type customers, where a stock transfer is issued at cost. See
/// #12517 - the transfer processor carries the outbound sell price onto the
/// transferred inbound shipment as its cost price, so this is what makes the
/// receiving store's cost price the sending store's cost price.
pub fn issue_at_cost_price(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
) -> Result<bool, RepositoryError> {
    if invoice.r#type != InvoiceType::OutboundShipment || invoice.name_store_id.is_none() {
        return Ok(false);
    }

    TransferStockToInternalCustomersAtCostPrice
        .load(connection, None)
        .map_err(|e| e.into_repository_error())
}

pub fn calculate_sell_price(
    stock_line_sell_price_per_pack: f64,
    stock_line_cost_price_per_pack: f64,
    pack_size: f64,
    default_pricing: &ItemPrice,
    issue_at_cost_price: bool,
) -> f64 {
    // Internal transfers priced at cost are charged at the supplying store's cost
    // price - the default price list and customer discounts are for real customers
    // and don't apply. See `issue_at_cost_price` above.
    if issue_at_cost_price {
        return stock_line_cost_price_per_pack;
    }

    // For sell price, we need to calculate it based on the default price per unit, discount percentage, if available, otherwise we use the sell price from the stock line
    let sell_price_per_pack = match default_pricing.default_price_per_unit {
        Some(default_price_per_unit) => default_price_per_unit * pack_size,
        None => stock_line_sell_price_per_pack,
    };

    // Apply discount if available

    match default_pricing.discount_percentage {
        Some(discount_percentage) => sell_price_per_pack * (1.0 - discount_percentage / 100.0),
        None => sell_price_per_pack,
    }
}

#[cfg(test)]
mod tests {
    use crate::pricing::{calculate_sell_price::calculate_sell_price, item_price::ItemPrice};

    #[test]
    fn test_calculate_sell_price() {
        let stock_line_sell_price_per_pack = 99.0;
        let stock_line_cost_price_per_pack = 60.0;
        let pack_size = 12.0;

        // No default price, no discount
        let default_pricing = ItemPrice {
            item_id: "item_id".to_string(),
            default_price_per_unit: None,
            discount_percentage: None,
            calculated_price_per_unit: None,
        };

        let result = calculate_sell_price(
            stock_line_sell_price_per_pack,
            stock_line_cost_price_per_pack,
            pack_size,
            &default_pricing,
            false,
        );

        assert_eq!(result, stock_line_sell_price_per_pack);

        // Default price, no discount
        let default_pricing = ItemPrice {
            item_id: "item_id".to_string(),
            default_price_per_unit: Some(10.0),
            discount_percentage: None,
            calculated_price_per_unit: Some(10.0),
        };

        let result = calculate_sell_price(
            stock_line_sell_price_per_pack,
            stock_line_cost_price_per_pack,
            pack_size,
            &default_pricing,
            false,
        );

        assert_eq!(result, 120.0); // 12 units * $10

        // Default price, discount

        let default_pricing = ItemPrice {
            item_id: "item_id".to_string(),
            default_price_per_unit: Some(10.0),
            discount_percentage: Some(10.0),
            calculated_price_per_unit: Some(9.0),
        };

        let result = calculate_sell_price(
            stock_line_sell_price_per_pack,
            stock_line_cost_price_per_pack,
            pack_size,
            &default_pricing,
            false,
        );

        assert_eq!(result, 108.0); // 12 units * $10 * 1-10/100
    }

    #[test]
    fn test_calculate_sell_price_issued_at_cost_price() {
        let stock_line_sell_price_per_pack = 99.0;
        let stock_line_cost_price_per_pack = 60.0;
        let pack_size = 12.0;

        // A default price and a discount are both configured, but an internal
        // transfer issued at cost ignores them and charges the cost price.
        let default_pricing = ItemPrice {
            item_id: "item_id".to_string(),
            default_price_per_unit: Some(10.0),
            discount_percentage: Some(10.0),
            calculated_price_per_unit: Some(9.0),
        };

        let result = calculate_sell_price(
            stock_line_sell_price_per_pack,
            stock_line_cost_price_per_pack,
            pack_size,
            &default_pricing,
            true,
        );

        assert_eq!(result, stock_line_cost_price_per_pack);
    }
}
