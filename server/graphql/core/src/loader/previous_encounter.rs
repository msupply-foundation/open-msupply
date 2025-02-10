use actix_web::web::Data;
use async_graphql::dataloader::*;
use chrono::NaiveDateTime;
use repository::{
    DatetimeFilter, Encounter, EncounterFilter, EncounterRepository, EncounterSort,
    EncounterSortField, EqualFilter, Pagination,
};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct PreviousEncounterLoader {
    pub service_provider: Data<ServiceProvider>,
}

#[derive(Clone, Eq, PartialEq, Hash)]
pub struct PreviousEncounterLoaderInput {
    pub encounter_id: String,
    pub patient_id: String,
    pub current_encounter_start_datetime: NaiveDateTime,
}

impl Loader<PreviousEncounterLoaderInput> for PreviousEncounterLoader {
    type Value = Encounter;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        inputs: &[PreviousEncounterLoaderInput],
    ) -> Result<HashMap<PreviousEncounterLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        let mut out = HashMap::<PreviousEncounterLoaderInput, Self::Value>::new();

        for input in inputs {
            let filter = EncounterFilter::new()
                .patient_id(EqualFilter::equal_to(&input.patient_id))
                .start_datetime(DatetimeFilter::before(
                    input.current_encounter_start_datetime,
                ));

            let encounter = EncounterRepository::new(&service_context.connection)
                .query(
                    Pagination::one(),
                    Some(filter),
                    Some(EncounterSort {
                        key: EncounterSortField::StartDatetime,
                        desc: Some(true),
                    }),
                )?
                .first()
                .map(|encounter| encounter.clone());

            match encounter {
                Some(encounter) => {
                    out.insert(input.clone(), encounter);
                }
                None => {}
            }
        }

        Ok(out)
    }
}
