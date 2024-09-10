use repository::{
    EqualFilter, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
    MasterListRepository, PatientFilter,
};
use repository::{PatientRepository, RepositoryError};

use crate::service_provider::ServiceContext;

pub struct ItemPriceLookup {
    pub item_id: String,
    pub customer_name_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub struct ItemPrice {
    pub item_id: String,
    pub default_price_per_unit: Option<f64>,
    pub discount_percentage: Option<f64>,
    pub calculated_price_per_unit: Option<f64>, // Only populated if we have a default price, without a default price we can't calculate the price
}

pub fn get_pricing_for_item(
    ctx: &ServiceContext,
    input: ItemPriceLookup,
) -> Result<ItemPrice, RepositoryError> {
    // 1. Get the default price list & price per unit for the item
    let default_price_list = MasterListRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListFilter::new()
                .is_default_price_list(true)
                .item_id(EqualFilter::equal_to(&input.item_id)),
        )?
        .pop();

    let default_price_per_unit = match default_price_list {
        Some(default_price_list) => {
            let master_list_line = MasterListLineRepository::new(&ctx.connection)
                .query_by_filter(
                    MasterListLineFilter::new()
                        .master_list_id(EqualFilter::equal_to(&default_price_list.id))
                        .item_id(EqualFilter::equal_to(&input.item_id)),
                )?
                .pop();

            match master_list_line {
                Some(master_list_line) => master_list_line.price_per_unit, // Line might not have a default price, so this returns the Optional<f64> price
                None => None, // This means the price list doesn't have the item, so no price, shouldn't happen though as query above should return the price list only if it has the item
            }
        }
        None => None, // No default price list found, no price
    };

    // 2. Check if we have a name, and that name is not a patient
    let is_patient = match &input.customer_name_id {
        Some(customer_name_id) => {
            let num_patients = PatientRepository::new(&ctx.connection).count(
                Some(PatientFilter::new().id(EqualFilter::equal_to(customer_name_id))),
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
        // Find the first discount list that has the item (not trying to be clever here, just using the first one found)
        let discount_master_list = MasterListRepository::new(&ctx.connection)
            .query_by_filter(
                MasterListFilter::new()
                    .is_discount_list(true)
                    .item_id(EqualFilter::equal_to(&input.item_id)),
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
    Ok(ItemPrice {
        item_id: input.item_id,
        default_price_per_unit,
        discount_percentage,
        calculated_price_per_unit: calculated_price,
    })
}
