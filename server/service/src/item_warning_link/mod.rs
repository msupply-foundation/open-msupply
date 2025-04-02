use self::query::get_item_warning_link;

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use query::get_item_warning_links;
use repository::{ItemWarningLink, ItemWarningLinkFilter};

pub mod query;

pub trait ItemWarningLinkServiceTrait: Sync + Send {
    fn get_item_warning_link(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<ItemWarningLink, SingleRecordError> {
        get_item_warning_link(ctx, id)
    }

    fn get_item_warning_links(
        &self,
        ctx: &ServiceContext,

        filter: Option<ItemWarningLinkFilter>,
    ) -> Result<ListResult<ItemWarningLink>, ListError> {
        get_item_warning_links(ctx, filter)
    }
}

pub struct ItemWarningLinkService {}
impl ItemWarningLinkServiceTrait for ItemWarningLinkService {}

#[cfg(test)]
mod tests;
