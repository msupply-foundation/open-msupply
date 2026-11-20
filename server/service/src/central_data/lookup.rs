use super::cells::{Row, RowError};
use repository::{
    CurrencyRow, CurrencyRowRepository, ItemRow, ItemRowRepository, LocationTypeRow,
    LocationTypeRowRepository, MasterListRow, MasterListRowRepository, NameRow, NameRowRepository,
    NameRowType, RepositoryError, StoreRow, StoreRowRepository, UnitRow, UnitRowRepository,
    UserAccountRow, UserAccountRowRepository, trim_spaces,
};
use std::collections::HashMap;

/// A table a row finds records in, by id or by a lookup key such as a code or name.
pub trait KeyedTable {
    type Record;
    fn id(record: &Self::Record) -> &str;
    fn key(record: &Self::Record) -> &str;
    fn find_by_id(&self, id: &str) -> Result<Option<Self::Record>, RepositoryError>;
    /// Spaces around either key don't count. Letter case does, unless `ANY_CASE`.
    fn find_by_key(&self, key: &str) -> Result<Vec<Self::Record>, RepositoryError>;
    /// Whether keys match in any letter case, as unit names and usernames do.
    const ANY_CASE: bool = false;
}

/// Looked up by name, in any letter case.
impl KeyedTable for UnitRowRepository<'_> {
    type Record = UnitRow;
    const ANY_CASE: bool = true;
    fn id(unit: &UnitRow) -> &str {
        &unit.id
    }
    fn key(unit: &UnitRow) -> &str {
        &unit.name
    }
    fn find_by_id(&self, id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, name: &str) -> Result<Vec<UnitRow>, RepositoryError> {
        self.find_by_trimmed_name_any_case(name)
    }
}

/// Looked up by code.
impl KeyedTable for LocationTypeRowRepository<'_> {
    type Record = LocationTypeRow;
    fn id(location_type: &LocationTypeRow) -> &str {
        &location_type.id
    }
    fn key(location_type: &LocationTypeRow) -> &str {
        &location_type.code
    }
    fn find_by_id(&self, id: &str) -> Result<Option<LocationTypeRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<LocationTypeRow>, RepositoryError> {
        self.find_by_trimmed_code(code)
    }
}

/// Looked up by code.
impl KeyedTable for CurrencyRowRepository<'_> {
    type Record = CurrencyRow;
    fn id(currency: &CurrencyRow) -> &str {
        &currency.id
    }
    fn key(currency: &CurrencyRow) -> &str {
        &currency.code
    }
    fn find_by_id(&self, id: &str) -> Result<Option<CurrencyRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<CurrencyRow>, RepositoryError> {
        self.find_by_trimmed_code(code)
    }
}

/// Looked up by code. Each item comes with an empty `legacy_record`, as it's most of an item's
/// size and the import never changes it.
impl KeyedTable for ItemRowRepository<'_> {
    type Record = ItemRow;
    fn id(item: &ItemRow) -> &str {
        &item.id
    }
    fn key(item: &ItemRow) -> &str {
        &item.code
    }
    fn find_by_id(&self, id: &str) -> Result<Option<ItemRow>, RepositoryError> {
        self.find_one_by_id_without_legacy_record(id)
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<ItemRow>, RepositoryError> {
        self.find_by_trimmed_code_without_legacy_record(code)
    }
}

/// Looked up by name, as legacy master lists often have no code.
impl KeyedTable for MasterListRowRepository<'_> {
    type Record = MasterListRow;
    fn id(master_list: &MasterListRow) -> &str {
        &master_list.id
    }
    fn key(master_list: &MasterListRow) -> &str {
        &master_list.name
    }
    fn find_by_id(&self, id: &str) -> Result<Option<MasterListRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, name: &str) -> Result<Vec<MasterListRow>, RepositoryError> {
        self.find_by_trimmed_name(name)
    }
}

/// Looked up by username, in any letter case, as login matches it. Deleted users are found too,
/// so a row can restore one.
impl KeyedTable for UserAccountRowRepository<'_> {
    type Record = UserAccountRow;
    const ANY_CASE: bool = true;
    fn id(user: &UserAccountRow) -> &str {
        &user.id
    }
    fn key(user: &UserAccountRow) -> &str {
        &user.username
    }
    fn find_by_id(&self, id: &str) -> Result<Option<UserAccountRow>, RepositoryError> {
        self.find_one_by_id(id)
    }
    fn find_by_key(&self, username: &str) -> Result<Vec<UserAccountRow>, RepositoryError> {
        self.find_by_trimmed_username_any_case(username)
    }
}

/// Looked up by code.
impl KeyedTable for StoreRowRepository<'_> {
    type Record = StoreRow;
    fn id(store: &StoreRow) -> &str {
        &store.id
    }
    fn key(store: &StoreRow) -> &str {
        &store.code
    }
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
    fn id(name: &NameRow) -> &str {
        &name.id
    }
    fn key(name: &NameRow) -> &str {
        &name.code
    }
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

impl<R: Clone> InMemory<R>
where
    Self: KeyedTable<Record = R>,
{
    fn fold(key: &str) -> String {
        let key = trim_spaces(key);
        if Self::ANY_CASE {
            key.to_lowercase()
        } else {
            key.to_string()
        }
    }

    pub fn new(records: Vec<R>) -> Self {
        let mut by_key: HashMap<String, Vec<String>> = HashMap::new();
        for record in &records {
            by_key
                .entry(Self::fold(Self::key(record)))
                .or_default()
                .push(Self::id(record).to_string());
        }
        by_key.values_mut().for_each(|ids| ids.sort());
        let by_id = records
            .into_iter()
            .map(|record| (Self::id(&record).to_string(), record))
            .collect();
        InMemory { by_id, by_key }
    }

    pub fn get(&self, id: &str) -> Option<&R> {
        self.by_id.get(id)
    }

    fn with_key(&self, key: &str) -> Vec<R> {
        self.by_key
            .get(&Self::fold(key))
            .into_iter()
            .flatten()
            .filter_map(|id| self.by_id.get(id).cloned())
            .collect()
    }
}

impl KeyedTable for InMemory<UnitRow> {
    type Record = UnitRow;
    const ANY_CASE: bool = true;
    fn id(unit: &UnitRow) -> &str {
        UnitRowRepository::id(unit)
    }
    fn key(unit: &UnitRow) -> &str {
        UnitRowRepository::key(unit)
    }
    fn find_by_id(&self, id: &str) -> Result<Option<UnitRow>, RepositoryError> {
        Ok(self.get(id).cloned())
    }
    fn find_by_key(&self, name: &str) -> Result<Vec<UnitRow>, RepositoryError> {
        Ok(self.with_key(name))
    }
}

impl KeyedTable for InMemory<LocationTypeRow> {
    type Record = LocationTypeRow;
    fn id(location_type: &LocationTypeRow) -> &str {
        LocationTypeRowRepository::id(location_type)
    }
    fn key(location_type: &LocationTypeRow) -> &str {
        LocationTypeRowRepository::key(location_type)
    }
    fn find_by_id(&self, id: &str) -> Result<Option<LocationTypeRow>, RepositoryError> {
        Ok(self.get(id).cloned())
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<LocationTypeRow>, RepositoryError> {
        Ok(self.with_key(code))
    }
}

/// Looked up by code.
impl KeyedTable for InMemory<StoreRow> {
    type Record = StoreRow;
    fn id(store: &StoreRow) -> &str {
        &store.id
    }
    fn key(store: &StoreRow) -> &str {
        &store.code
    }
    fn find_by_id(&self, id: &str) -> Result<Option<StoreRow>, RepositoryError> {
        Ok(self.get(id).cloned())
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<StoreRow>, RepositoryError> {
        Ok(self.with_key(code))
    }
}

impl KeyedTable for InMemory<CurrencyRow> {
    type Record = CurrencyRow;
    fn id(currency: &CurrencyRow) -> &str {
        CurrencyRowRepository::id(currency)
    }
    fn key(currency: &CurrencyRow) -> &str {
        CurrencyRowRepository::key(currency)
    }
    fn find_by_id(&self, id: &str) -> Result<Option<CurrencyRow>, RepositoryError> {
        Ok(self.get(id).cloned())
    }
    fn find_by_key(&self, code: &str) -> Result<Vec<CurrencyRow>, RepositoryError> {
        Ok(self.with_key(code))
    }
}

/// Looked up by username, in any letter case, as `UserAccountRowRepository` finds them.
impl KeyedTable for InMemory<UserAccountRow> {
    type Record = UserAccountRow;
    const ANY_CASE: bool = true;
    fn id(user: &UserAccountRow) -> &str {
        UserAccountRowRepository::id(user)
    }
    fn key(user: &UserAccountRow) -> &str {
        UserAccountRowRepository::key(user)
    }
    fn find_by_id(&self, id: &str) -> Result<Option<UserAccountRow>, RepositoryError> {
        Ok(self.get(id).cloned())
    }
    fn find_by_key(&self, username: &str) -> Result<Vec<UserAccountRow>, RepositoryError> {
        Ok(self.with_key(username))
    }
}

#[derive(Debug, PartialEq)]
pub enum LookupError {
    NotFound,
    Ambiguous,
    Conflict { resolved: String, provided: String },
}

pub const NOT_FOUND: &str = "referenced record not found";

impl LookupError {
    pub fn message(&self, code: &str) -> String {
        match self {
            LookupError::NotFound => NOT_FOUND.to_string(),
            LookupError::Ambiguous => "ambiguous reference, please provide id instead".to_string(),
            LookupError::Conflict { resolved, provided } => format!(
                "code and id conflict: {code} resolves to {resolved} but id column contains {provided}"
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
    format!(
        "{column} and id conflict: {record} has {column} {saved_key} and id {saved_id}, but this row has {column} {key} and id {id}"
    )
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
            record_conflict(column, name(saved), T::key(saved), T::id(saved), key, id),
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
        Some(id) => match by_key.iter().position(|other| T::id(other) == id) {
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
        None => pick_one(narrow(by_key)).map_err(|e| row.error(column, e.message(key))),
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
        T::key,
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
            message: self.error.message(code.unwrap_or_default()),
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
                    .map(|record| T::id(record).to_string())
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

    // covers: OMS-REG-CDIO-01.23

    #[test]
    fn code_and_id_that_disagree_conflict() {
        let error = resolve(Some("b"), true, Some(&ids(&["a"]))).unwrap_err();
        assert_eq!(
            error.message("TAB"),
            "code and id conflict: TAB resolves to a but id column contains b"
        );
        // A code that finds nothing is an error even when the id is valid.
        assert_eq!(
            resolve(Some("b"), true, Some(&[])),
            Err(LookupError::NotFound)
        );
    }
}
