use repository::{
    EqualFilter, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
    MasterListRepository, MasterListSort, MasterListSortField, Pagination, PatientFilter,
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
    let default_price_per_unit = MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list(MasterListFilter::new().is_default_price_list(true))
                .item_id(EqualFilter::equal_to(&input.item_id)),
        )?
        .pop()
        .and_then(|l| l.price_per_unit);

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
        // Always assign the biggest discount we can find
        let discount_master_list = MasterListRepository::new(&ctx.connection)
            .query(
                Pagination {
                    limit: 1,
                    offset: 0,
                },
                Some(
                    MasterListFilter::new()
                        .is_discount_list(true)
                        .item_id(EqualFilter::equal_to(&input.item_id)),
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
    Ok(ItemPrice {
        item_id: input.item_id,
        default_price_per_unit,
        discount_percentage,
        calculated_price_per_unit: calculated_price,
    })
}
