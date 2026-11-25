use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    simple_generic_errors::ConnectionError, standard_graphql_error::StandardGraphqlError,
};
use graphql_types::types::patient::GenderTypeNode;
use service::{
    apis::patient_v4::PatientV4,
    programs::patient::{CentralPatientRequestError, CentralPatientSearch},
    usize_to_u32,
};

#[derive(InputObject, Clone)]
pub struct CentralPatientSearchInput {
    /// Patient code: the start of the code or code 2, ignoring case. Exactly
    /// the code on legacy mSupply.
    code: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    /// An exact date of birth
    date_of_birth: Option<NaiveDate>,
    /// The earliest date of birth, for a year or a month (not on legacy mSupply)
    date_of_birth_from: Option<NaiveDate>,
    /// The latest date of birth, for a year or a month (not on legacy mSupply)
    date_of_birth_to: Option<NaiveDate>,
    /// Max number of returned patients, in name order. There's no total: ask
    /// for one more than you show to know whether there are more. Not on
    /// legacy mSupply, which returns every match.
    first: Option<u32>,
    /// First returned patient is at this position in the name order
    offset: Option<u32>,
}

#[derive(SimpleObject)]
pub struct CentralPatientSearchConnector {
    pub total_count: u32,
    pub nodes: Vec<CentralPatientNode>,
}

#[derive(Interface)]
#[graphql(name = "CentralPatientSearchErrorInterface")]
#[graphql(field(name = "description", ty = "&str"))]
pub enum CentralPatientSearchErrorInterface {
    ConnectionError(ConnectionError),
    CentralServerNoAnswer(CentralServerNoAnswer),
}

/// Reached the central server, but it didn't answer the search in time
pub struct CentralServerNoAnswer;
#[Object]
impl CentralServerNoAnswer {
    pub async fn description(&self) -> &str {
        "The central server didn't answer in time"
    }
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

    pub async fn code_2(&self) -> Option<&str> {
        self.patient.code_2.as_deref()
    }

    pub async fn first_name(&self) -> &str {
        &self.patient.first
    }

    pub async fn last_name(&self) -> &str {
        &self.patient.last
    }

    pub async fn date_of_birth(&self) -> Option<NaiveDate> {
        self.patient.date_of_birth
    }

    pub async fn gender(&self) -> Option<GenderTypeNode> {
        self.patient.gender.clone().map(GenderTypeNode::from)
    }

    pub async fn is_deceased(&self) -> bool {
        self.patient.is_deceased
    }

    pub async fn phone(&self) -> Option<&str> {
        Some(self.patient.phone.as_str()).filter(|phone| !phone.is_empty())
    }

    /// Not filled by legacy mSupply or an older central
    pub async fn address1(&self) -> Option<&str> {
        self.patient.address1.as_deref()
    }

    /// Not filled by legacy mSupply or an older central
    pub async fn next_of_kin_name(&self) -> Option<&str> {
        self.patient.next_of_kin_name.as_deref()
    }
}

pub fn map_central_patient_search_result(
    result: Result<Vec<PatientV4>, CentralPatientRequestError>,
) -> Result<CentralPatientSearchResponse> {
    let result = match result {
        Ok(result) => Ok(result),
        Err(err) => {
            let formatted_error = format!("{err:#?}");
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
                    ));
                }
                CentralPatientRequestError::NoAnswer(_) => {
                    return Ok(CentralPatientSearchResponse::Error(
                        CentralPatientSearchError {
                            error: CentralPatientSearchErrorInterface::CentralServerNoAnswer(
                                CentralServerNoAnswer,
                            ),
                        },
                    ));
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
    pub fn to_domain(self) -> CentralPatientSearch {
        CentralPatientSearch {
            code: self.code,
            first_name: self.first_name,
            last_name: self.last_name,
            date_of_birth: self.date_of_birth,
            date_of_birth_from: self.date_of_birth_from,
            date_of_birth_to: self.date_of_birth_to,
            limit: self.first,
            offset: self.offset,
        }
    }
}
