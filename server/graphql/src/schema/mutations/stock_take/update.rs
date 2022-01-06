use crate::{
    schema::types::StockTakeLineNode, standard_graphql_error::StandardGraphqlError, ContextExt,
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
) -> Result<UpdateStockTakeResponse, StandardGraphqlError> {
    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;

    service_provider.validation_service.validate(
        &service_ctx,
        ctx.get_auth_data(),
        &ctx.get_auth_token(),
        &ResourceAccessRequest {
            resource: Resource::UpdateStockTake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service = &service_provider.stock_take_service;
    match service.update_stock_take(&service_ctx, store_id, to_domain(input)) {
        Ok(stock_take) => Ok(UpdateStockTakeResponse::Response(UpdateStockTakeNode {
            stock_take: StockTakeNode { stock_take },
        })),
        Err(err) => {
            let error = match err {
                ServiceError::DatabaseError(err) => Err(err.into()),
                ServiceError::InternalError(err) => Err(StandardGraphqlError::InternalError(err)),
                ServiceError::InvalidStore => {
                    Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
                }
                ServiceError::StockTakeDoesNotExist => {
                    Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
                }
                ServiceError::CannotEditFinalised => {
                    Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
                }
                ServiceError::NoLines => {
                    Err(StandardGraphqlError::BadUserInput(format!("{:?}", err)))
                }
                ServiceError::SnapshotCountCurrentCountMismatch(lines) => Ok(
                    UpdateStockTakeErrorInterface::SnapshotCountCurrentCountMismatch(
                        SnapshotCountCurrentCountMismatch(lines),
                    ),
                ),
            }?;
            Ok(UpdateStockTakeResponse::Error(UpdateStockTakeError {
                error,
            }))
        }
    }
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
