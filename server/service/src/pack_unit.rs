use std::collections::HashMap;

use repository::{
    EqualFilter, PackUnitRow, PackUnitRowRepository, RepositoryError, StockLineFilter,
    StockLineRepository, StockOnHandFilter, StockOnHandRepository, StorageConnection,
};

#[derive(Debug, Eq, PartialEq, Ord, PartialOrd)]
pub struct PackUnit {
    pub item_id: String,
    pub most_used_variant_id: String,
    pub pack_units: Vec<PackUnitRow>,
}

pub fn get_pack_units(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Vec<PackUnit>, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection)
        .query_by_filter(StockLineFilter::new(), Some(store_id.to_string()))?;
    let stock_on_hand = StockOnHandRepository::new(connection).query(Some(
        StockOnHandFilter::new().store_id(EqualFilter::equal_to(store_id)),
    ))?;
    let pack_units = PackUnitRowRepository::new(connection).load_all()?;

    // Calculate the most used variant for each item and pack size by total number of packs
    // if item has stock on hand else by empty line count
    let mut total_number_of_packs: HashMap<(String, i32), f64> = HashMap::new();
    let mut total_number_of_lines: HashMap<(String, i32), f64> = HashMap::new();
    for stock_line in stock_lines {
        let item_id = stock_line.stock_line_row.item_id.clone();
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
    // and group all the pack units with their item
    let mut pack_units_grouped: HashMap<String, (String, Vec<PackUnitRow>)> = HashMap::new();
    for pack_unit in pack_units.clone() {
        let item_id = pack_unit.item_id.clone();

        let most_used_variant_id = pack_units
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
                    .then(
                        total_number_of_lines
                            .get(&(a.item_id.clone(), a.pack_size))
                            .unwrap_or(&0.0)
                            .partial_cmp(
                                total_number_of_lines
                                    .get(&(b.item_id.clone(), b.pack_size))
                                    .unwrap_or(&0.0),
                            )
                            .unwrap(),
                    )
            })
            .map(|p| p.id.clone())
            .unwrap_or("".to_string());

        pack_units_grouped
            .entry(item_id)
            .and_modify(|e| e.1.push(pack_unit.clone()))
            .or_insert((most_used_variant_id, vec![pack_unit]));
    }

    Ok(pack_units_grouped
        .into_iter()
        .map(|(item_id, pack_units)| PackUnit {
            item_id: item_id.clone(),
            most_used_variant_id: pack_units.0,
            pack_units: pack_units.1,
        })
        .collect())
}

#[cfg(test)]
mod test {
    use std::collections::HashMap;

    use repository::{
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
        EqualFilter, PackUnitRowRepository, StockLineFilter, StockLineRepository,
        StorageConnection,
    };

    use super::{get_pack_units, PackUnit};

    // only testing item_a and item_b since both have SOH in store
    fn pack_units_for_item_helper(connection: &StorageConnection, item_id: &str) -> PackUnit {
        let stock_lines = StockLineRepository::new(connection)
            .query_by_filter(
                StockLineFilter::new().item_id(EqualFilter::equal_to(item_id)),
                Some(mock_store_a().id),
            )
            .unwrap();
        let pack_units = PackUnitRowRepository::new(connection).load_all().unwrap();

        let mut total_number_of_packs: HashMap<(String, i32), f64> = HashMap::new();

        for stock_line in stock_lines {
            let item_id = stock_line.stock_line_row.item_id.clone();
            let pack_size = stock_line.stock_line_row.pack_size;

            total_number_of_packs
                .entry((item_id, pack_size))
                .and_modify(|e| *e += stock_line.stock_line_row.total_number_of_packs)
                .or_insert(0.0);
        }

        let most_used_variant_id = pack_units
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

        PackUnit {
            item_id: item_id.to_string(),
            most_used_variant_id,
            pack_units: pack_units
                .into_iter()
                .filter(|p| p.item_id == item_id)
                .collect(),
        }
    }

    #[actix_rt::test]
    async fn pack_units() {
        let (_, connection, _, _) = setup_all("test_pack_units", MockDataInserts::all()).await;

        let mut pack_units = get_pack_units(&connection, &mock_store_a().id).unwrap();
        pack_units.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        let item_a_pack_units = pack_units_for_item_helper(&connection, "item_a");
        let item_b_pack_units = pack_units_for_item_helper(&connection, "item_b");

        assert_eq!(pack_units.len(), 2);
        assert_eq!(pack_units, vec![item_a_pack_units, item_b_pack_units]);
    }
}
