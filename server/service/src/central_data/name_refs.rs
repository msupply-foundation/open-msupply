//! What the sheets that refer to a name by code, type or id share. The columns are shared by
//! `store`, `name_store_join` and `master_list_name_join`. `find_name` and `name_error` are shared
//! by the two join sheets, which never import a patient's or a system name's records; `store`
//! finds its name its own way, as its type defaults to STORE.
use super::{
    cells::{Row, RowError},
    lookup::{KeyPart, NamesOfType, SavedCode, active_first, differs, find_reference},
    name::type_label,
    name_with_code,
};
use repository::{NameRow, NameRowRepository, NameRowType, RepositoryError, StorageConnection};

pub(super) const NAME_CODE: &str = "name_code";
pub(super) const NAME_TYPE: &str = "name_type";
pub(super) const NAME_ID: &str = "name_id";
pub(super) const NAME_NAME: &str = "name_name";

/// As `find_reference`. `name_code` finds the name within `r#type`, or among every type when it's
/// blank. A code alone never finds a patient or a system name, and finds a live name before a
/// deleted one.
pub(super) fn find_name(
    connection: &StorageConnection,
    row: &Row,
    r#type: Option<NameRowType>,
) -> Result<Result<Option<Option<String>>, RowError>, RepositoryError> {
    let names = NamesOfType {
        repo: NameRowRepository::new(connection),
        r#type,
    };
    find_reference(&names, row, NAME_CODE, NAME_ID, |names| {
        let names = names
            .into_iter()
            .filter(|name| name.r#type != NameRowType::Patient && !name.is_system_name())
            .collect();
        active_first(names, |name| name.deleted_datetime.is_none())
    })
}

/// A patient or a system name, found by id or as the saved record's, or a name whose type isn't
/// the row's. `what` is what the sheet holds for a name, such as `which stores see`.
pub(super) fn name_error(
    row: &Row,
    name: &NameRow,
    r#type: Option<&NameRowType>,
    what: &str,
) -> Option<RowError> {
    let column = row.reference_column(NAME_CODE, NAME_ID);
    let label = name_with_code(&name.name, &name.code);
    if name.r#type == NameRowType::Patient {
        return Some(row.error(
            column,
            format!("{label} is a patient, so import doesn't change {what} a patient"),
        ));
    }
    if name.is_system_name() {
        return Some(row.error(
            column,
            format!(
                "{label} is a system name, as the server needs it, so import can't change {what} it"
            ),
        ));
    }
    match r#type {
        Some(r#type) if *r#type != name.r#type => Some(row.error(
            NAME_TYPE,
            format!(
                "{label} is of type {}, not {}",
                type_label(&name.r#type),
                type_label(r#type)
            ),
        )),
        _ => None,
    }
}

/// The name in a join's lookup key, for `key_conflict`, whose `describe` reads the saved join's
/// name. `given` is the row's.
pub(super) fn name_part<'a>(
    given: Option<&str>,
    saved_id: &'a str,
) -> KeyPart<'a, Option<NameRow>> {
    KeyPart {
        changed: differs(given, saved_id),
        code_column: NAME_CODE,
        id_column: NAME_ID,
        saved_id,
        saved_code: SavedCode::Read(|name| name.as_ref().map(|name| name.code.as_str())),
    }
}
