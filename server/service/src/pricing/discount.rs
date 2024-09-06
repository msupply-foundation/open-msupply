use repository::RepositoryError;
use repository::{
    EqualFilter, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
    MasterListRepository,
};

use crate::service_provider::ServiceContext;

pub struct ItemDiscountLookup {
    pub item_id: String,
    pub name_link_id: String,
}

pub fn get_discount_for_item_and_name_link_id(
    ctx: &ServiceContext,
    input: ItemDiscountLookup,
) -> Result<f64, RepositoryError> {
    let master_list = MasterListRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListFilter::new()
                .exists_for_name_id(EqualFilter::equal_to(&input.name_link_id))
                .is_discount_list(true),
        )?
        .pop();

    let discount_master_list = match master_list {
        Some(master_list) => master_list,
        None => return Ok(0.0), // No discount list found, no discount
    };

    // Find if the item exists in the discount list
    let master_list_item_line = MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(&discount_master_list.id))
                .item_id(EqualFilter::equal_to(&input.item_id)),
        )?
        .pop();

    // If the line exists, return the discount
    match master_list_item_line {
        Some(_master_list_item_line) => {
            // We don't care what the line says as we get the discount from the master_list not the line
            // This just needs to check that the item is in the list
            return Ok(discount_master_list.discount_percentage.unwrap_or(0.0));
        }
        None => Ok(0.0),
    }
}
