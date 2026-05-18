use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{Clinician, ClinicianFilter, EqualFilter};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use crate::standard_graphql_error::StandardGraphqlError;

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct ClinicianLoaderInput {
    pub store_id: String,
    pub clinician_id: String,
}
impl ClinicianLoaderInput {
    pub fn new(store_id: &str, clinician_id: &str) -> Self {
        ClinicianLoaderInput {
            store_id: store_id.to_string(),
            clinician_id: clinician_id.to_string(),
        }
    }
}
pub struct ClinicianLoader {
    pub service_provider: Data<ServiceProvider>,
}

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
            let entry = store_map.entry(item.store_id.clone()).or_default();
            entry.push(item.clinician_id.clone())
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
                .map_err(|err| StandardGraphqlError::InternalError(format!("{err:?}")))?;
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
