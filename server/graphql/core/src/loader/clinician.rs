use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{Clinician, ClinicianFilter, EqualFilter};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use crate::standard_graphql_error::StandardGraphqlError;

use super::IdPair;

#[derive(Clone)]
pub struct EmptyPayload;
pub type ClinicianLoaderInput = IdPair<EmptyPayload>;
impl ClinicianLoaderInput {
    pub fn new(store_id: &str, clinician_id: &str) -> Self {
        ClinicianLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: clinician_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}
pub struct ClinicianLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<ClinicianLoaderInput> for ClinicianLoader {
    type Value = Clinician;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[ClinicianLoaderInput],
    ) -> Result<HashMap<ClinicianLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        // store_id -> Vec of clinician_id
        let mut store_map = HashMap::<String, Vec<String>>::new();
        for item in ids_with_store_id {
            let entry = store_map.entry(item.primary_id.clone()).or_default();
            entry.push(item.secondary_id.clone())
        }
        let mut output = HashMap::<ClinicianLoaderInput, Self::Value>::new();
        for (store_id, clinician_ids) in store_map {
            let clinicians = self
                .service_provider
                .clinician_service
                .get_clinicians(
                    &service_context,
                    &store_id,
                    None, // TODO this needs to be ALL without limit
                    Some(ClinicianFilter::new().id(EqualFilter::equal_any(clinician_ids))),
                    None,
                )
                .map_err(|err| StandardGraphqlError::InternalError(format!("{:?}", err)))?;
            for clinician in clinicians.rows {
                output.insert(
                    ClinicianLoaderInput::new(&store_id, &clinician.id),
                    clinician,
                );
            }
        }
        Ok(output)
    }
}
