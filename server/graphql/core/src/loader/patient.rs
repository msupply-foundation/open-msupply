use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::{EqualFilter, Patient, PatientFilter};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use crate::standard_graphql_error::StandardGraphqlError;

use super::IdPair;

#[derive(Clone)]
pub struct EmptyPayload;
pub type PatientLoaderInput = IdPair<EmptyPayload>;
impl PatientLoaderInput {
    pub fn new(store_id: &str, name_id: &str) -> Self {
        PatientLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: name_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}
pub struct PatientLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<PatientLoaderInput> for PatientLoader {
    type Value = Patient;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[PatientLoaderInput],
    ) -> Result<HashMap<PatientLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        // store_id -> Vec of name_id
        let mut store_name_map = HashMap::<String, Vec<String>>::new();
        for item in ids_with_store_id {
            let entry = store_name_map
                .entry(item.primary_id.clone())
                .or_insert(vec![]);
            entry.push(item.secondary_id.clone())
        }
        let mut output = HashMap::<PatientLoaderInput, Self::Value>::new();
        for (store_id, patient_ids) in store_name_map {
            let names = self
                .service_provider
                .patient_service
                .get_patients(
                    &service_context,
                    None, // TODO this needs to be ALL without limit
                    Some(PatientFilter::new().id(EqualFilter::equal_any(patient_ids))),
                    None,
                    None,
                )
                .map_err(|err| StandardGraphqlError::InternalError(format!("{:?}", err)))?;
            for name in names.rows {
                output.insert(PatientLoaderInput::new(&store_id, &name.id), name);
            }
        }
        Ok(output)
    }
}
