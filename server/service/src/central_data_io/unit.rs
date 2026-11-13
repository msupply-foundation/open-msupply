use super::{
    CentralDataTable, Change, ExportFilter, FieldChange, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport,
    cells::{Row, collect, keep_or_saved, keep_padded},
    lookup::{LookupError, resolve},
    sheet::Value,
};
use crate::unit::{UnitLookup, UpsertUnitError, upsert_unit_in};
use repository::{RepositoryError, StorageConnection, UnitRow, UnitRowRepository};
use util::uuid::uuid;

const ID: &str = "id";
const NAME: &str = "name";
const DESCRIPTION: &str = "description";
const INDEX: &str = "index";
const IS_ACTIVE: &str = "is_active";

/// Matched by `id`, else `name`. On an update a blank cell keeps the value, except `description`,
/// which it clears.
pub(super) struct UnitTable;

impl ImportTable for UnitTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::Unit
    }

    fn columns(&self) -> &'static [&'static str] {
        &[ID, NAME, DESCRIPTION, INDEX, IS_ACTIVE]
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[ID, NAME, DESCRIPTION]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        Ok(UnitRowRepository::new(connection)
            .find_all()?
            .into_iter()
            .filter(|unit| matches(filter, unit))
            .map(|unit| {
                vec![
                    unit.id.into(),
                    unit.name.into(),
                    unit.description.into(),
                    unit.index.into(),
                    unit.is_active.into(),
                ]
            })
            .collect())
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let units = UnitRowRepository::new(connection).find_all()?;
        Ok(RecordCount {
            matching: units.iter().filter(|unit| matches(filter, unit)).count() as u32,
            total: units.len() as u32,
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        // Units are few.
        Ok(Box::new(UnitSheet {
            units: UnitLookup::load_all(connection)?,
        }))
    }
}

struct UnitSheet {
    units: UnitLookup,
}

impl SheetImport for UnitSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let index = collect(&mut errors, row.int(INDEX));
        let is_active = collect(&mut errors, row.bool(IS_ACTIVE));
        let id = row.text(ID);
        let name = row.text(NAME);

        let existing = match (&id, &name) {
            (Some(id), _) => self.units.by_id(id).cloned(),
            (None, Some(name)) => pick_by_name(self.units.by_name(name)).unwrap_or_else(|e| {
                errors.push(row.error(NAME, e.message(name)));
                None
            }),
            (None, None) => None,
        };

        let name = keep_or_saved(name, existing.as_ref().map(|unit| unit.name.as_str()));
        let index = index.or(existing.as_ref().map(|unit| unit.index));
        let is_active = is_active.or(existing.as_ref().map(|unit| unit.is_active));
        row.require_for_new(
            &mut errors,
            "unit",
            &[
                (NAME, name.is_none()),
                (INDEX, index.is_none()),
                (IS_ACTIVE, is_active.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let unit = UnitRow {
            id: existing
                .as_ref()
                .map(|unit| unit.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            name: name.unwrap_or_default(),
            description: if row.has(DESCRIPTION) {
                keep_padded(
                    row.text(DESCRIPTION),
                    existing
                        .as_ref()
                        .and_then(|unit| unit.description.as_deref()),
                )
            } else {
                existing.as_ref().and_then(|unit| unit.description.clone())
            },
            index: index.unwrap_or_default(),
            is_active: is_active.unwrap_or_default(),
        };

        let change = match &existing {
            Some(existing) if *existing == unit => Change::Unchanged,
            Some(existing) if existing.is_active && !unit.is_active => Change::Deleted,
            Some(_) => Change::Updated,
            None => Change::Inserted,
        };
        if change != Change::Unchanged {
            upsert_unit_in(connection, &mut self.units, &unit).map_err(|error| match error {
                UpsertUnitError::NameRequired => row.error(NAME, "name is required").into(),
                UpsertUnitError::DuplicateName { other_id } => row
                    .error(
                        NAME,
                        format!(
                            "Unit {other_id} is already named {}. Give this unit another name, or make one of them inactive",
                            unit.name
                        ),
                    )
                    .into(),
                UpsertUnitError::DatabaseError(error) => RowFailure::Database(error),
            })?;
        }
        Ok(RowOutcome {
            fields: existing
                .map(|existing| changed_fields(&existing, &unit))
                .unwrap_or_default(),
            record: unit.name,
            record_id: unit.id,
            change,
        })
    }
}

/// Units are few, so they're filtered in memory.
fn matches(filter: &ExportFilter, unit: &UnitRow) -> bool {
    filter.matches(&[&unit.name], Some(unit.is_active))
}

/// As the sheet shows them.
fn changed_fields(old: &UnitRow, new: &UnitRow) -> Vec<FieldChange> {
    let values = |unit: &UnitRow| {
        [
            (NAME, unit.name.clone()),
            (DESCRIPTION, unit.description.clone().unwrap_or_default()),
            (INDEX, unit.index.to_string()),
            (IS_ACTIVE, unit.is_active.to_string().to_uppercase()),
        ]
    };
    values(old)
        .into_iter()
        .zip(values(new))
        .filter(|((_, from), (_, to))| from != to)
        .map(|((column, from), (_, to))| FieldChange { column, from, to })
        .collect()
}

/// Active units first, so an old inactive namesake doesn't make the name ambiguous.
fn pick_by_name(units: Vec<&UnitRow>) -> Result<Option<UnitRow>, LookupError> {
    let (active, inactive): (Vec<_>, Vec<_>) = units.into_iter().partition(|unit| unit.is_active);
    let candidates = if active.is_empty() { inactive } else { active };
    let ids: Vec<String> = candidates.iter().map(|unit| unit.id.clone()).collect();
    match resolve(None, false, Some(&ids)) {
        Ok(id) => Ok(candidates
            .into_iter()
            .find(|unit| Some(&unit.id) == id.as_ref())
            .cloned()),
        Err(LookupError::NotFound) => Ok(None),
        Err(e) => Err(e),
    }
}
