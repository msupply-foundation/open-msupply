use repository::{Name, NameFilter, NameSort, PaginationOption};
use update::{UpdateNameProperties, UpdateNamePropertiesError, update_name_properties};

use crate::{ListError, ListResult, service_provider::ServiceContext};

use self::query::get_names;

mod query;
pub mod update;
pub mod validate;

pub trait NameServiceTrait: Sync + Send {
    fn get_names(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        pagination: Option<PaginationOption>,
        filter: Option<NameFilter>,
        sort: Option<NameSort>,
    ) -> Result<ListResult<Name>, ListError> {
        get_names(ctx, store_id, pagination, filter, sort)
    }

    fn update_name_properties(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateNameProperties,
    ) -> Result<Name, UpdateNamePropertiesError> {
        update_name_properties(ctx, store_id, input)
    }
}

pub struct NameService {}
impl NameServiceTrait for NameService {}
