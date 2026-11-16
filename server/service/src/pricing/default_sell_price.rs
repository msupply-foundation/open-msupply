use std::collections::HashMap;

use repository::{
    ItemRow, ItemStoreJoinRow, ItemStoreJoinRowRepository, RepositoryError, StorageConnection,
};

use crate::backend_plugin::{
    plugin_provider::PluginInstance, types::transform_item_store_properties::Context,
};

/// A store's item store properties for a set of items, read through the
/// `transform_item_store_properties` plugin hook so a plugin's default sell prices
/// apply. Every server path that gives new stock a default sell price reads it from
/// here: `item_store_join` on its own doesn't hold a plugin's prices.
/// See "Default sell price for new stock" in spec/stock/rules.md
pub struct DefaultSellPrices {
    by_item: HashMap<String, ItemStoreJoinRow>,
}

impl DefaultSellPrices {
    pub fn load(
        connection: &StorageConnection,
        context: Context,
        store_id: &str,
        mut item_ids: Vec<String>,
    ) -> Result<Self, RepositoryError> {
        item_ids.sort();
        item_ids.dedup();

        let rows = ItemStoreJoinRowRepository::new(connection)
            .find_many_by_item_and_store_ids(&item_ids, &[store_id.to_string()])?;
        let rows =
            PluginInstance::transform_item_store_properties(context, store_id, &item_ids, rows);

        let mut by_item = HashMap::new();
        for row in rows {
            // First row wins, as the previous one-row lookup did
            by_item.entry(row.item_id.clone()).or_insert(row);
        }
        Ok(Self { by_item })
    }

    pub fn item_properties(&self, item_id: &str) -> Option<&ItemStoreJoinRow> {
        self.by_item.get(item_id)
    }

    /// The store's default sell price for one pack of `pack_size`, or None when the
    /// store has no default for the item (a default of 0 means none)
    pub fn for_pack(&self, item: &ItemRow, pack_size: f64) -> Option<f64> {
        let default_sell_price_per_pack =
            self.item_properties(&item.id)?.default_sell_price_per_pack;
        let price = default_price_for_pack(
            default_sell_price_per_pack,
            item.default_pack_size,
            pack_size,
        );
        (price > 0.0).then_some(price)
    }
}

/// The default sell price, set for one pack of the item's default pack size, at
/// another pack size: the same price per unit
pub fn default_price_for_pack(
    default_sell_price_per_pack: f64,
    default_pack_size: f64,
    pack_size: f64,
) -> f64 {
    if default_pack_size == 0.0 {
        return 0.0;
    }
    let price_per_unit = default_sell_price_per_pack / default_pack_size;
    price_per_unit * pack_size
}

#[cfg(test)]
mod test {
    use repository::{
        ItemRow, ItemStoreJoinRow,
        mock::{MockData, MockDataInserts, mock_store_a, mock_store_b},
        test_db::setup_all_with_data,
    };

    use super::{DefaultSellPrices, default_price_for_pack};
    use crate::backend_plugin::types::transform_item_store_properties::Context;

    #[test]
    fn test_default_price_for_pack() {
        let default_price = 5.0;
        let default_pack_size = 10.0;

        // Exact pack
        let inbound_pack_size = 10.0;
        assert_eq!(
            default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            5.0
        );

        // Pack of one
        let inbound_pack_size = 1.0;
        assert_eq!(
            default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            0.5
        );

        // Larger pack
        let inbound_pack_size = 100.0;
        assert_eq!(
            default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            50.0
        );

        // Zero default pack size
        let default_pack_size = 0.0;
        let inbound_pack_size = 10.0;
        assert_eq!(
            default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            0.0
        );

        // Zero default price
        let default_price = 0.0;
        let inbound_pack_size = 10.0;
        assert_eq!(
            default_price_for_pack(default_price, default_pack_size, inbound_pack_size),
            0.0
        );
    }

    #[actix_rt::test]
    async fn test_default_sell_prices_for_pack() {
        let item_a = ItemRow {
            id: "default_price_item_a".to_string(),
            default_pack_size: 10.0,
            ..Default::default()
        };
        let item_b = ItemRow {
            id: "no_default_price_item_b".to_string(),
            default_pack_size: 1.0,
            ..Default::default()
        };
        let (_, connection, _, _) = setup_all_with_data(
            "test_default_sell_prices_for_pack",
            MockDataInserts::none().names().stores(),
            MockData {
                items: vec![item_a.clone(), item_b.clone()],
                item_store_joins: vec![
                    ItemStoreJoinRow {
                        id: "default_price_item_a_store_a".to_string(),
                        item_id: item_a.id.clone(),
                        store_id: mock_store_a().id,
                        default_sell_price_per_pack: 20.0,
                        ..Default::default()
                    },
                    ItemStoreJoinRow {
                        id: "no_default_price_item_b_store_a".to_string(),
                        item_id: item_b.id.clone(),
                        store_id: mock_store_a().id,
                        default_sell_price_per_pack: 0.0,
                        ..Default::default()
                    },
                ],
                ..Default::default()
            },
        )
        .await;

        let prices = DefaultSellPrices::load(
            &connection,
            Context::NewStock,
            &mock_store_a().id,
            vec![item_a.id.clone(), item_b.id.clone()],
        )
        .unwrap();

        assert_eq!(prices.for_pack(&item_a, 10.0), Some(20.0));
        assert_eq!(prices.for_pack(&item_a, 1.0), Some(2.0));
        // A default of 0 is no default
        assert_eq!(prices.for_pack(&item_b, 1.0), None);

        // Another store has no default
        let prices = DefaultSellPrices::load(
            &connection,
            Context::NewStock,
            &mock_store_b().id,
            vec![item_a.id.clone()],
        )
        .unwrap();
        assert_eq!(prices.for_pack(&item_a, 10.0), None);
    }
}
