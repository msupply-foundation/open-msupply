use super::{
    CentralDataTable, Change, ExportFilter, FieldChange, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport, SheetStart,
    cells::{Row, collect, keep_or_saved},
    field_changes,
    lookup::{LookupError, find_record},
    sheet::Value,
};
use crate::currency::{UpsertCurrencyError, upsert_currency};
use repository::{CurrencyRow, CurrencyRowRepository, RepositoryError, StorageConnection};
use util::uuid::uuid;

const ID: &str = "id";
const CODE: &str = "code";
const RATE: &str = "rate";
const IS_HOME_CURRENCY: &str = "is_home_currency";
const DATE_UPDATED: &str = "date_updated";
const IS_ACTIVE: &str = "is_active";
const COLUMNS: &[&str] = &[ID, CODE, RATE, IS_HOME_CURRENCY, DATE_UPDATED, IS_ACTIVE];

/// Matched by `id`, else `code`, among active currencies first. On an update a blank cell keeps
/// the value, except `date_updated`, which it clears.
pub(super) struct CurrencyTable;

impl ImportTable for CurrencyTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::Currency
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    /// `date_updated` too, so Excel keeps it as written rather than in its own date format.
    fn text_columns(&self) -> &'static [&'static str] {
        &[ID, CODE, DATE_UPDATED]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        Ok(CurrencyRowRepository::new(connection)
            .find_all()?
            .into_iter()
            .filter(|currency| matches(filter, currency))
            .map(|currency| cells(&currency))
            .collect())
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let currencies = CurrencyRowRepository::new(connection).find_all()?;
        Ok(RecordCount::in_memory(&currencies, |currency| {
            matches(filter, currency)
        }))
    }

    fn start_sheet(
        &self,
        _connection: &StorageConnection,
        _start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        Ok(Box::new(CurrencySheet))
    }
}

struct CurrencySheet;

impl SheetImport for CurrencySheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let rate = collect(&mut errors, row.number(RATE));
        let is_home_currency = collect(&mut errors, row.bool(IS_HOME_CURRENCY));
        let date_updated = collect(&mut errors, row.date(DATE_UPDATED));
        let is_active = collect(&mut errors, row.bool(IS_ACTIVE));
        let id = row.text(ID);
        let code = row.text(CODE);

        let repo = CurrencyRowRepository::new(connection);
        // Without an id, an inactive currency doesn't make an active one's code ambiguous.
        let found = match (&id, &code) {
            (None, Some(code)) => pick_by_code(repo.find_by_trimmed_code(code)?)
                .map_err(|e| row.error(CODE, e.message(code))),
            _ => find_record(&repo, row, CODE, id.as_deref(), code.as_deref(), |saved| {
                &saved.code
            })?,
        };
        // Without its record, the row's other checks would treat it as a new currency.
        let existing = match found {
            Ok(existing) => existing,
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };

        let code = keep_or_saved(code, existing.as_ref().map(|saved| saved.code.as_str()));
        let rate = rate.or(existing.as_ref().map(|saved| saved.rate));
        let is_home_currency =
            is_home_currency.or(existing.as_ref().map(|saved| saved.is_home_currency));
        let is_active = is_active.or(existing.as_ref().map(|saved| saved.is_active));
        row.require_for_new(
            &mut errors,
            "currency",
            &[
                (CODE, code.is_none()),
                (RATE, rate.is_none()),
                (IS_HOME_CURRENCY, is_home_currency.is_none()),
                (IS_ACTIVE, is_active.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let currency = CurrencyRow {
            id: existing
                .as_ref()
                .map(|saved| saved.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            code: code.unwrap_or_default(),
            rate: rate.unwrap_or_default(),
            is_home_currency: is_home_currency.unwrap_or_default(),
            date_updated: if row.has(DATE_UPDATED) {
                date_updated
            } else {
                existing.as_ref().and_then(|saved| saved.date_updated)
            },
            is_active: is_active.unwrap_or_default(),
        };

        let change = Change::between(existing.as_ref(), &currency, |currency| currency.is_active);
        if change != Change::Unchanged {
            upsert_currency(connection, &currency)
                .map_err(|error| upsert_failure(row, &currency, error))?;
        }
        Ok(RowOutcome {
            fields: existing
                .map(|saved| changed_fields(&saved, &currency))
                .unwrap_or_default(),
            record: currency.code,
            record_id: currency.id,
            change,
        })
    }
}

fn upsert_failure(row: &Row, currency: &CurrencyRow, error: UpsertCurrencyError) -> RowFailure {
    match error {
        UpsertCurrencyError::CodeRequired => row.error(CODE, "code is required").into(),
        UpsertCurrencyError::RateNotPositive => row.error(RATE, "rate must be above 0").into(),
        UpsertCurrencyError::HomeCurrencyTaken { home } => row
            .error(
                IS_HOME_CURRENCY,
                format!(
                    "{} is the home currency, and there can be only one. Set its is_home_currency to FALSE on an earlier row",
                    home.code
                ),
            )
            .into(),
        // A row can't change a code, so only making a currency active brings this in.
        UpsertCurrencyError::DuplicateCode { other_id } => row
            .error(
                IS_ACTIVE,
                format!(
                    "Currency {other_id} is active with code {}. Make one of them inactive",
                    currency.code
                ),
            )
            .into(),
        UpsertCurrencyError::DatabaseError(error) => RowFailure::Database(error),
    }
}

/// The active currencies among those a code matches, or the inactive ones when none is active.
fn pick_by_code(currencies: Vec<CurrencyRow>) -> Result<Option<CurrencyRow>, LookupError> {
    let (active, inactive): (Vec<_>, Vec<_>) = currencies
        .into_iter()
        .partition(|currency| currency.is_active);
    let mut candidates = if active.is_empty() { inactive } else { active };
    match candidates.len() {
        0 => Ok(None),
        1 => Ok(candidates.pop()),
        _ => Err(LookupError::Ambiguous),
    }
}

/// Currencies are few, so they're filtered in memory.
fn matches(filter: &ExportFilter, currency: &CurrencyRow) -> bool {
    filter.matches(&[&currency.code], Some(currency.is_active))
}

/// One per column, as the export writes them and the preview shows them.
fn cells(currency: &CurrencyRow) -> Vec<Value> {
    vec![
        currency.id.clone().into(),
        currency.code.clone().into(),
        Value::Number(currency.rate),
        currency.is_home_currency.into(),
        currency.date_updated.map(|date| date.to_string()).into(),
        currency.is_active.into(),
    ]
}

fn changed_fields(old: &CurrencyRow, new: &CurrencyRow) -> Vec<FieldChange> {
    field_changes(COLUMNS, cells(old), cells(new))
}
