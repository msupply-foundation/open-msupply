use crate::{
    service_provider::ServiceContext,
    sync_message::{
        insert::{insert_sync_message, InsertSyncMessageError, InsertSyncMessageInput},
        query::{get_sync_message, get_sync_messages},
    },
    ListError, ListResult,
};
use repository::{
    PaginationOption, RepositoryError, SyncMessageFilter, SyncMessageRow, SyncMessageSort,
};

pub mod insert;
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

    fn insert_sync_message(
        &self,
        ctx: &ServiceContext,
        input: InsertSyncMessageInput,
    ) -> Result<SyncMessageRow, InsertSyncMessageError> {
        insert_sync_message(ctx, input)
    }
}

pub struct SyncMessageService;
impl SyncMessageTrait for SyncMessageService {}
