use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    simple_generic_errors::ConnectionError, standard_graphql_error::StandardGraphqlError,
};
use service::{
    apis::patient_v4::PatientV4,
    programs::patient::{CentralPatientRequestError, PatientSearch},
    usize_to_u32,
};

#[derive(InputObject, Clone)]
pub struct CentralPatientSearchInput {
    /// Patient code
    code: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    date_of_birth: Option<NaiveDate>,
}

#[derive(SimpleObject)]
pub struct CentralPatientSearchConnector {
    pub total_count: u32,
    pub nodes: Vec<CentralPatientNode>,
}

#[derive(Interface)]
#[graphql(name = "CentralPatientSearchErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum CentralPatientSearchErrorInterface {
    ConnectionError(ConnectionError),
}

#[derive(SimpleObject)]
#[graphql(name = "CentralPatientSearchError")]
pub struct CentralPatientSearchError {
    pub error: CentralPatientSearchErrorInterface,
}

#[derive(Union)]
pub enum CentralPatientSearchResponse {
    Response(CentralPatientSearchConnector),
    Error(CentralPatientSearchError),
}

pub struct CentralPatientNode {
    patient: PatientV4,
}

#[Object]
impl CentralPatientNode {
    pub async fn id(&self) -> &str {
        &self.patient.id
    }

    pub async fn code(&self) -> &str {
        &self.patient.code
    }

    pub async fn first_name(&self) -> &str {
        &self.patient.first
    }

    pub async fn last_name(&self) -> &str {
        &self.patient.last
    }

    pub async fn date_of_birth(&self) -> Option<NaiveDate> {
        self.patient.date_of_birth.clone()
    }
}

pub fn map_central_patient_search_result(
    result: Result<Vec<PatientV4>, CentralPatientRequestError>,
) -> Result<CentralPatientSearchResponse> {
    let result = match result {
        Ok(result) => Ok(result),
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
                    return Ok(CentralPatientSearchResponse::Error(
                        CentralPatientSearchError {
                            error: CentralPatientSearchErrorInterface::ConnectionError(
                                ConnectionError,
                            ),
                        },
                    ))
                }
            };

            Err(graphql_error.extend())
        }
    }?;
    let result: Vec<CentralPatientNode> = result
        .into_iter()
        .map(|patient| CentralPatientNode { patient })
        .collect();

    Ok(CentralPatientSearchResponse::Response(
        CentralPatientSearchConnector {
            total_count: usize_to_u32(result.len()),
            nodes: result,
        },
    ))
}

impl CentralPatientSearchInput {
    pub fn to_domain(self) -> PatientSearch {
        PatientSearch {
            code: self.code,
            code_2: None,
            first_name: self.first_name,
            last_name: self.last_name,
            date_of_birth: self.date_of_birth,
            gender: None,
            identifier: None,
        }
    }
}
