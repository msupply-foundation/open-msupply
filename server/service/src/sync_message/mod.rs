use crate::{
    service_provider::ServiceContext,
    sync_message::query::{get_sync_message, get_sync_messages},
    ListError, ListResult,
};
use repository::{
    PaginationOption, RepositoryError, SyncMessageFilter, SyncMessageRow, SyncMessageSort,
};

pub mod query;

pub trait SyncMessageTrait: Sync + Send {
    fn get_sync_message(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<Option<SyncMessageRow>, RepositoryError> {
        get_sync_message(ctx, id)
    }

    fn get_sync_messages(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<SyncMessageFilter>,
        sort: Option<SyncMessageSort>,
    ) -> Result<ListResult<SyncMessageRow>, ListError> {
        get_sync_messages(ctx, pagination, filter, sort)
    }
}

pub struct SyncMessageService;
impl SyncMessageTrait for SyncMessageService {}
