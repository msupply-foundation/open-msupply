use util::constants::{PATIENT_CONTEXT_ID, PATIENT_TYPE};

use crate::{DocumentRegistryCategory, DocumentRegistryRow};

use super::mock_form_schema_simplified_patient;

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

pub fn mock_document_registries() -> Vec<DocumentRegistryRow> {
    vec![document_registry_a()]
}
