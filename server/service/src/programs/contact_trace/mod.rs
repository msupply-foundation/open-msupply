use repository::{
    contact_trace::{ContactTrace, ContactTraceFilter, ContactTraceSort},
    Document, PaginationOption,
};

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    ListError, ListResult,
};

use self::{
    query::contact_traces,
    upsert::{upsert_contact_trace, UpsertContactTrace, UpsertContactTraceError},
};

pub mod contact_trace_schema;
pub mod contact_trace_updated;
mod query;
mod upsert;

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

    fn upsert_contact_trace(
        &self,
        ctx: &ServiceContext,
        service_provider: &ServiceProvider,
        user_id: &str,
        input: UpsertContactTrace,
        allowed_ctx: Vec<String>,
    ) -> Result<Document, UpsertContactTraceError> {
        upsert_contact_trace(ctx, service_provider, user_id, input, allowed_ctx)
    }
}

pub struct ContactTraceService {}
impl ContactTraceServiceTrait for ContactTraceService {}
