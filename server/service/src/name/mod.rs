use repository::{Name, NameFilter, NameSort, PaginationOption};

use crate::{service_provider::ServiceContext, ListError, ListResult};

use self::query::get_names;

mod query;
// mod update;
// mod validate;
// pub use update::{UpdateName, UpdateNameError};

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

    // fn update_name_properties(
    //     &self,
    //     ctx: &ServiceContext,
    //     input: UpdateNameProperties,
    // ) -> Result<Name, UpdateNamePropertiesError> {
    //     update_name_properties(ctx, input)
    // }
}

pub struct NameService {}
impl NameServiceTrait for NameService {}
