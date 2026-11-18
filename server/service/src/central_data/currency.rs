use super::{
    CentralDataTable, Change, ExportFilter, FieldChange, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport, SheetStart,
    cells::{Row, RowError, collect, keep_or_saved},
    field_changes,
    lookup::{active_first, find_record},
    sheet::Value,
};
use crate::currency::{UpsertCurrencyError, home_currencies, upsert_currency_leaving_home};
use chrono::NaiveDate;
use repository::{
    CurrencyRow, CurrencyRowRepository, CurrencyUser, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

const ID: &str = "id";
const CODE: &str = "code";
const RATE: &str = "rate";
const IS_HOME_CURRENCY: &str = "is_home_currency";
const DATE_UPDATED: &str = "date_updated";
const IS_ACTIVE: &str = "is_active";
const COLUMNS: &[&str] = &[ID, CODE, RATE, IS_HOME_CURRENCY, IS_ACTIVE];

/// Matched by `id`, else `code`, among active currencies first. On an update a blank cell keeps
/// the value. `date_updated` is the server's to set, so it's export-only.
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

    fn export_only_columns(&self) -> &'static [&'static str] {
        &[DATE_UPDATED]
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
            .map(|currency| {
                let mut row = cells(&currency);
                row.push(currency.date_updated.map(|date| date.to_string()).into());
                row
            })
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
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        Ok(Box::new(CurrencySheet {
            today: start.today,
            home_removed: None,
            home_given: Vec::new(),
        }))
    }
}

/// The home currency is checked after the sheet's last row, so rows moving it can come in any
/// order.
struct CurrencySheet {
    /// What a changed currency's `date_updated` is set to.
    today: NaiveDate,
    /// The last row that stops a currency being the home currency, should the sheet leave none.
    home_removed: Option<RowError>,
    /// Each row that makes a currency the home currency, with its currency, should the sheet leave
    /// more than one. Its message is set then.
    home_given: Vec<(RowError, CurrencyRow)>,
}

impl SheetImport for CurrencySheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let rate = collect(&mut errors, row.number(RATE));
        let is_home_currency = collect(&mut errors, row.bool(IS_HOME_CURRENCY));
        let is_active = collect(&mut errors, row.bool(IS_ACTIVE));
        let id = row.text(ID);
        let code = row.text(CODE);

        let repo = CurrencyRowRepository::new(connection);
        // Without its record, the row's other checks would treat it as a new currency.
        let existing = match find_record(
            &repo,
            row,
            CODE,
            id.as_deref(),
            code.as_deref(),
            |saved| &saved.code,
            // An inactive currency doesn't make an active one's code ambiguous.
            |currencies| active_first(currencies, |currency| currency.is_active),
        )? {
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
            // Kept, so it doesn't count as a change; the service sets it when anything else changes.
            date_updated: existing.as_ref().and_then(|saved| saved.date_updated),
            is_active: is_active.unwrap_or_default(),
        };

        let change = Change::between(existing.as_ref(), &currency, |currency| currency.is_active);
        if change != Change::Unchanged {
            upsert_currency_leaving_home(connection, &currency, self.today)
                .map_err(|error| upsert_failure(row, &currency, error))?;
            let was_home = existing
                .as_ref()
                .is_some_and(|saved| saved.is_home_currency);
            if was_home && !currency.is_home_currency {
                self.home_removed = Some(row.error(
                    IS_HOME_CURRENCY,
                    format!(
                        "{} is the home currency, and no row makes another currency the home currency. Set another currency's is_home_currency to TRUE",
                        currency.code
                    ),
                ));
            }
            if !was_home && currency.is_home_currency {
                self.home_given
                    .push((row.error(IS_HOME_CURRENCY, String::new()), currency.clone()));
            }
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

    /// Exactly one home currency, whatever the server had before. A row to blame gets the error;
    /// otherwise the sheet does.
    fn finish_sheet(
        &mut self,
        connection: &StorageConnection,
        sheet: &str,
    ) -> Result<Vec<RowError>, RepositoryError> {
        let mut homes = home_currencies(connection)?;
        // So messages name them in a fixed order.
        homes.sort_by(|a, b| a.code.cmp(&b.code));
        let sheet_error = |message: String| RowError {
            sheet: sheet.to_string(),
            row: None,
            column: Some(IS_HOME_CURRENCY.to_string()),
            message,
        };
        if homes.is_empty() {
            return Ok(vec![self.home_removed.take().unwrap_or_else(|| {
                sheet_error(
                    "No currency is the home currency. Set is_home_currency to TRUE for one, at a rate of 1"
                        .to_string(),
                )
            })]);
        }
        if homes.len() == 1 {
            return Ok(Vec::new());
        }
        if self.home_given.is_empty() {
            let codes: Vec<&str> = homes.iter().map(|home| home.code.as_str()).collect();
            return Ok(vec![sheet_error(format!(
                "{} are each the home currency, but there can be only one. Set is_home_currency to FALSE for all but one",
                and_list(&codes)
            ))]);
        }
        Ok(self
            .home_given
            .drain(..)
            .map(|(mut error, currency)| {
                let others: Vec<&str> = homes
                    .iter()
                    .filter(|home| home.id != currency.id)
                    .map(|home| home.code.as_str())
                    .collect();
                error.message = format!(
                    "{} would be the home currency, and so would {}, but there can be only one. Set is_home_currency to FALSE for all but one",
                    currency.code,
                    and_list(&others)
                );
                error
            })
            .collect())
    }
}

/// `A`, `A and B`, `A, B and C`.
fn and_list(items: &[&str]) -> String {
    match items {
        [] => String::new(),
        [only] => only.to_string(),
        [rest @ .., last] => format!("{} and {last}", rest.join(", ")),
    }
}

fn upsert_failure(row: &Row, currency: &CurrencyRow, error: UpsertCurrencyError) -> RowFailure {
    match error {
        UpsertCurrencyError::CodeRequired => row.error(CODE, "code is required").into(),
        UpsertCurrencyError::RateNotPositive => row.error(RATE, "rate must be above 0").into(),
        UpsertCurrencyError::HomeRateNotOne => row
            .error(RATE, "The home currency's rate must be 1")
            .into(),
        UpsertCurrencyError::HomeCurrencyInactive => row
            .error(
                IS_ACTIVE,
                format!(
                    "{} is the home currency, so it can't be inactive. Set its is_home_currency to FALSE as well, and make another currency the home currency",
                    currency.code
                ),
            )
            .into(),
        // Unreachable here: the sheet checks the home currency after its last row.
        UpsertCurrencyError::HomeCurrencyTaken { home } => row
            .error(
                IS_HOME_CURRENCY,
                format!("{} is the home currency", home.code),
            )
            .into(),
        UpsertCurrencyError::HomeCurrencyInUse(user) => row
            .error(
                IS_HOME_CURRENCY,
                format!(
                    "{} is used by {} as the home currency, so it must stay the home currency",
                    currency.code,
                    match user {
                        CurrencyUser::Invoice => "an invoice",
                        CurrencyUser::PurchaseOrder => "a purchase order",
                    }
                ),
            )
            .into(),
        UpsertCurrencyError::HomeCurrencyRequired => row
            .error(IS_HOME_CURRENCY, "There must be a home currency")
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

/// Currencies are few, so they're filtered in memory.
fn matches(filter: &ExportFilter, currency: &CurrencyRow) -> bool {
    filter.matches(&[&currency.code], Some(currency.is_active))
}

/// One per column, as the export writes them and the preview shows them. The export adds
/// `date_updated`.
fn cells(currency: &CurrencyRow) -> Vec<Value> {
    vec![
        currency.id.clone().into(),
        currency.code.clone().into(),
        Value::Number(currency.rate),
        currency.is_home_currency.into(),
        currency.is_active.into(),
    ]
}

fn changed_fields(old: &CurrencyRow, new: &CurrencyRow) -> Vec<FieldChange> {
    field_changes(COLUMNS, cells(old), cells(new))
}
