use std::collections::HashMap;

use repository::{
    EqualFilter, PackVariantFilter, PackVariantRepository, PackVariantRow, RepositoryError,
    StockLineFilter, StockLineRepository, StockOnHandFilter, StockOnHandRepository,
};

use crate::service_provider::ServiceContext;

use super::ItemPackVariant;

/// For a particular store, this method returns all pack units grouped by item_id and a reference to the most
/// used pack unit for each item (see ItemPackVariant return type).
pub fn get_pack_variants(ctx: &ServiceContext) -> Result<Vec<ItemPackVariant>, RepositoryError> {
    let connection = &ctx.connection;
    let store_id = &ctx.store_id;

    let stock_lines = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new().store_id(EqualFilter::equal_to(store_id)),
        None,
    )?;
    let stock_on_hand = StockOnHandRepository::new(connection).query(Some(
        StockOnHandFilter::new().store_id(EqualFilter::equal_to(store_id)),
    ))?;
    let pack_variants = PackVariantRepository::new(connection)
        .query_by_filter(PackVariantFilter::new().is_active(true))?;

    // Calculate the most used variant for each item and pack size by total number of packs
    // if item has stock on hand else by empty line count. HashMap keys are (item_id, pack_size)
    // for easier management.
    let mut total_number_of_packs: HashMap<(String, i32), f64> = HashMap::new();
    let mut total_number_of_lines: HashMap<(String, i32), f64> = HashMap::new();
    for stock_line in stock_lines {
        let item_id = stock_line.item_row.id.clone();
        let pack_size = stock_line.stock_line_row.pack_size;

        if stock_on_hand
            .iter()
            .any(|s| s.item_id == item_id && s.available_stock_on_hand != 0)
        {
            total_number_of_packs
                .entry((item_id, pack_size))
                .and_modify(|e| *e += stock_line.stock_line_row.total_number_of_packs)
                .or_insert(0.0);
        } else {
            total_number_of_lines
                .entry((item_id, pack_size))
                .and_modify(|e| *e += 1.0)
                .or_insert(0.0);
        }
    }

    // Find the most used variant id for each item based on total number of packs (if SOH) or total number of lines,
    // and group all the pack variants with their item
    let mut pack_variants_grouped: HashMap<String, (String, Vec<PackVariantRow>)> = HashMap::new();
    for pack_variant in pack_variants.clone() {
        let item_id = pack_variant.item_id.clone();

        let most_used_pack_variant_id = pack_variants
            .iter()
            .filter(|p| p.item_id == item_id)
            .max_by(|a, b| {
                let ordering_by_packs = total_number_of_packs
                    .get(&(a.item_id.clone(), a.pack_size))
                    .unwrap_or(&0.0)
                    .partial_cmp(
                        total_number_of_packs
                            .get(&(b.item_id.clone(), b.pack_size))
                            .unwrap_or(&0.0),
                    )
                    .unwrap();

                let ordering_by_lines = total_number_of_lines
                    .get(&(a.item_id.clone(), a.pack_size))
                    .unwrap_or(&0.0)
                    .partial_cmp(
                        total_number_of_lines
                            .get(&(b.item_id.clone(), b.pack_size))
                            .unwrap_or(&0.0),
                    )
                    .unwrap();

                ordering_by_packs.then(ordering_by_lines)
            })
            .map(|p| p.id.clone())
            .unwrap_or("".to_string());

        pack_variants_grouped
            .entry(item_id)
            .and_modify(|e| e.1.push(pack_variant.clone()))
            .or_insert((most_used_pack_variant_id, vec![pack_variant]));
    }

    Ok(pack_variants_grouped
        .into_iter()
        .map(|(item_id, pack_variants)| ItemPackVariant {
            item_id: item_id.clone(),
            most_used_pack_variant_id: pack_variants.0,
            pack_variants: pack_variants.1,
        })
        .collect())
}

#[cfg(test)]
mod test {
    use std::collections::HashMap;

    use repository::{
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
        EqualFilter, PackVariantFilter, PackVariantRepository, StockLineFilter,
        StockLineRepository, StorageConnection,
    };

    use crate::service_provider::ServiceProvider;

    use super::ItemPackVariant;

    // only testing item_a and item_b since both have SOH in store
    fn pack_variants_for_item_helper(
        connection: &StorageConnection,
        item_id: &str,
    ) -> ItemPackVariant {
        let stock_lines = StockLineRepository::new(connection)
            .query_by_filter(
                StockLineFilter::new().item_id(EqualFilter::equal_to(item_id)),
                Some(mock_store_a().id),
            )
            .unwrap();
        let pack_variants = PackVariantRepository::new(connection)
            .query_by_filter(PackVariantFilter::new().is_active(true))
            .unwrap();

        let mut total_number_of_packs: HashMap<(String, i32), f64> = HashMap::new();

        for stock_line in stock_lines {
            let item_id = stock_line.item_row.id.clone();
            let pack_size = stock_line.stock_line_row.pack_size;

            total_number_of_packs
                .entry((item_id, pack_size))
                .and_modify(|e| *e += stock_line.stock_line_row.total_number_of_packs)
                .or_insert(0.0);
        }

        let most_used_pack_variant_id = pack_variants
            .iter()
            .filter(|p| p.item_id == item_id)
            .max_by(|a, b| {
                total_number_of_packs
                    .get(&(a.item_id.clone(), a.pack_size))
                    .unwrap_or(&0.0)
                    .partial_cmp(
                        total_number_of_packs
                            .get(&(b.item_id.clone(), b.pack_size))
                            .unwrap_or(&0.0),
                    )
                    .unwrap()
            })
            .map(|p| p.id.clone())
            .unwrap_or("".to_string());

        ItemPackVariant {
            item_id: item_id.to_string(),
            most_used_pack_variant_id,
            pack_variants: pack_variants
                .into_iter()
                .filter(|p| p.item_id == item_id)
                .collect(),
        }
    }

    #[actix_rt::test]
    async fn pack_variants() {
        let (_, connection, connection_manager, _) =
            setup_all("test_pack_variants", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.pack_variant_service;

        let mut pack_variants = service.get_pack_variants(&context).unwrap();
        pack_variants.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        let item_a_pack_variants = pack_variants_for_item_helper(&connection, "item_a");
        let item_b_pack_variants = pack_variants_for_item_helper(&connection, "item_b");

        assert_eq!(pack_variants.len(), 2);
        assert_eq!(
            pack_variants,
            vec![item_a_pack_variants, item_b_pack_variants]
        );
    }
}
