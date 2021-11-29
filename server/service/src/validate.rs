use crate::current_store_id;

pub struct RecordDoesNotBelongToCurrentStore;

pub fn check_record_belongs_to_current_store(
    store_id: &str,
) -> Result<(), RecordDoesNotBelongToCurrentStore> {
    if store_id == &current_store_id() {
        Ok(())
    } else {
        Err(RecordDoesNotBelongToCurrentStore)
    }
}
