use repository::{
    contact_trace::{ContactTrace, ContactTraceFilter, ContactTraceSort},
    PaginationOption,
};

use crate::{service_provider::ServiceContext, ListError, ListResult};

use self::query::contact_traces;

mod query;

pub trait ContactTraceServiceTrait: Sync + Send {
    fn contact_traces(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<ContactTraceFilter>,
        sort: Option<ContactTraceSort>,
        allowed_ctx: Vec<String>,
    ) -> Result<ListResult<ContactTrace>, ListError> {
        contact_traces(ctx, pagination, filter, sort, allowed_ctx)
    }
}

pub struct ContactTraceService {}
impl ContactTraceServiceTrait for ContactTraceService {}
