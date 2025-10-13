use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, Local, NaiveDate, Utc};
use graphql_core::generic_filters::{DateFilterInput, EqualFilterStringInput, StringFilterInput};
use graphql_core::loader::{DocumentLoader, PatientLoader};
use graphql_core::{map_filter, ContextExt};

use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use repository::{
    DateFilter, EqualFilter, GenderType as GenderRepo, Pagination, PaginationOption, Patient,
    PatientFilter, ProgramEnrolmentFilter, StringFilter,
};
use serde::Serialize;
use service::programs::patient::main_patient_doc_name;
use service::programs::patient::patient_updated::patient_draft_document;
use service::usize_to_u32;

use crate::types::document::DocumentNode;
use crate::types::program_enrolment::ProgramEnrolmentNode;

use super::contact_trace::{
    ContactTraceConnector, ContactTraceFilterInput, ContactTraceNode, ContactTraceResponse,
    ContactTraceSortInput,
};
use super::program_enrolment::{
    ProgramEnrolmentConnector, ProgramEnrolmentFilterInput, ProgramEnrolmentResponse,
};

#[derive(InputObject, Clone)]
pub struct PatientFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub code: Option<StringFilterInput>,
    pub code_2: Option<StringFilterInput>,
    pub first_name: Option<StringFilterInput>,
    pub last_name: Option<StringFilterInput>,
    pub gender: Option<EqualFilterGenderType>,
    pub date_of_birth: Option<DateFilterInput>,
    pub phone: Option<StringFilterInput>,
    pub address1: Option<StringFilterInput>,
    pub address2: Option<StringFilterInput>,
    pub country: Option<StringFilterInput>,
    pub email: Option<StringFilterInput>,
    pub identifier: Option<StringFilterInput>,
    pub date_of_death: Option<DateFilterInput>,
    pub program_enrolment_name: Option<StringFilterInput>,
    pub next_of_kin_name: Option<StringFilterInput>,
}

impl From<PatientFilterInput> for PatientFilter {
    fn from(f: PatientFilterInput) -> Self {
        PatientFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
            code: f.code.map(StringFilter::from),
            code_2: f.code_2.map(StringFilter::from),
            first_name: f.first_name.map(StringFilter::from),
            last_name: f.last_name.map(StringFilter::from),
            gender: f.gender.map(|t| map_filter!(t, |g| GenderRepo::from(g))),
            date_of_birth: f.date_of_birth.map(DateFilter::from),
            phone: f.phone.map(StringFilter::from),
            address1: f.address1.map(StringFilter::from),
            address2: f.address2.map(StringFilter::from),
            country: f.country.map(StringFilter::from),
            email: f.email.map(StringFilter::from),
            identifier: f.identifier.map(StringFilter::from),
            date_of_death: f.date_of_death.map(DateFilter::from),
            program_enrolment_name: f.program_enrolment_name.map(StringFilter::from),
            next_of_kin_name: f.next_of_kin_name.map(StringFilter::from),
        }
    }
}

pub struct PatientNode {
    pub store_id: String,
    pub patient: Patient,
    pub allowed_ctx: Vec<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
#[graphql(remote = "repository::db_diesel::name_row::GenderType")]
pub enum GenderTypeNode {
    Female,
    Male,
    Transgender,
    TransgenderMale,
    TransgenderMaleHormone,
    TransgenderMaleSurgical,
    TransgenderFemale,
    TransgenderFemaleHormone,
    TransgenderFemaleSurgical,
    Unknown,
    NonBinary,
}
#[derive(InputObject, Clone)]
pub struct EqualFilterGenderType {
    pub equal_to: Option<GenderTypeNode>,
    pub equal_any: Option<Vec<GenderTypeNode>>,
    pub not_equal_to: Option<GenderTypeNode>,
    pub not_equal_all: Option<Vec<GenderTypeNode>>,
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

    pub async fn gender(&self) -> Option<GenderTypeNode> {
        Some(GenderTypeNode::from(
            self.patient.gender.clone().unwrap_or_default(),
        ))
    }

    pub async fn date_of_birth(&self) -> Option<NaiveDate> {
        self.patient.date_of_birth
    }

    pub async fn age(&self) -> Option<i64> {
        self.patient.date_of_birth.map(|dob| {
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

    pub async fn date_of_death(&self) -> Option<NaiveDate> {
        self.patient.date_of_death
    }

    pub async fn next_of_kin_id(&self) -> &Option<String> {
        &self.patient.next_of_kin_id
    }

    /// If a next of kin link exists, returns the name of the next of kin patient.
    /// Otherwise, this returns the plain text field, which allows for recording
    /// next of kin name where a patient record for the next of kin does not exist.
    pub async fn next_of_kin_name(&self, ctx: &Context<'_>) -> Result<Option<String>> {
        if self.patient.next_of_kin_id.is_none() {
            return Ok(self.patient.next_of_kin_name.clone());
        };

        let name = self.next_of_kin(ctx).await?.map(|p| p.patient.name);
        Ok(name)
    }

    pub async fn created_datetime(&self) -> Option<DateTime<Utc>> {
        self.patient.created_datetime.map(|created_datetime| {
            DateTime::<Utc>::from_naive_utc_and_offset(created_datetime, Utc)
        })
    }

    pub async fn next_of_kin(&self, ctx: &Context<'_>) -> Result<Option<PatientNode>> {
        let Some(next_of_kin_id) = &self.patient.next_of_kin_id else {
            return Ok(None);
        };

        let loader = ctx.get_loader::<DataLoader<PatientLoader>>();

        let result = loader
            .load_one(next_of_kin_id.to_owned())
            .await?
            .map(|patient| PatientNode {
                patient,
                allowed_ctx: self.allowed_ctx.clone(),
                store_id: self.store_id.clone(),
            });

        Ok(result)
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

    /// Returns a draft version of the document data.
    ///
    /// The draft version can differ from the current document data if a patient has been edited
    /// remotely in mSupply.
    /// In this case the draft version contains the mSupply patient changes, i.e. information from
    /// the name row has been integrated into the current document version.
    /// When editing a patient in omSupply the document draft version should be used.
    /// This means when the document is eventually saved, the remote changes are incorporated into
    /// the document data.
    pub async fn document_draft(&self, ctx: &Context<'_>) -> Result<Option<serde_json::Value>> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(main_patient_doc_name(&self.patient.id))
            .await?;
        let Some(document_data) = result.map(|d| d.data) else {
            return Ok(None);
        };

        let document_data = serde_json::from_value(document_data)
            .map_err(|e| StandardGraphqlError::from_error(&e))?;
        let draft = patient_draft_document(&self.patient, document_data);
        let draft = serde_json::to_value(draft)
            .map_err(|e| StandardGraphqlError::InternalError(format!("{}", e)).extend())?;
        Ok(Some(draft))
    }

    pub async fn program_enrolments(
        &self,
        ctx: &Context<'_>,
        filter: Option<ProgramEnrolmentFilterInput>,
    ) -> Result<ProgramEnrolmentResponse> {
        let context = ctx.service_provider().basic_context()?;
        let filter = filter
            .map(ProgramEnrolmentFilter::from)
            .unwrap_or_default()
            .patient_id(EqualFilter::equal_to(&self.patient.id));

        let nodes: Vec<_> = ctx
            .service_provider()
            .program_enrolment_service
            .program_enrolments(
                &context,
                Pagination::all(),
                None,
                Some(filter),
                self.allowed_ctx.clone(),
            )?
            .into_iter()
            .map(|program_row| ProgramEnrolmentNode {
                store_id: self.store_id.clone(),
                program_enrolment: program_row,
                allowed_ctx: self.allowed_ctx.clone(),
            })
            .collect();
        Ok(ProgramEnrolmentResponse::Response(
            ProgramEnrolmentConnector {
                total_count: usize_to_u32(nodes.len()),
                nodes,
            },
        ))
    }

    pub async fn contact_traces(
        &self,
        ctx: &Context<'_>,
        page: Option<PaginationInput>,
        filter: Option<ContactTraceFilterInput>,
        sort: Option<ContactTraceSortInput>,
    ) -> Result<ContactTraceResponse> {
        let service_provider = ctx.service_provider();
        let context = service_provider.basic_context()?;

        let mut filter = filter.map(|f| f.to_domain_filter()).unwrap_or_default();
        filter.patient_id = Some(EqualFilter::equal_to(&self.patient.id));
        let result = service_provider
            .contact_trace_service
            .contact_traces(
                &context,
                page.map(PaginationOption::from),
                Some(filter),
                sort.map(ContactTraceSortInput::to_domain),
                self.allowed_ctx.clone(),
            )
            .map_err(StandardGraphqlError::from_list_error)?;
        let nodes = result
            .rows
            .into_iter()
            .map(|encounter| ContactTraceNode {
                store_id: self.store_id.clone(),
                contact_trace: encounter,
                allowed_ctx: self.allowed_ctx.clone(),
            })
            .collect();

        Ok(ContactTraceResponse::Response(ContactTraceConnector {
            total_count: result.count,
            nodes,
        }))
    }
}
