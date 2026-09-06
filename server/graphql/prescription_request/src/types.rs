use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::loader::{
    AllowedCustomFieldKeysByScopeLoader, DiagnosisLoader, ItemLoader, PatientLoader,
    PrescriptionRequestLinesByRequestIdLoader, ProgramByIdLoader, UserLoader,
};
use graphql_core::ContextExt;
use graphql_types::types::program::{patient::PatientNode, program_node::ProgramNode};
use graphql_types::types::{
    filter_custom_fields, ClinicianNode, DiagnosisNode, ItemNode, UserNode,
};
use repository::{
    ClinicianRow, PrescriptionRequest, PrescriptionRequestLineRow, PrescriptionRequestRow,
};
use service::prescription_request::update::PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE;
use service::ListResult;

pub struct PrescriptionRequestNode {
    pub prescription_request: PrescriptionRequest,
}

#[derive(SimpleObject)]
pub struct PrescriptionRequestConnector {
    pub total_count: u32,
    pub nodes: Vec<PrescriptionRequestNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::prescription_request_row::PrescriptionRequestStatus")]
pub enum PrescriptionRequestNodeStatus {
    New,
    ReadyToDispense,
    Dispensed,
}

#[Object]
impl PrescriptionRequestNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn store_id(&self) -> &str {
        &self.row().store_id
    }
    pub async fn prescription_request_number(&self) -> i64 {
        self.row().prescription_request_number
    }
    pub async fn status(&self) -> PrescriptionRequestNodeStatus {
        PrescriptionRequestNodeStatus::from(self.row().status.clone())
    }
    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }
    pub async fn prescription_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().prescription_datetime, Utc)
    }
    pub async fn ready_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .ready_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn dispensed_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .dispensed_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn patient_id(&self) -> &str {
        &self.row().patient_id
    }
    /// Non-null: a request cannot exist without one. `patient_link_id` is NOT
    /// NULL with an FK, and the insert validates the id through the same
    /// PatientFilter the loader reads, so a miss here means the row is corrupt
    /// rather than the patient being absent — which is why it errors instead of
    /// answering null. Typed `Option` it could only ever have been Some or an
    /// error, which told the client the one thing that cannot happen.
    pub async fn patient(&self, ctx: &Context<'_>) -> Result<PatientNode> {
        let loader = ctx.get_loader::<DataLoader<PatientLoader>>();
        loader
            .load_one(self.row().patient_id.clone())
            .await?
            .map(|patient| PatientNode {
                store_id: self.row().store_id.clone(),
                allowed_ctx: vec![],
                patient,
            })
            .ok_or_else(|| Error::new(format!("Failed to load patient: {}", self.row().patient_id)))
    }

    /// The clinician the request names — resolved through `clinician_link`,
    /// so this is the clinician's own id and stays right across a merge. Null
    /// when none was chosen; distinct from `user`, which is who entered the
    /// request (spec/prescription-requests § who is recorded).
    pub async fn clinician_id(&self) -> Option<String> {
        self.clinician_row()
            .as_ref()
            .map(|clinician| clinician.id.clone())
    }
    pub async fn clinician(&self) -> Option<ClinicianNode> {
        self.clinician_row()
            .as_ref()
            .map(|clinician| ClinicianNode::from_domain(clinician.clone()))
    }

    pub async fn diagnosis_id(&self) -> &Option<String> {
        &self.row().diagnosis_id
    }
    pub async fn diagnosis(&self, ctx: &Context<'_>) -> Result<Option<DiagnosisNode>> {
        let Some(diagnosis_id) = &self.row().diagnosis_id else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<DiagnosisLoader>>();
        Ok(loader
            .load_one(diagnosis_id.to_string())
            .await?
            .map(DiagnosisNode::from_domain))
    }

    pub async fn program_id(&self) -> &Option<String> {
        &self.row().program_id
    }
    pub async fn program(&self, ctx: &Context<'_>) -> Result<Option<ProgramNode>> {
        let Some(program_id) = self.row().program_id.clone() else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<ProgramByIdLoader>>();
        Ok(loader
            .load_one(program_id)
            .await?
            .map(|program| ProgramNode {
                program_row: program,
            }))
    }

    /// The account that ENTERED the request. Never presented as the
    /// prescriber, and not the same fact as `clinician`
    /// (spec/prescription-requests § who is recorded).
    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();
        Ok(loader
            .load_one(self.row().created_by.clone())
            .await?
            .map(UserNode::from_domain))
    }

    /// Properties-v2 values, filtered to the keys visible for the
    /// "prescription_request" scope
    pub async fn custom_fields(&self, ctx: &Context<'_>) -> Result<Option<serde_json::Value>> {
        let Some(raw) = self.row().custom_fields.clone() else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<AllowedCustomFieldKeysByScopeLoader>>();
        let allowed_keys = loader
            .load_one(PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE.to_string())
            .await?
            .unwrap_or_default();
        Ok(Some(filter_custom_fields(raw, &allowed_keys)))
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<PrescriptionRequestLineConnector> {
        let loader = ctx.get_loader::<DataLoader<PrescriptionRequestLinesByRequestIdLoader>>();
        let lines = loader
            .load_one(self.row().id.clone())
            .await?
            .unwrap_or_default();
        Ok(PrescriptionRequestLineConnector::from_vec(lines))
    }
}

impl PrescriptionRequestNode {
    pub fn from_domain(prescription_request: PrescriptionRequest) -> PrescriptionRequestNode {
        PrescriptionRequestNode {
            prescription_request,
        }
    }

    pub fn row(&self) -> &PrescriptionRequestRow {
        &self.prescription_request.prescription_request_row
    }

    pub fn clinician_row(&self) -> &Option<ClinicianRow> {
        &self.prescription_request.clinician_row
    }
}

impl PrescriptionRequestConnector {
    pub fn from_domain(requests: ListResult<PrescriptionRequest>) -> PrescriptionRequestConnector {
        PrescriptionRequestConnector {
            total_count: requests.count,
            nodes: requests
                .rows
                .into_iter()
                .map(PrescriptionRequestNode::from_domain)
                .collect(),
        }
    }
}

pub struct PrescriptionRequestLineNode {
    pub line: PrescriptionRequestLineRow,
}

#[derive(SimpleObject)]
pub struct PrescriptionRequestLineConnector {
    pub total_count: u32,
    pub nodes: Vec<PrescriptionRequestLineNode>,
}

#[Object]
impl PrescriptionRequestLineNode {
    pub async fn id(&self) -> &str {
        &self.line.id
    }
    pub async fn prescription_request_id(&self) -> &str {
        &self.line.prescription_request_id
    }
    pub async fn item_id(&self) -> &str {
        &self.line.item_id
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<Option<ItemNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        Ok(loader
            .load_one(self.line.item_id.clone())
            .await?
            .map(ItemNode::from_domain))
    }
    /// Prescribed quantity, in units
    pub async fn number_of_units(&self) -> f64 {
        self.line.number_of_units
    }
    /// Directions
    pub async fn note(&self) -> &Option<String> {
        &self.line.note
    }
}

impl PrescriptionRequestLineNode {
    pub fn from_domain(line: PrescriptionRequestLineRow) -> PrescriptionRequestLineNode {
        PrescriptionRequestLineNode { line }
    }
}

impl PrescriptionRequestLineConnector {
    pub fn from_vec(lines: Vec<PrescriptionRequestLineRow>) -> PrescriptionRequestLineConnector {
        PrescriptionRequestLineConnector {
            total_count: lines.len() as u32,
            nodes: lines
                .into_iter()
                .map(PrescriptionRequestLineNode::from_domain)
                .collect(),
        }
    }
}
