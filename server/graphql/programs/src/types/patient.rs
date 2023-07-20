use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{Local, NaiveDate};
use graphql_core::loader::DocumentLoader;
use graphql_core::ContextExt;

use graphql_types::types::GenderType;
use repository::{EqualFilter, Pagination, Patient, ProgramEnrolmentFilter};
use service::programs::patient::main_patient_doc_name;

use crate::queries::ProgramEnrolmentFilterInput;
use crate::types::document::DocumentNode;
use crate::types::program_enrolment::ProgramEnrolmentNode;

pub struct PatientNode {
    pub store_id: String,
    pub patient: Patient,
    pub allowed_ctx: Vec<String>,
}

#[Object]
impl PatientNode {
    pub async fn id(&self) -> &str {
        &self.patient.id
    }

    pub async fn name(&self) -> &str {
        &self.patient.name
    }

    pub async fn code(&self) -> &str {
        &self.patient.code
    }

    pub async fn code_2(&self) -> &Option<String> {
        &self.patient.national_health_number
    }

    pub async fn first_name(&self) -> Option<String> {
        self.patient.first_name.clone()
    }

    pub async fn last_name(&self) -> Option<String> {
        self.patient.last_name.clone()
    }

    pub async fn gender(&self) -> Option<GenderType> {
        self.patient.gender.as_ref().map(GenderType::from_domain)
    }

    pub async fn date_of_birth(&self) -> Option<NaiveDate> {
        self.patient.date_of_birth.clone()
    }

    pub async fn age(&self) -> Option<i64> {
        self.patient.date_of_birth.clone().map(|dob| {
            let diff = Local::now().naive_utc().date().signed_duration_since(dob);
            diff.num_days() / 365
        })
    }

    pub async fn phone(&self) -> Option<String> {
        self.patient.phone.clone()
    }

    pub async fn country(&self) -> Option<String> {
        self.patient.country.clone()
    }

    pub async fn address1(&self) -> Option<String> {
        self.patient.address1.clone()
    }

    pub async fn address2(&self) -> Option<String> {
        self.patient.address2.clone()
    }

    pub async fn email(&self) -> Option<String> {
        self.patient.email.clone()
    }

    pub async fn website(&self) -> Option<String> {
        self.patient.website.clone()
    }

    pub async fn is_deceased(&self) -> bool {
        self.patient.is_deceased
    }

    pub async fn document(&self, ctx: &Context<'_>) -> Result<Option<DocumentNode>> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(main_patient_doc_name(&self.patient.id))
            .await?
            .map(|document| DocumentNode {
                document,
                allowed_ctx: self.allowed_ctx.clone(),
            });

        Ok(result)
    }

    pub async fn program_enrolments(
        &self,
        ctx: &Context<'_>,
        filter: Option<ProgramEnrolmentFilterInput>,
    ) -> Result<Vec<ProgramEnrolmentNode>> {
        let context = ctx.service_provider().basic_context()?;
        let filter = filter
            .map(|f| f.to_domain_filter())
            .unwrap_or(ProgramEnrolmentFilter::new())
            .patient_id(EqualFilter::equal_to(&self.patient.id));

        let entries = ctx
            .service_provider()
            .program_enrolment_service
            .program_enrolments(
                &context,
                Pagination::all(),
                None,
                Some(filter),
                self.allowed_ctx.clone(),
            )?;
        Ok(entries
            .into_iter()
            .map(|program_enrolment| ProgramEnrolmentNode {
                store_id: self.store_id.clone(),
                program_enrolment,
                allowed_ctx: self.allowed_ctx.clone(),
            })
            .collect())
    }
}
