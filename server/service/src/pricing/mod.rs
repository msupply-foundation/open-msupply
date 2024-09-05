use crate::service_provider::ServiceContext;
use discount::{get_discount_for_item_and_name_link_id, ItemDiscountLookup};
use repository::{
    EqualFilter, MasterList, MasterListFilter, MasterListRepository, NameLinkRowRepository,
    RepositoryError, StorageConnection,
};

pub mod discount;

pub trait PricingServiceTrait: Sync + Send {
    fn get_discount_for_item_and_name_link_id(
        &self,
        ctx: &ServiceContext,
        input: ItemDiscountLookup,
    ) -> Result<f64, RepositoryError> {
        get_discount_for_item_and_name_link_id(ctx, input)
    }
}

pub struct PricingService {}
impl PricingServiceTrait for PricingService {}

fn get_default_price_list_for_store(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Option<MasterList>, RepositoryError> {
    let mut rows = MasterListRepository::new(connection).query_by_filter(
        MasterListFilter::new()
            .is_default_price_list(true)
            .exists_for_store_id(EqualFilter::equal_to(store_id)),
    )?;
    Ok(rows.pop())
}

fn get_discount_master_list_for_name_link_id(
    connection: &StorageConnection,
    name_link_id: &str,
) -> Result<Option<MasterList>, RepositoryError> {
    let Some(name_link) = NameLinkRowRepository::new(connection).find_one_by_id(name_link_id)?
    else {
        return Ok(None);
    };
    let mut rows = MasterListRepository::new(connection).query_by_filter(
        MasterListFilter::new()
            .is_discount_list(true)
            .exists_for_name_id(EqualFilter::equal_to(&name_link.name_id)),
    )?;

    // We'll always return the first discount list found, if there's more than one defined the system will use the first one
    Ok(rows.pop())
}

#[cfg(test)]
mod tests;
