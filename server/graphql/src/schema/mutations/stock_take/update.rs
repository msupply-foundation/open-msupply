use crate::{
    schema::types::StockTakeLineNode,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use async_graphql::*;
use repository::StockTakeLine;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    stock_take::update::{
        UpdateStockTakeError as ServiceError, UpdateStockTakeInput as UpdateStockTake,
    },
};

use super::{StockTakeNode, StockTakeNodeStatus};

#[derive(InputObject)]
pub struct UpdateStockTakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: Option<StockTakeNodeStatus>,
}

#[derive(SimpleObject)]
pub struct UpdateStockTakeNode {
    pub stock_take: StockTakeNode,
}

pub struct SnapshotCountCurrentCountMismatch(Vec<StockTakeLine>);
#[Object]
impl SnapshotCountCurrentCountMismatch {
    pub async fn description(&self) -> &'static str {
        "Snapshot count doesn't match the current stock count"
    }

    pub async fn lines(&self) -> Vec<StockTakeLineNode> {
        self.0
            .iter()
            .map(|line| StockTakeLineNode { line: line.clone() })
            .collect()
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateStockTakeErrorInterface {
    SnapshotCountCurrentCountMismatch(SnapshotCountCurrentCountMismatch),
}

#[derive(SimpleObject)]
pub struct UpdateStockTakeError {
    pub error: UpdateStockTakeErrorInterface,
}

#[derive(Union)]
pub enum UpdateStockTakeResponse {
    Response(UpdateStockTakeNode),
    Error(UpdateStockTakeError),
}

pub fn update_stock_take(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateStockTakeInput,
) -> Result<UpdateStockTakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::UpdateStockTake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    let service = &service_provider.stock_take_service;
    match service.update_stock_take(&service_ctx, store_id, to_domain(input)) {
        Ok(stock_take) => Ok(UpdateStockTakeResponse::Response(UpdateStockTakeNode {
            stock_take: StockTakeNode { stock_take },
        })),
        Err(err) => Ok(UpdateStockTakeResponse::Error(UpdateStockTakeError {
            error: map_error(err)?,
        })),
    }
}

fn map_error(err: ServiceError) -> Result<UpdateStockTakeErrorInterface> {
    let formatted_error = format!("{:#?}", err);
    let graphql_error = match err {
        ServiceError::SnapshotCountCurrentCountMismatch(lines) => {
            return Ok(
                UpdateStockTakeErrorInterface::SnapshotCountCurrentCountMismatch(
                    SnapshotCountCurrentCountMismatch(lines),
                ),
            )
        }

        // standard gql errors:
        ServiceError::DatabaseError(err) => err.into(),
        ServiceError::InternalError(err) => StandardGraphqlError::InternalError(err),
        ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::StockTakeDoesNotExist => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::CannotEditFinalised => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::NoLines => StandardGraphqlError::BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}

fn to_domain(
    UpdateStockTakeInput {
        id,
        comment,
        description,
        status,
    }: UpdateStockTakeInput,
) -> UpdateStockTake {
    UpdateStockTake {
        id,
        comment,
        description,
        status: status.map(|s| s.to_domain()),
    }
}
