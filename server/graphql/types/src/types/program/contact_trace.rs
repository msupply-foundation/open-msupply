use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Local, NaiveDate, Utc};
use graphql_core::{
    generic_filters::{
        DateFilterInput, DatetimeFilterInput, EqualFilterStringInput, StringFilterInput,
    },
    loader::{
        DocumentByIdLoader, PatientLoader, ProgramEnrolmentLoader, ProgramEnrolmentLoaderInput,
    },
    map_filter, ContextExt,
};
use repository::{
    contact_trace::{ContactTrace, ContactTraceFilter, ContactTraceSort, ContactTraceSortField},
    contact_trace_row::ContactTraceRow,
    DateFilter, DatetimeFilter, EqualFilter, ProgramRow, StringFilter,
};

use crate::types::{EqualFilterGenderInput, GenderInput, GenderType, ProgramNode};

use super::{
    document::DocumentNode, patient::PatientNode, program_enrolment::ProgramEnrolmentNode,
};

pub struct ContactTraceNode {
    pub store_id: String,
    pub contact_trace: ContactTrace,
    pub allowed_ctx: Vec<String>,
}

#[derive(SimpleObject)]
pub struct ContactTraceConnector {
    pub total_count: u32,
    pub nodes: Vec<ContactTraceNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ContactTraceSortFieldInput {
    Datetime,
    PatientId,
    ProgramId,
    ContactTraceId,
    FirstName,
    LastName,
    DateOfBirth,
    Gender,
}

#[derive(InputObject)]
pub struct ContactTraceSortInput {
    /// Sort query result by `key`
    key: ContactTraceSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl ContactTraceSortInput {
    pub fn to_domain(self) -> ContactTraceSort {
        let key = match self.key {
            ContactTraceSortFieldInput::Datetime => ContactTraceSortField::Datetime,
            ContactTraceSortFieldInput::PatientId => ContactTraceSortField::PatientId,
            ContactTraceSortFieldInput::ProgramId => ContactTraceSortField::ProgramId,
            ContactTraceSortFieldInput::ContactTraceId => ContactTraceSortField::ContactTraceId,
            ContactTraceSortFieldInput::FirstName => ContactTraceSortField::FirstName,
            ContactTraceSortFieldInput::LastName => ContactTraceSortField::LastName,
            ContactTraceSortFieldInput::DateOfBirth => ContactTraceSortField::DateOfBirth,
            ContactTraceSortFieldInput::Gender => ContactTraceSortField::Gender,
        };

        ContactTraceSort {
            key,
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct ContactTraceFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub program_id: Option<EqualFilterStringInput>,
    pub r#type: Option<StringFilterInput>,
    pub document_name: Option<StringFilterInput>,
    pub datetime: Option<DatetimeFilterInput>,
    pub patient_id: Option<EqualFilterStringInput>,
    pub contact_patient_id: Option<EqualFilterStringInput>,
    pub contact_trace_id: Option<StringFilterInput>,
    pub first_name: Option<StringFilterInput>,
    pub last_name: Option<StringFilterInput>,
    pub gender: Option<EqualFilterGenderInput>,
    pub date_of_birth: Option<DateFilterInput>,
}

impl ContactTraceFilterInput {
    pub fn to_domain_filter(self) -> ContactTraceFilter {
        let ContactTraceFilterInput {
            id,
            program_id,
            r#type,
            document_name,
            datetime,
            patient_id,
            contact_patient_id,
            contact_trace_id,
            first_name,
            last_name,
            gender,
            date_of_birth,
        } = self;
        ContactTraceFilter {
            id: id.map(EqualFilter::from),
            contact_patient_id: contact_patient_id.map(EqualFilter::from),
            program_id: program_id.map(EqualFilter::from),
            r#type: r#type.map(StringFilter::from),
            document_name: document_name.map(StringFilter::from),
            datetime: datetime.map(DatetimeFilter::from),
            contact_trace_id: contact_trace_id.map(StringFilter::from),
            first_name: first_name.map(StringFilter::from),
            last_name: last_name.map(StringFilter::from),
            patient_id: patient_id.map(EqualFilter::from),
            program_context_id: None,
            gender: gender.map(|t| map_filter!(t, GenderInput::to_domain)),
            date_of_birth: date_of_birth.map(DateFilter::from),
        }
    }
}

impl ContactTraceNode {
    fn trace_row(&self) -> &ContactTraceRow {
        &self.contact_trace.contact_trace
    }

    fn program_row(&self) -> &ProgramRow {
        &self.contact_trace.program
    }
}

#[Object]
impl ContactTraceNode {
    pub async fn id(&self) -> &str {
        &self.trace_row().id
    }

    pub async fn store_id(&self) -> Option<String> {
        self.trace_row().store_id.clone()
    }

    pub async fn program_id(&self) -> &str {
        &self.trace_row().program_id
    }

    pub async fn program(&self) -> ProgramNode {
        ProgramNode {
            program_row: self.program_row().clone(),
        }
    }

    pub async fn document_id(&self) -> &str {
        &self.trace_row().document_id
    }

    pub async fn contact_trace_id(&self) -> Option<String> {
        self.trace_row().contact_trace_id.clone()
    }

    pub async fn patient_id(&self) -> &str {
        &self.trace_row().patient_id
    }

    pub async fn patient(&self, ctx: &Context<'_>) -> Result<PatientNode> {
        let loader = ctx.get_loader::<DataLoader<PatientLoader>>();

        let result = loader
            .load_one(self.trace_row().patient_id.clone())
            .await?
            .map(|patient| PatientNode {
                store_id: self.store_id.clone(),
                allowed_ctx: self.allowed_ctx.clone(),
                patient,
            })
            .ok_or(Error::new("Contact trace without patient"))?;

        Ok(result)
    }

    pub async fn contact_patient_id(&self) -> Option<String> {
        self.trace_row().contact_patient_id.clone()
    }

    pub async fn contact_patient(&self, ctx: &Context<'_>) -> Result<Option<PatientNode>> {
        let Some(ref contact_patient_id) = self.trace_row().contact_patient_id else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<PatientLoader>>();

        let result = loader
            .load_one(contact_patient_id.clone())
            .await?
            .map(|patient| PatientNode {
                store_id: self.store_id.clone(),
                allowed_ctx: self.allowed_ctx.clone(),
                patient,
            })
            .ok_or(Error::new("Contact without patient"))?;

        Ok(Some(result))
    }

    /// Returns the matching program enrolment for the root patient of this contact trace
    pub async fn program_enrolment(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<ProgramEnrolmentNode>> {
        let loader = ctx.get_loader::<DataLoader<ProgramEnrolmentLoader>>();

        let result = loader
            .load_one(ProgramEnrolmentLoaderInput::new(
                &self.trace_row().patient_id,
                &self.trace_row().program_id,
                self.allowed_ctx.clone(),
            ))
            .await?
            .map(|program_enrolment| ProgramEnrolmentNode {
                store_id: self.store_id.clone(),
                program_enrolment,
                allowed_ctx: self.allowed_ctx.clone(),
            })
            .ok_or(Error::new(format!(
                "Failed to load program enrolment: {}",
                self.trace_row().program_id
            )))?;

        Ok(Some(result))
    }

    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.trace_row().datetime, Utc)
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentByIdLoader>>();

        let result = loader
            .load_one(self.trace_row().document_id.clone())
            .await?
            .map(|document| DocumentNode {
                allowed_ctx: self.allowed_ctx.clone(),
                document,
            })
            .ok_or(Error::new("Missing contact trace document"))?;

        Ok(result)
    }

    pub async fn first_name(&self) -> Option<String> {
        self.trace_row().first_name.clone()
    }

    pub async fn last_name(&self) -> Option<String> {
        self.trace_row().last_name.clone()
    }

    pub async fn gender(&self) -> Option<GenderType> {
        self.trace_row()
            .gender
            .as_ref()
            .map(GenderType::from_domain)
    }

    pub async fn date_of_birth(&self) -> Option<NaiveDate> {
        self.trace_row().date_of_birth.clone()
    }

    pub async fn age(&self) -> Option<i64> {
        self.trace_row().date_of_birth.clone().map(|dob| {
            let diff = Local::now().naive_utc().date().signed_duration_since(dob);
            diff.num_days() / 365
        })
    }

    /// Relationship between the patient and the contact, e.g. mother, next of kin, etc.  

    pub async fn relationship(&self) -> Option<String> {
        self.trace_row().relationship.clone()
    }
}

#[derive(Union)]
pub enum ContactTraceResponse {
    Response(ContactTraceConnector),
}
