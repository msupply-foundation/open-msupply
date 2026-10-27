use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{EqualFilter, Pagination, ProgramEnrolment, ProgramEnrolmentFilter};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct ProgramEnrolmentLoaderInput {
    pub patient_id: String,
    /// The program's id (not its context id: the two can differ).
    pub program_id: String,
    pub allowed_ctx: Vec<String>,
}
impl ProgramEnrolmentLoaderInput {
    pub fn new(patient_id: &str, program_id: &str, allowed_ctx: Vec<String>) -> Self {
        ProgramEnrolmentLoaderInput {
            patient_id: patient_id.to_string(),
            program_id: program_id.to_string(),
            allowed_ctx,
        }
    }
}
pub struct ProgramEnrolmentLoader {
    pub service_provider: Data<ServiceProvider>,
}

/// The loader is optimized for the use case of querying a list of encounters and then fetching the
/// matching program enrolments, i.e. there are:
/// - a few types of programs
/// - many patients
///
/// Thus the loader groups requests by program and does a DB query for each program.
impl Loader<ProgramEnrolmentLoaderInput> for ProgramEnrolmentLoader {
    type Value = ProgramEnrolment;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        inputs: &[ProgramEnrolmentLoaderInput],
    ) -> Result<HashMap<ProgramEnrolmentLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;

        // allowed_ctx -> Vec<(patient_id, program_id)>
        let mut map = HashMap::<Vec<String>, Vec<(String, String)>>::new();
        for item in inputs {
            let entry = map.entry(item.allowed_ctx.clone()).or_default();
            entry.push((item.patient_id.clone(), item.program_id.clone()))
        }
        let mut out = HashMap::<ProgramEnrolmentLoaderInput, Self::Value>::new();

        for (allowed_ctx, patient_program_list) in map.into_iter() {
            let program_to_patients_map = patient_program_list.into_iter().fold(
                HashMap::<String, Vec<String>>::new(),
                |mut prev, (patient_id, program_id)| {
                    let entry = prev.entry(program_id).or_default();
                    entry.push(patient_id);
                    prev
                },
            );
            for (program_id, patient_id) in program_to_patients_map {
                let entries = self
                    .service_provider
                    .program_enrolment_service
                    .program_enrolments(
                        &service_context,
                        Pagination::all(),
                        None,
                        Some(
                            ProgramEnrolmentFilter::new()
                                .program_id(EqualFilter::equal_to(program_id.to_owned()))
                                .patient_id(EqualFilter::equal_any(patient_id)),
                        ),
                        allowed_ctx.clone(),
                    )?;

                for program_enrolment in entries.into_iter() {
                    out.insert(
                        ProgramEnrolmentLoaderInput::new(
                            &program_enrolment.patient_row.id,
                            &program_id,
                            allowed_ctx.clone(),
                        ),
                        program_enrolment,
                    );
                }
            }
        }

        Ok(out)
    }
}
