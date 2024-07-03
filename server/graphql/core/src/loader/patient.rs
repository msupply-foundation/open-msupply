use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::{EqualFilter, Patient, PatientFilter};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

use crate::standard_graphql_error::StandardGraphqlError;

pub struct PatientLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[async_trait::async_trait]
impl Loader<String> for PatientLoader {
    type Value = Patient;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        patient_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let result = self
            .service_provider
            .patient_service
            .get_patients(
                &service_context,
                None,
                Some(PatientFilter::new().id(EqualFilter::equal_any(patient_ids.to_owned()))),
                None,
                None,
            )
            .map_err(StandardGraphqlError::from_repository_error)?
            .rows
            .into_iter()
            .map(|p| (p.id.clone(), p))
            .collect();

        Ok(result)
    }
}
