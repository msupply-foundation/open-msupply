use super::common::{can_create_inbound_invoice, generate_and_integrate_linked_invoice};
use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};
pub struct CreateInvoiceProcessor {}

impl ProcessRecord for CreateInvoiceProcessor {
    fn name(&self) -> String {
        "Create linked invoice (not linking source invoice)".to_string()
    }

    fn can_execute(&self, record_for_processing: &RecordForProcessing) -> bool {
        if let Record::InvoiceRow(source_invoice) = &record_for_processing.record {
            if !can_create_inbound_invoice(&source_invoice, record_for_processing) {
                return false;
            }

            if record_for_processing.is_active_record_on_site {
                return false;
            }

            return true;
        }

        false
    }

    fn process_record(
        &self,
        connection: &repository::StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError> {
        let result = if let Record::InvoiceRow(source) = &record_for_processing.record {
            let (invoice_row, invoice_line_rows) =
                generate_and_integrate_linked_invoice(connection, &source, record_for_processing)?;

            ProcessRecordResult::Success(format!(
                "generated: {:#?}\n{:#?}\nfrom {:#?}",
                invoice_row, invoice_line_rows, record_for_processing
            ))
        } else {
            ProcessRecordResult::ConditionNotMet
        };

        Ok(result)
    }
}
