use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use service::programs::patient::{CentralPatientRequestError, NameStoreJoin};

use super::ConnectionError;

pub struct NameStoreJoinNode {
    name_store_join: NameStoreJoin,
}

#[Object]
impl NameStoreJoinNode {
    pub async fn id(&self) -> &str {
        &self.name_store_join.id
    }

    pub async fn store_id(&self) -> &str {
        &self.name_store_join.store_id
    }

    pub async fn name_id(&self) -> &str {
        &self.name_store_join.name_id
    }
}

#[derive(Interface)]
#[graphql(name = "LinkPatientPatientToStoreErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum LinkPatientToStoreErrorInterface {
    ConnectionError(ConnectionError),
}

#[derive(SimpleObject)]
#[graphql(name = "LinkPatientPatientToStoreError")]
pub struct LinkPatientPatientToStoreError {
    pub error: LinkPatientToStoreErrorInterface,
}

#[derive(Union)]
pub enum LinkPatientToStoreResponse {
    Response(NameStoreJoinNode),
    Error(LinkPatientPatientToStoreError),
}

pub fn map_link_patient_to_store_result(
    result: Result<NameStoreJoin, CentralPatientRequestError>,
) -> Result<LinkPatientToStoreResponse> {
    match result {
        Ok(name_store_join) => Ok(LinkPatientToStoreResponse::Response(NameStoreJoinNode {
            name_store_join,
        })),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = match err {
                CentralPatientRequestError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                CentralPatientRequestError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                CentralPatientRequestError::ConnectionError(_) => {
                    return Ok(LinkPatientToStoreResponse::Error(
                        LinkPatientPatientToStoreError {
                            error: LinkPatientToStoreErrorInterface::ConnectionError(
                                ConnectionError,
                            ),
                        },
                    ))
                }
            };

            Err(graphql_error.extend())
        }
    }
}
