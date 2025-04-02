use self::query::{get_warning, get_warnings};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::{Warning, WarningFilter};

pub mod query;

pub trait WarningServiceTrait: Sync + Send {
    fn get_warnings(
        &self,
        ctx: &ServiceContext,

        filter: Option<WarningFilter>,
    ) -> Result<ListResult<Warning>, ListError> {
        get_warnings(ctx, filter)
    }

    fn get_warning(&self, ctx: &ServiceContext, id: String) -> Result<Warning, SingleRecordError> {
        get_warning(ctx, id)
    }
}

pub struct WarningService {}
impl WarningServiceTrait for WarningService {}

#[cfg(test)]
mod tests;
