//! What the sheets that refer to a master list share: `master_list_line` and
//! `master_list_name_join`. Neither exports or imports the placeholder master list's records, as
//! the server needs it as it is.
use super::{
    cells::{Row, RowError},
    lookup::{InMemory, KeyPart, NOT_FOUND, active_first, differs, find_reference},
};
use repository::{
    EqualFilter, MasterListRow, MasterListRowRepository, RepositoryError, StorageConnection,
};
use util::constants::MISSING_PROGRAM;

pub(super) const MASTER_LIST_NAME: &str = "master_list_name";
pub(super) const MASTER_LIST_ID: &str = "master_list_id";

/// Every master list, read once: far fewer than the records that refer to them, and unchanged
/// while a sheet runs.
pub(super) fn read_master_lists(
    connection: &StorageConnection,
) -> Result<InMemory<MasterListRow>, RepositoryError> {
    Ok(InMemory::new(
        MasterListRowRepository::new(connection).find_all()?,
    ))
}

/// As `find_reference`: by name, among active master lists first, or by id.
pub(super) fn find_master_list(
    master_lists: &InMemory<MasterListRow>,
    row: &Row,
) -> Result<Result<Option<Option<String>>, RowError>, RepositoryError> {
    find_reference(
        master_lists,
        row,
        MASTER_LIST_NAME,
        MASTER_LIST_ID,
        |master_lists| active_first(master_lists, |master_list| master_list.is_active),
    )
}

/// Refuses a row on the placeholder master list: its record's, else the one the row found. `what`
/// is what the row would change, such as `its items`.
pub(super) fn check_not_placeholder(
    row: &Row,
    saved: Option<&str>,
    found: Option<&str>,
    what: &str,
) -> Result<(), RowError> {
    if saved.or(found) == Some(MISSING_PROGRAM) {
        return Err(protected_error(row, what));
    }
    Ok(())
}

/// On the column the row found the master list by. `what` is as for `check_not_placeholder`.
pub(super) fn protected_error(row: &Row, what: &str) -> RowError {
    row.error(
        row.reference_column(MASTER_LIST_NAME, MASTER_LIST_ID),
        format!(
            "{MISSING_PROGRAM} is protected, as the server needs it, so import can't change {what}"
        ),
    )
}

/// On the column the row found the master list by.
pub(super) fn not_found_error(row: &Row) -> RowError {
    row.error(
        row.reference_column(MASTER_LIST_NAME, MASTER_LIST_ID),
        NOT_FOUND,
    )
}

/// For an export's filter: not the placeholder master list's records.
pub(super) fn not_placeholder() -> Option<EqualFilter<String>> {
    Some(EqualFilter {
        not_equal_to: Some(MISSING_PROGRAM.to_string()),
        ..Default::default()
    })
}

/// The master list in a record's lookup key, for `key_conflict`. `given` is the row's.
pub(super) fn master_list_part<'a, D>(
    master_lists: &'a InMemory<MasterListRow>,
    given: Option<&str>,
    saved_id: &'a str,
) -> KeyPart<'a, D> {
    KeyPart::in_memory(
        master_lists,
        differs(given, saved_id),
        MASTER_LIST_NAME,
        MASTER_LIST_ID,
        saved_id,
    )
}
