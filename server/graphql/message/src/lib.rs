mod mutations;
use self::mutations::*;

use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::*;
use repository::PaginationOption;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Default, Clone)]
pub struct MessageQueries;

#[Object]
impl MessageQueries {
    /// Messages the active store sent or received, newest first.
    pub async fn messages(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<MessageFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<MessageSortInput>>,
    ) -> Result<MessagesResponse> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryMessage,
                store_id: Some(store_id.clone()),
                require_central_standalone: false,
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        let messages = service_provider
            .message_service
            .get_messages(
                &service_context,
                page.map(PaginationOption::from),
                filter.map(MessageFilterInput::to_domain),
                sort.and_then(|mut sort_list| sort_list.pop())
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(MessagesResponse::Response(MessageConnector::from_domain(
            messages, store_id,
        )))
    }

    /// Count of messages unread for the active store, over an optional filter
    /// (e.g. kind = GLOBAL for the dashboard panel, or a record id for a badge).
    pub async fn unread_message_count(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Filter option")] filter: Option<MessageFilterInput>,
    ) -> Result<i32> {
        let user = validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryMessage,
                store_id: Some(store_id.clone()),
                require_central_standalone: false,
            },
        )?;

        let service_provider = ctx.service_provider();
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;

        let count = service_provider
            .message_service
            .get_unread_message_count(
                &service_context,
                filter.map(MessageFilterInput::to_domain),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(count as i32)
    }
}

#[derive(Default, Clone)]
pub struct MessageMutations;

#[Object]
impl MessageMutations {
    async fn insert_message(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertMessageInput,
    ) -> Result<InsertMessageResponse> {
        insert_message(ctx, &store_id, input)
    }

    async fn reply_message(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: ReplyMessageInput,
    ) -> Result<InsertMessageResponse> {
        reply_message(ctx, &store_id, input)
    }

    async fn mark_message_read(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: MarkMessageReadInput,
    ) -> Result<MarkMessageReadResponse> {
        mark_message_read(ctx, &store_id, input)
    }
}
