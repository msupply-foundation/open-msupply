use repository::{Document, StorageConnection};

extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use super::{
    document_service::DocumentInsertError,
    patient::{patient_document_update::patient_document_updated, PATIENT_TYPE},
};

/// Callback called when the document has been updated
pub fn document_updated(
    con: &StorageConnection,
    store_id: &str,
    doc: &Document,
) -> Result<(), DocumentInsertError> {
    match doc.r#type.as_str() {
        PATIENT_TYPE => patient_document_updated(con, store_id, doc),
        _ => Ok(()),
    }
}
