use super::item_price::ItemPrice;

pub fn calculate_sell_price(
    stock_line_sell_price_per_pack: f64,
    pack_size: f64,
    default_pricing: ItemPrice,
) -> f64 {
    // For sell price, we need to calculate it based on the default price per unit, discount percentage, if available, otherwise we use the sell price from the stock line
    let sell_price_per_pack = match default_pricing.default_price_per_unit {
        Some(default_price_per_unit) => default_price_per_unit * pack_size,
        None => stock_line_sell_price_per_pack,
    };

    // Apply discount if available
    let sell_price_per_pack = match default_pricing.discount_percentage {
        Some(discount_percentage) => sell_price_per_pack * (1.0 - discount_percentage / 100.0),
        None => sell_price_per_pack,
    };

    sell_price_per_pack
}

#[cfg(test)]
mod tests {
    use crate::pricing::{calculate_sell_price::calculate_sell_price, item_price::ItemPrice};

    #[test]
    fn test_calculate_sell_price() {
        let stock_line_sell_price_per_pack = 99.0;
        let pack_size = 12.0;

        // No default price, no discount
        let default_pricing = ItemPrice {
            item_id: "item_id".to_string(),
            default_price_per_unit: None,
            discount_percentage: None,
            calculated_price_per_unit: None,
        };

        let result =
            calculate_sell_price(stock_line_sell_price_per_pack, pack_size, default_pricing);

        assert_eq!(result, stock_line_sell_price_per_pack);

        // Default price, no discount
        let default_pricing = ItemPrice {
            item_id: "item_id".to_string(),
            default_price_per_unit: Some(10.0),
            discount_percentage: None,
            calculated_price_per_unit: Some(10.0),
        };

        let result =
            calculate_sell_price(stock_line_sell_price_per_pack, pack_size, default_pricing);

        assert_eq!(result, 120.0); // 12 units * $10

        // Default price, discount

        let default_pricing = ItemPrice {
            item_id: "item_id".to_string(),
            default_price_per_unit: Some(10.0),
            discount_percentage: Some(10.0),
            calculated_price_per_unit: Some(9.0),
        };

        let result =
            calculate_sell_price(stock_line_sell_price_per_pack, pack_size, default_pricing);

        assert_eq!(result, 108.0); // 12 units * $10 * 1-10/100
    }
}
