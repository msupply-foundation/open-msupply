use util::constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE};

use crate::{DocumentRegistryCategory, DocumentRegistryRow};

use super::{
    context_program_a, mock_form_schema_simplified_enrolment, mock_form_schema_simplified_patient,
};

pub fn document_registry_a() -> DocumentRegistryRow {
    DocumentRegistryRow {
        id: "patient_id".to_string(),
        category: DocumentRegistryCategory::Patient,
        document_type: PATIENT_TYPE.to_string(),
        context_id: PATIENT_CONTEXT_ID.to_string(),
        name: None,
        form_schema_id: Some(mock_form_schema_simplified_patient().id.clone()),
        config: None,
    }
}

pub fn document_registry_b() -> DocumentRegistryRow {
    DocumentRegistryRow {
        id: "enrolment_registry_id".to_string(),
        category: DocumentRegistryCategory::ProgramEnrolment,
        document_type: "TestEnrolment".to_string(),
        context_id: context_program_a().id,
        name: None,
        form_schema_id: Some(mock_form_schema_simplified_enrolment().id.clone()),
        config: None,
    }
}

pub fn mock_document_registries() -> Vec<DocumentRegistryRow> {
    vec![document_registry_a(), document_registry_b()]
}
