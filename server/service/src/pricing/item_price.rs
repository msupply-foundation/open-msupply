use repository::{
    EqualFilter, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
    MasterListRepository, MasterListSort, MasterListSortField, Pagination, PatientFilter,
    StorageConnection,
};
use repository::{PatientRepository, RepositoryError};

pub struct ItemPriceLookup {
    pub item_ids: Vec<String>,
    pub customer_name_id: Option<String>,
}

#[derive(Debug, PartialEq, Default)]
pub struct ItemPrice {
    pub item_id: String,
    pub default_price_per_unit: Option<f64>,
    pub discount_percentage: Option<f64>,
    pub calculated_price_per_unit: Option<f64>, // Only populated if we have a default price, without a default price we can't calculate the price
}

pub fn get_pricing_for_items(
    connection: &StorageConnection,
    input: ItemPriceLookup,
) -> Result<Vec<ItemPrice>, RepositoryError> {
    // 1. Get the default price list & price per unit for the item
    let mut item_prices = Vec::with_capacity(input.item_ids.len());
    for item_id in input.item_ids {
        let default_price_per_unit = MasterListLineRepository::new(connection)
            .query_by_filter(
                MasterListLineFilter::new()
                    .master_list(MasterListFilter::new().is_default_price_list(true))
                    .item_id(EqualFilter::equal_to(item_id.to_string())),
                None,
            )?
            .pop()
            .and_then(|l| l.price_per_unit);

        // 2. Check if we have a name, and that name is not a patient
        let is_patient = match &input.customer_name_id {
            Some(customer_name_id) => {
                let num_patients = PatientRepository::new(connection).count(
                    Some(
                        PatientFilter::new()
                            .id(EqualFilter::equal_to(customer_name_id.to_string())),
                    ),
                    None,
                )?;

                num_patients > 0
            }
            None => false,
        };

        let discount_percentage = if is_patient {
            None // Patients get no discount
        } else {
            // 2.A Lookup the discount list
            // Always assign the biggest discount we can find
            let discount_master_list = MasterListRepository::new(connection)
                .query(
                    Pagination {
                        limit: 1,
                        offset: 0,
                    },
                    Some(
                        MasterListFilter::new()
                            .is_discount_list(true)
                            .item_id(EqualFilter::equal_to(item_id.to_string())),
                    ),
                    Some(MasterListSort {
                        key: MasterListSortField::DiscountPercentage,
                        desc: Some(true),
                    }),
                )?
                .pop();

            match discount_master_list {
                Some(discount_master_list) => discount_master_list.discount_percentage, // We have a discount list, get the discount, item should be in the list based on query filter above
                None => None, // No discount list found, no discount
            }
        };

        // 3. Calculate the price if we are able to
        let calculated_price = match default_price_per_unit {
            Some(default_price_per_unit) => {
                let discount = discount_percentage.unwrap_or(0.0);
                Some(default_price_per_unit * (1.0 - discount / 100.0))
            }
            None => None,
        };

        // 4. Return the pricing data
        item_prices.push(ItemPrice {
            item_id: item_id,
            default_price_per_unit,
            discount_percentage,
            calculated_price_per_unit: calculated_price,
        });
    }
    Ok(item_prices)
}
