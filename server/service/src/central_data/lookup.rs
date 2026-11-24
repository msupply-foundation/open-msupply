use super::cells::{Row, RowError};
use repository::{
    ContextRow, ContextRowRepository, CurrencyRow, CurrencyRowRepository, ItemRow,
    ItemRowRepository, LocationTypeRow, LocationTypeRowRepository, MasterListRow,
    MasterListRowRepository, NameRow, NameRowRepository, NameRowType, RepositoryError,
    StorageConnection, StoreRow, StoreRowRepository, UnitRow, UnitRowRepository, UserAccountRow,
    UserAccountRowRepository, trim_spaces,
};
use std::collections::HashMap;

/// A record a row finds by id or by a lookup key, such as a code or name.
pub trait Keyed {
    fn id(&self) -> &str;
    fn key(&self) -> &str;
    /// Whether keys match in any letter case, as unit names and usernames do.
    const ANY_CASE: bool = false;
}

/// By name, in any letter case.
impl Keyed for UnitRow {
    const ANY_CASE: bool = true;
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.name
    }
}

impl Keyed for LocationTypeRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.code
    }
}

impl Keyed for CurrencyRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.code
    }
}

impl Keyed for ItemRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.code
    }
}

/// By name, as legacy master lists often have no code.
impl Keyed for MasterListRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.name
    }
}

/// By username, in any letter case, as login matches it.
impl Keyed for UserAccountRow {
    const ANY_CASE: bool = true;
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.username
    }
}

impl Keyed for StoreRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.code
    }
}

/// By code, with its type ([`NamesOfType`]).
impl Keyed for NameRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.code
    }
}

/// By name, the program's.
impl Keyed for ContextRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.name
    }
}

/// `record`'s key, such as its code, for a message; `id` when there's no record.
pub fn key_or<'a, R: Keyed>(record: Option<&'a R>, id: &'a str) -> &'a str {
    record.map_or(id, R::key)
}

/// A table a row finds records in, by id or by their key.
pub trait KeyedTable {
    type Record: Keyed;
    fn find_by_id(&self, id: &str) -> Result<Option<Self::Record>, RepositoryError>;
    /// Spaces around either key don't count. Letter case does, unless the record's `ANY_CASE`.
    fn find_by_key(&self, key: &str) -> Result<Vec<Self::Record>, RepositoryError>;
}

impl KeyedTable for UnitRowRepository<'_> {
    type Record = UnitRow;
    fn find_by_id(&self, id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, name: &str) -> Result<Vec<UnitRow>, RepositoryError> {
        self.find_by_trimmed_name_any_case(name)
    }
}

impl KeyedTable for LocationTypeRowRepository<'_> {
    type Record = LocationTypeRow;
    fn find_by_id(&self, id: &str) -> Result<Option<LocationTypeRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<LocationTypeRow>, RepositoryError> {
        self.find_by_trimmed_code(code)
    }
}

impl KeyedTable for CurrencyRowRepository<'_> {
    type Record = CurrencyRow;
    fn find_by_id(&self, id: &str) -> Result<Option<CurrencyRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<CurrencyRow>, RepositoryError> {
        self.find_by_trimmed_code(code)
    }
}

/// Each item comes with an empty `legacy_record`, as it's most of an item's size and the import
/// never changes it.
impl KeyedTable for ItemRowRepository<'_> {
    type Record = ItemRow;
    fn find_by_id(&self, id: &str) -> Result<Option<ItemRow>, RepositoryError> {
        self.find_one_by_id_without_legacy_record(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<ItemRow>, RepositoryError> {
        self.find_by_trimmed_code_without_legacy_record(code)
    }
}

impl KeyedTable for MasterListRowRepository<'_> {
    type Record = MasterListRow;
    fn find_by_id(&self, id: &str) -> Result<Option<MasterListRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, name: &str) -> Result<Vec<MasterListRow>, RepositoryError> {
        self.find_by_trimmed_name(name)
    }
}

/// Deleted users are found too, so a row can restore one.
impl KeyedTable for UserAccountRowRepository<'_> {
    type Record = UserAccountRow;
    fn find_by_id(&self, id: &str) -> Result<Option<UserAccountRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, username: &str) -> Result<Vec<UserAccountRow>, RepositoryError> {
        self.find_by_trimmed_username_any_case(username)
    }
}

impl KeyedTable for StoreRowRepository<'_> {
    type Record = StoreRow;
    fn find_by_id(&self, id: &str) -> Result<Option<StoreRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<StoreRow>, RepositoryError> {
        self.find_by_trimmed_code(code)
    }
}

/// Looked up by code within `r#type`, as a code can belong to a name of each type; with no type,
/// among every type. Deleted names are found too, so a row can restore one.
pub struct NamesOfType<'a> {
    pub repo: NameRowRepository<'a>,
    pub r#type: Option<NameRowType>,
}

impl KeyedTable for NamesOfType<'_> {
    type Record = NameRow;
    fn find_by_id(&self, id: &str) -> Result<Option<NameRow>, RepositoryError> {
        self.repo.find_one_by_id(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<NameRow>, RepositoryError> {
        let mut names = self.repo.find_by_trimmed_code(code)?;
        if let Some(r#type) = &self.r#type {
            names.retain(|name| name.r#type == *r#type);
        }
        Ok(names)
    }
}

/// A small table read once, for a sheet that refers to it but can't change it, so its rows don't
/// each query it. Found as its repository finds them: spaces around a key don't count, letter
/// case does unless `ANY_CASE`, and a key's records come in id order. Case is folded as Postgres
/// `lower` folds it; SQLite's folds only A–Z, so there a key differing only in another letter's
/// case is found here but not by the repository.
pub struct InMemory<R> {
    by_id: HashMap<String, R>,
    /// Folded key → ids.
    by_key: HashMap<String, Vec<String>>,
}

impl<R: Keyed + Clone> InMemory<R> {
    fn fold(key: &str) -> String {
        let key = trim_spaces(key);
        if R::ANY_CASE {
            key.to_lowercase()
        } else {
            key.to_string()
        }
    }

    pub fn new(records: Vec<R>) -> Self {
        let mut by_key: HashMap<String, Vec<String>> = HashMap::new();
        for record in &records {
            by_key
                .entry(Self::fold(record.key()))
                .or_default()
                .push(record.id().to_string());
        }
        by_key.values_mut().for_each(|ids| ids.sort());
        let by_id = records
            .into_iter()
            .map(|record| (record.id().to_string(), record))
            .collect();
        InMemory { by_id, by_key }
    }

    pub fn get(&self, id: &str) -> Option<&R> {
        self.by_id.get(id)
    }

    /// The record's key, such as its code, for a message; the id when there's no such record.
    pub fn key_or_id<'a>(&'a self, id: &'a str) -> &'a str {
        key_or(self.get(id), id)
    }

    /// In id order.
    pub fn with_key(&self, key: &str) -> Vec<R> {
        self.by_key
            .get(&Self::fold(key))
            .into_iter()
            .flatten()
            .filter_map(|id| self.by_id.get(id).cloned())
            .collect()
    }
}

impl<R: Keyed + Clone> KeyedTable for InMemory<R> {
    type Record = R;
    fn find_by_id(&self, id: &str) -> Result<Option<R>, RepositoryError> {
        Ok(self.get(id).cloned())
    }
    fn find_by_key(&self, key: &str) -> Result<Vec<R>, RepositoryError> {
        Ok(self.with_key(key))
    }
}

/// Every context: one per program, plus the patient context.
pub fn read_contexts(
    connection: &StorageConnection,
) -> Result<InMemory<ContextRow>, RepositoryError> {
    Ok(InMemory::new(ContextRowRepository::new(connection).all()?))
}

#[derive(Debug, PartialEq)]
pub enum LookupError {
    NotFound,
    Ambiguous,
    Conflict { resolved: String, provided: String },
}

pub const NOT_FOUND: &str = "referenced record not found";

impl LookupError {
    /// `code` is the code cell; the columns name a conflict.
    pub fn message(&self, code: &str, code_column: &str, id_column: &str) -> String {
        match self {
            LookupError::NotFound => NOT_FOUND.to_string(),
            LookupError::Ambiguous => "ambiguous reference, please provide id instead".to_string(),
            LookupError::Conflict { resolved, provided } => format!(
                "{code_column} and {id_column} conflict: {code} resolves to {resolved} but {id_column} contains {provided}"
            ),
        }
    }
}

/// The active records among those a key matches, or the inactive ones when none is active, so an
/// old inactive record doesn't make the key ambiguous.
pub fn active_first<R>(records: Vec<R>, is_active: impl Fn(&R) -> bool) -> Vec<R> {
    let (active, inactive): (Vec<_>, Vec<_>) = records.into_iter().partition(|r| is_active(r));
    if active.is_empty() { inactive } else { active }
}

/// The one record a key matches, if any.
pub fn pick_one<R>(mut records: Vec<R>) -> Result<Option<R>, LookupError> {
    match records.len() {
        0 => Ok(None),
        1 => Ok(records.pop()),
        _ => Err(LookupError::Ambiguous),
    }
}

/// For a row whose id and lookup key don't find the same saved record. `column` is the key's.
pub fn record_conflict(
    column: &str,
    record: &str,
    saved_key: &str,
    saved_id: &str,
    key: &str,
    id: &str,
) -> String {
    let has = |value: &str| match value {
        "" => format!("a blank {column}"),
        value => format!("{column} {value}"),
    };
    format!(
        "{column} and id conflict: {record} has {} and id {saved_id}, but this row has {} and id {id}",
        has(saved_key),
        has(key)
    )
}

/// A row's reference that differs from its record's, in a lookup key. On the code column if the
/// row fills it, else the id column; each is (column, saved value).
fn reference_conflict(
    row: &Row,
    code: (&str, &str),
    reference_id: (&str, &str),
    record: &str,
    record_id: &str,
    id: &str,
) -> RowError {
    let (column, saved) = if row.reference_column(code.0, reference_id.0) == code.0 {
        code
    } else {
        reference_id
    };
    row.error(
        column,
        record_conflict(
            column,
            record,
            saved,
            record_id,
            &row.text(column).unwrap_or_default(),
            id,
        ),
    )
}

/// For `Found::NewIdBesideKey`: the row repeats `record`'s whole key with another id.
fn new_id_conflict(row: &Row, record: &str, saved_id: &str, id: &str) -> RowError {
    row.error(
        "id",
        format!("id conflict: {record} has id {saved_id}, but this row has id {id}"),
    )
}

/// How `find_by_id_or_composite_key` found the record it passes to `check`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Found {
    /// The row's key MUST match.
    ById,
    /// By key, beside an id no record has: a copied row with one column edited.
    NewIdBesideKey,
}

/// A reference in a record's lookup key, which a row with the record's id MUST NOT change. `D` is
/// what `key_conflict`'s `describe` reads.
pub struct KeyPart<'a, D> {
    /// The row gives another than the saved record's.
    pub changed: bool,
    pub code_column: &'a str,
    pub id_column: &'a str,
    /// The saved record's value in `id_column`.
    pub saved_id: &'a str,
    /// The saved record's value in `code_column`.
    pub saved_code: SavedCode<'a, D>,
}

pub enum SavedCode<'a, D> {
    /// Already known, such as from a table read once.
    Known(&'a str),
    /// From what `key_conflict`'s `describe` read, such as an item's code; `saved_id` when that
    /// found no record, as `key_or` does.
    Read(fn(&D) -> Option<&str>),
}

impl<'a, D> KeyPart<'a, D> {
    /// A reference to a table read once, so its saved code is known.
    pub fn in_memory<R: Keyed + Clone>(
        records: &'a InMemory<R>,
        changed: bool,
        code_column: &'a str,
        id_column: &'a str,
        saved_id: &'a str,
    ) -> Self {
        KeyPart {
            changed,
            code_column,
            id_column,
            saved_id,
            saved_code: SavedCode::Known(records.key_or_id(saved_id)),
        }
    }
}

/// Whether a row's reference, `None` when it gives none, is another than the saved record's.
pub fn differs(given: Option<&str>, saved: &str) -> bool {
    given.is_some_and(|given| given != saved)
}

/// `check` for `find_by_id_or_composite_key`, for a table keyed by references: the conflict on the
/// first of `parts` the row changes, or for a new id beside the record's key; `None` takes the
/// record, `record_id`. `describe` names the record and reads what `saved_code` needs, only for a
/// conflict.
pub fn key_conflict<D>(
    row: &Row,
    found: Found,
    record_id: &str,
    id: &str,
    parts: &[KeyPart<D>],
    describe: impl FnOnce() -> Result<(String, D), RepositoryError>,
) -> Result<Option<RowError>, RepositoryError> {
    let changed = parts.iter().find(|part| part.changed);
    if found == Found::ById && changed.is_none() {
        return Ok(None);
    }
    let (record, described) = describe()?;
    Ok(Some(match (found, changed) {
        (Found::ById, Some(part)) => reference_conflict(
            row,
            (
                part.code_column,
                match part.saved_code {
                    SavedCode::Known(code) => code,
                    SavedCode::Read(code) => code(&described).unwrap_or(part.saved_id),
                },
            ),
            (part.id_column, part.saved_id),
            &record,
            record_id,
            id,
        ),
        _ => new_id_conflict(row, &record, record_id, id),
    }))
}

/// The saved record a row changes: by `id`, else among `by_key`, the records its key finds, read
/// only when needed. `Ok(None)` adds one. The record found goes to `check`, which returns its
/// conflict or `None` to take it.
pub fn find_by_id_or_composite_key<R>(
    row: &Row,
    id: Option<&str>,
    by_key: impl FnOnce() -> Result<Vec<R>, RepositoryError>,
    record_id: impl Fn(&R) -> &str,
    find_by_id: impl FnOnce(&str) -> Result<Option<R>, RepositoryError>,
    check: impl FnOnce(&R, Found, &str) -> Result<Option<RowError>, RepositoryError>,
) -> Result<Result<Option<R>, RowError>, RepositoryError> {
    let sorted = |mut records: Vec<R>| {
        records.sort_by(|a, b| record_id(a).cmp(record_id(b)));
        records
    };
    let Some(id) = id else {
        return Ok(pick_one(sorted(by_key()?)).map_err(|e| row.error("id", e.message("", "", ""))));
    };
    let (saved, found) = match find_by_id(id)? {
        Some(saved) => (saved, Found::ById),
        None => match sorted(by_key()?).into_iter().next() {
            Some(saved) => (saved, Found::NewIdBesideKey),
            None => return Ok(Ok(None)),
        },
    };
    Ok(match check(&saved, found, id)? {
        Some(error) => Err(error),
        None => Ok(Some(saved)),
    })
}

/// The saved record a row changes, by id, else by its lookup key in `column`. `Ok(None)` for a
/// row that adds one. `name` names the saved record in a conflict. `narrow` picks among the
/// records a key alone matches; with an id, every record the key matches counts, so a conflict
/// with any of them is found.
pub fn find_record<T: KeyedTable>(
    table: &T,
    row: &Row,
    column: &str,
    id: Option<&str>,
    key: Option<&str>,
    name: impl Fn(&T::Record) -> &str,
    narrow: impl Fn(Vec<T::Record>) -> Vec<T::Record>,
) -> Result<Result<Option<T::Record>, RowError>, RepositoryError> {
    let conflict = |saved: &T::Record, id: &str, key: &str| {
        row.error(
            column,
            record_conflict(column, name(saved), saved.key(), saved.id(), key, id),
        )
    };
    let Some(key) = key else {
        return Ok(Ok(match id {
            Some(id) => table.find_by_id(id)?,
            None => None,
        }));
    };
    let mut by_key = table.find_by_key(key)?;
    Ok(match id {
        // The key must find the saved record, so keys compare as the table compares them. Found
        // by its key, it needn't be read again by id.
        Some(id) => match by_key.iter().position(|other| other.id() == id) {
            Some(position) => Ok(Some(by_key.swap_remove(position))),
            None => match table.find_by_id(id)? {
                Some(saved) => Err(conflict(&saved, id, key)),
                // A new id beside a saved key is a copied row with one column edited.
                None => match by_key.first() {
                    Some(saved) => Err(conflict(saved, id, key)),
                    None => Ok(None),
                },
            },
        },
        None => {
            pick_one(narrow(by_key)).map_err(|e| row.error(column, e.message(key, column, "id")))
        }
    })
}

/// The saved record a row changes, by id, else by its name in `column`, for tables keyed by
/// name. With an id the name isn't checked: a different name renames the record. An inactive
/// record doesn't make an active one's name ambiguous.
pub fn find_by_id_or_name<T: KeyedTable>(
    table: &T,
    row: &Row,
    column: &str,
    id: Option<&str>,
    name: Option<&str>,
    is_active: impl Fn(&T::Record) -> bool,
) -> Result<Result<Option<T::Record>, RowError>, RepositoryError> {
    find_record(
        table,
        row,
        column,
        id,
        name.filter(|_| id.is_none()),
        T::Record::key,
        |records| active_first(records, &is_active),
    )
}

/// For a row whose name an active `noun` (`other_id`) already has.
pub fn duplicate_name_error(row: &Row, noun: &str, other_id: &str, name: &str) -> RowError {
    // Nouns are ASCII, so the first byte is the first letter.
    let capitalised = format!("{}{}", noun[..1].to_uppercase(), &noun[1..]);
    row.error(
        "name",
        format!(
            "{capitalised} {other_id} is already named {name}. Give this {noun} another name, or make one of them inactive"
        ),
    )
}

/// A reference to another table's record, given by a code column, an id column or both. `None`
/// when the sheet has neither column, so the saved reference is kept; `Some(None)` clears it.
/// `narrow` picks among the records a code alone matches, as an id settles which one is meant.
pub fn find_reference<T: KeyedTable>(
    table: &T,
    row: &Row,
    code_column: &str,
    id_column: &str,
    narrow: impl Fn(Vec<T::Record>) -> Vec<T::Record>,
) -> Result<Result<Option<Option<String>>, RowError>, RepositoryError> {
    if !row.has(code_column) && !row.has(id_column) {
        return Ok(Ok(None));
    }
    let id = row.text(id_column);
    let code = row.text(code_column);
    Ok(
        lookup_reference(table, id.as_deref(), code.as_deref(), narrow)?
            .map(Some)
            .map_err(|error| {
                error.to_row_error(
                    row.sheet,
                    row.number,
                    code_column,
                    id_column,
                    code.as_deref(),
                )
            }),
    )
}

/// Why a reference wasn't found, and whether its id is to blame.
#[derive(Debug, PartialEq)]
pub struct ReferenceError {
    pub error: LookupError,
    unknown_id: bool,
}

impl ReferenceError {
    /// The error on the sheet's row, in the id column when the id is to blame. `code` is the
    /// row's code cell, which the message quotes.
    pub fn to_row_error(
        &self,
        sheet: &str,
        row: u32,
        code_column: &str,
        id_column: &str,
        code: Option<&str>,
    ) -> RowError {
        RowError {
            sheet: sheet.to_string(),
            row: Some(row),
            column: Some(
                if self.unknown_id {
                    id_column
                } else {
                    code_column
                }
                .to_string(),
            ),
            message: self
                .error
                .message(code.unwrap_or_default(), code_column, id_column),
        }
    }
}

/// As `find_reference`, given the cells, for a reference a later sheet may add.
pub fn lookup_reference<T: KeyedTable>(
    table: &T,
    id: Option<&str>,
    code: Option<&str>,
    narrow: impl Fn(Vec<T::Record>) -> Vec<T::Record>,
) -> Result<Result<Option<String>, ReferenceError>, RepositoryError> {
    let id_exists = match id {
        Some(id) => table.find_by_id(id)?.is_some(),
        None => false,
    };
    let code_matches: Option<Vec<String>> = match code {
        Some(code) => {
            let matches = table.find_by_key(code)?;
            let matches = if id.is_some() {
                matches
            } else {
                narrow(matches)
            };
            Some(
                matches
                    .iter()
                    .map(|record| record.id().to_string())
                    .collect(),
            )
        }
        None => None,
    };
    Ok(
        resolve(id, id_exists, code_matches.as_deref()).map_err(|error| ReferenceError {
            error,
            unknown_id: id.is_some() && !id_exists,
        }),
    )
}

/// `code_matches` holds the ids the code matched, `None` when no code was given. Given both, id
/// and code must agree.
pub fn resolve(
    id: Option<&str>,
    id_exists: bool,
    code_matches: Option<&[String]>,
) -> Result<Option<String>, LookupError> {
    match (id, code_matches) {
        (None, None) => Ok(None),
        (Some(_), _) if !id_exists => Err(LookupError::NotFound),
        (Some(id), None) => Ok(Some(id.to_string())),
        (Some(id), Some(matches)) if matches.iter().any(|matched| matched == id) => {
            Ok(Some(id.to_string()))
        }
        (_, Some([])) => Err(LookupError::NotFound),
        (Some(id), Some(matches)) => Err(LookupError::Conflict {
            resolved: matches.join(", "),
            provided: id.to_string(),
        }),
        (None, Some([matched])) => Ok(Some(matched.clone())),
        (None, Some(_)) => Err(LookupError::Ambiguous),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unit(id: &str, name: &str) -> UnitRow {
        UnitRow {
            id: id.to_string(),
            name: name.to_string(),
            ..Default::default()
        }
    }

    #[test]
    fn an_in_memory_table_finds_keys_as_its_repository_does() {
        let units = InMemory::new(vec![
            unit("b", "Tab"),
            unit("a", " Tab"),
            unit("c", "Tab\t"),
            unit("d", "tab"),
        ]);
        let ids = |name: &str| -> Vec<String> {
            units
                .find_by_key(name)
                .unwrap()
                .into_iter()
                .map(|unit| unit.id)
                .collect()
        };
        // Only spaces are trimmed, as SQL trims; a unit name's letter case doesn't count; ids
        // come in order.
        assert_eq!(ids("Tab "), ["a", "b", "d"]);
        assert_eq!(ids("TAB\t"), ["c"]);
        assert!(ids("Vial").is_empty());
        assert_eq!(units.find_by_id("c").unwrap(), Some(unit("c", "Tab\t")));
        assert_eq!(units.find_by_id("e").unwrap(), None);

        // A code's letter case does.
        let location_types = InMemory::new(vec![LocationTypeRow {
            id: "cold".to_string(),
            code: "COLD".to_string(),
            ..Default::default()
        }]);
        assert_eq!(location_types.find_by_key(" COLD").unwrap().len(), 1);
        assert!(location_types.find_by_key("cold").unwrap().is_empty());
    }

    #[test]
    fn active_first_looks_at_inactive_records_only_when_none_is_active() {
        let records = |flags: &[(&'static str, bool)]| flags.to_vec();
        let is_active = |(_, active): &(&str, bool)| *active;
        assert_eq!(
            active_first(records(&[("a", false), ("b", true)]), is_active),
            [("b", true)]
        );
        assert_eq!(
            active_first(records(&[("a", false), ("b", false)]), is_active),
            [("a", false), ("b", false)]
        );

        assert_eq!(pick_one(Vec::<u8>::new()), Ok(None));
        assert_eq!(pick_one(vec![1]), Ok(Some(1)));
        assert_eq!(pick_one(vec![1, 2]), Err(LookupError::Ambiguous));
    }

    fn ids(ids: &[&str]) -> Vec<String> {
        ids.iter().map(|id| id.to_string()).collect()
    }

    #[test]
    fn nothing_given_resolves_to_nothing() {
        assert_eq!(resolve(None, false, None), Ok(None));
    }

    // covers: OMS-REG-CDIO-01.24

    #[test]
    fn by_code() {
        assert_eq!(
            resolve(None, false, Some(&ids(&["a"]))),
            Ok(Some("a".into()))
        );
        assert_eq!(resolve(None, false, Some(&[])), Err(LookupError::NotFound));
        assert_eq!(
            resolve(None, false, Some(&ids(&["a", "b"]))),
            Err(LookupError::Ambiguous)
        );
    }

    #[test]
    fn by_id() {
        assert_eq!(resolve(Some("a"), true, None), Ok(Some("a".into())));
        assert_eq!(resolve(Some("a"), false, None), Err(LookupError::NotFound));
    }

    #[test]
    fn id_settles_an_ambiguous_code_it_agrees_with() {
        assert_eq!(
            resolve(Some("b"), true, Some(&ids(&["a", "b"]))),
            Ok(Some("b".into()))
        );
    }

    #[test]
    fn a_blank_value_in_a_conflict_reads_as_blank() {
        assert_eq!(
            record_conflict("context_id", "A", "p1", "x", "", "x"),
            "context_id and id conflict: A has context_id p1 and id x, but this row has a blank context_id and id x"
        );
        assert_eq!(
            record_conflict("context_id", "A", "", "x", "p1", "x"),
            "context_id and id conflict: A has a blank context_id and id x, but this row has context_id p1 and id x"
        );
    }

    // covers: OMS-REG-CDIO-01.23

    #[test]
    fn code_and_id_that_disagree_conflict() {
        let error = resolve(Some("b"), true, Some(&ids(&["a"]))).unwrap_err();
        assert_eq!(
            error.message("TAB", "unit_name", "unit_id"),
            "unit_name and unit_id conflict: TAB resolves to a but unit_id contains b"
        );
        // A code that finds nothing is an error even when the id is valid.
        assert_eq!(
            resolve(Some("b"), true, Some(&[])),
            Err(LookupError::NotFound)
        );
    }
}
