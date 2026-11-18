use repository::{
    Currency, CurrencyFilter, CurrencyRepository, CurrencyRow, CurrencyRowRepository, CurrencySort,
    EqualFilter, RepositoryError, StorageConnection, trim_spaces,
};

use crate::{ListError, ListResult, i64_to_u32, service_provider::ServiceContext};
use chrono::NaiveDate;

pub trait CurrencyServiceTrait: Sync + Send {
    fn get_currency(
        &self,
        ctx: &ServiceContext,
        currency_id: &str,
    ) -> Result<Option<Currency>, RepositoryError> {
        let repository = CurrencyRepository::new(&ctx.connection);

        Ok(repository
            .query_by_filter(
                CurrencyFilter::new().id(EqualFilter::equal_to(currency_id.to_string())),
            )?
            .pop())
    }

    fn get_currencies(
        &self,
        ctx: &ServiceContext,
        filter: Option<CurrencyFilter>,
        sort: Option<CurrencySort>,
    ) -> Result<ListResult<Currency>, ListError> {
        let repository = CurrencyRepository::new(&ctx.connection);

        // Always filter by active currencies
        let filter = filter.unwrap_or_default().is_active(true);

        Ok(ListResult {
            rows: repository.query(Some(filter.clone()), sort)?,
            count: i64_to_u32(repository.count(None)?),
        })
    }
}

pub struct CurrencyService;
impl CurrencyServiceTrait for CurrencyService {}

#[derive(Debug, PartialEq)]
pub enum UpsertCurrencyError {
    CodeRequired,
    RateNotPositive,
    HomeRateNotOne,
    HomeCurrencyInactive,
    /// Another currency, active or not, is the home currency.
    HomeCurrencyTaken {
        home: CurrencyRow,
    },
    /// It's the only home currency, and there must be one.
    HomeCurrencyRequired,
    /// Another active currency has the code, which would make lookups by code ambiguous.
    DuplicateCode {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertCurrencyError {
    fn from(error: RepositoryError) -> Self {
        UpsertCurrencyError::DatabaseError(error)
    }
}

/// Active or not, as the services that value stock in it look it up.
pub fn home_currencies(
    connection: &StorageConnection,
) -> Result<Vec<CurrencyRow>, RepositoryError> {
    Ok(CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .into_iter()
        .map(|currency| currency.currency_row)
        .collect())
}

/// Adds or updates one currency. Joins the caller's transaction when there is one, so an import's
/// earlier rows count. `date_updated` is when the currency last changed: a save that changes
/// anything sets it to `today`, the date in the user's time zone, whatever the caller passes,
/// and a save that changes nothing writes nothing.
pub fn upsert_currency(
    connection: &StorageConnection,
    currency: &CurrencyRow,
    today: NaiveDate,
) -> Result<(), UpsertCurrencyError> {
    save(connection, currency, today, true)
}

/// As `upsert_currency`, but never refuses a save for the home currency it leaves, none or a
/// second: the caller checks there is exactly one once all its saves are made, so a batch such as
/// an import can move it in either order.
pub fn upsert_currency_leaving_home(
    connection: &StorageConnection,
    currency: &CurrencyRow,
    today: NaiveDate,
) -> Result<(), UpsertCurrencyError> {
    save(connection, currency, today, false)
}

fn save(
    connection: &StorageConnection,
    currency: &CurrencyRow,
    today: NaiveDate,
    check_home: bool,
) -> Result<(), UpsertCurrencyError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertCurrencyError> {
            let repo = CurrencyRowRepository::new(connection);
            let saved = repo.find_one_by_id(&currency.id)?;
            let unchanged = saved.as_ref().is_some_and(|saved| {
                *saved
                    == CurrencyRow {
                        date_updated: saved.date_updated,
                        ..currency.clone()
                    }
            });
            if unchanged {
                return Ok(());
            }
            validate(connection, currency, saved.as_ref(), check_home)?;
            repo.upsert_one(&CurrencyRow {
                date_updated: Some(today),
                ..currency.clone()
            })?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Only a save that brings in a problem is refused, so a saved currency that already has one stays
/// editable.
fn validate(
    connection: &StorageConnection,
    currency: &CurrencyRow,
    saved: Option<&CurrencyRow>,
    check_home: bool,
) -> Result<(), UpsertCurrencyError> {
    if currency.code.trim().is_empty() {
        return Err(UpsertCurrencyError::CodeRequired);
    }
    let repo = CurrencyRowRepository::new(connection);

    if currency.rate <= 0.0 && saved.is_none_or(|saved| saved.rate != currency.rate) {
        return Err(UpsertCurrencyError::RateNotPositive);
    }
    // Rates are against the home currency, so its own is 1.
    let was_home = saved.is_some_and(|saved| saved.is_home_currency);
    if currency.is_home_currency
        && currency.rate != 1.0
        && (!was_home || saved.is_some_and(|saved| saved.rate != currency.rate))
    {
        return Err(UpsertCurrencyError::HomeRateNotOne);
    }
    if currency.is_home_currency
        && !currency.is_active
        && (!was_home || saved.is_some_and(|saved| saved.is_active))
    {
        return Err(UpsertCurrencyError::HomeCurrencyInactive);
    }
    if check_home
        && currency.is_home_currency
        && saved.is_none_or(|saved| !saved.is_home_currency)
        && let Some(home) = home_currencies(connection)?
            .into_iter()
            .find(|other| other.id != currency.id)
    {
        return Err(UpsertCurrencyError::HomeCurrencyTaken { home });
    }
    if check_home
        && was_home
        && !currency.is_home_currency
        && home_currencies(connection)?
            .iter()
            .all(|home| home.id == currency.id)
    {
        return Err(UpsertCurrencyError::HomeCurrencyRequired);
    }
    let brings_in_clash = currency.is_active
        && saved.is_none_or(|saved| {
            !saved.is_active || trim_spaces(&saved.code) != trim_spaces(&currency.code)
        });
    if brings_in_clash
        && let Some(other) = repo
            .find_by_trimmed_code(&currency.code)?
            .into_iter()
            .find(|other| other.is_active && other.id != currency.id)
    {
        return Err(UpsertCurrencyError::DuplicateCode { other_id: other.id });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    /// The importing user's date, pinned so a run across midnight can't change it.
    fn today() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 11, 18).unwrap()
    }

    fn currency(id: &str, code: &str, is_home_currency: bool, is_active: bool) -> CurrencyRow {
        CurrencyRow {
            id: id.to_string(),
            code: code.to_string(),
            rate: 1.0,
            is_home_currency,
            date_updated: None,
            is_active,
        }
    }

    #[actix_rt::test]
    async fn code_is_required_and_rate_must_be_above_0() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_code_and_rate", MockDataInserts::none()).await;

        assert_eq!(
            upsert_currency(&connection, &currency("a", " ", false, true), today()),
            Err(UpsertCurrencyError::CodeRequired)
        );
        for rate in [0.0, -1.0] {
            assert_eq!(
                upsert_currency(
                    &connection,
                    &CurrencyRow {
                        rate,
                        ..currency("a", "NZD", false, true)
                    },
                    today()
                ),
                Err(UpsertCurrencyError::RateNotPositive)
            );
        }
    }

    #[actix_rt::test]
    async fn a_save_that_changes_something_sets_date_updated_to_today() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_date_updated", MockDataInserts::none()).await;
        let repo = CurrencyRowRepository::new(&connection);
        let saved = CurrencyRow {
            date_updated: NaiveDate::from_ymd_opt(2026, 1, 15),
            ..currency("a", "NZD", false, true)
        };
        repo.upsert_one(&saved).unwrap();

        // The caller's date_updated alone is no change.
        upsert_currency(
            &connection,
            &CurrencyRow {
                date_updated: None,
                ..saved.clone()
            },
            today(),
        )
        .unwrap();
        assert_eq!(repo.find_one_by_id("a").unwrap(), Some(saved.clone()));

        let new_rate = CurrencyRow {
            rate: 1.6,
            date_updated: NaiveDate::from_ymd_opt(2020, 1, 1),
            ..saved
        };
        upsert_currency(&connection, &new_rate, today()).unwrap();
        assert_eq!(
            repo.find_one_by_id("a").unwrap(),
            Some(CurrencyRow {
                date_updated: Some(today()),
                ..new_rate
            })
        );
    }

    #[actix_rt::test]
    async fn the_home_currency_has_a_rate_of_1_and_stays_active() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_home_rate_active", MockDataInserts::none()).await;
        let usd = currency("usd", "USD", true, true);
        upsert_currency(&connection, &usd, today()).unwrap();

        assert_eq!(
            upsert_currency(
                &connection,
                &CurrencyRow {
                    rate: 1.2,
                    ..usd.clone()
                },
                today()
            ),
            Err(UpsertCurrencyError::HomeRateNotOne)
        );
        assert_eq!(
            upsert_currency(
                &connection,
                &CurrencyRow {
                    rate: 1.6,
                    ..currency("nzd", "NZD", true, true)
                },
                today()
            ),
            Err(UpsertCurrencyError::HomeRateNotOne)
        );
        assert_eq!(
            upsert_currency(&connection, &currency("usd", "USD", true, false), today()),
            Err(UpsertCurrencyError::HomeCurrencyInactive)
        );
        // No longer the home currency, it can be, in a batch that gives another the home
        // currency.
        upsert_currency_leaving_home(&connection, &currency("usd", "USD", false, false), today())
            .unwrap();

        // A saved home currency that already breaks either rule stays editable.
        let legacy = CurrencyRow {
            rate: 1.2,
            ..currency("eur", "EUR", true, false)
        };
        CurrencyRowRepository::new(&connection)
            .upsert_one(&legacy)
            .unwrap();
        upsert_currency(
            &connection,
            &CurrencyRow {
                code: "EURO".to_string(),
                ..legacy
            },
            today(),
        )
        .unwrap();
    }

    #[actix_rt::test]
    async fn a_saved_rate_of_0_stays_editable() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_saved_zero_rate", MockDataInserts::none()).await;
        let zero = CurrencyRow {
            rate: 0.0,
            ..currency("a", "NZD", false, true)
        };
        CurrencyRowRepository::new(&connection)
            .upsert_one(&zero)
            .unwrap();

        upsert_currency(
            &connection,
            &CurrencyRow {
                is_active: false,
                ..zero
            },
            today(),
        )
        .unwrap();
    }

    #[actix_rt::test]
    async fn only_one_currency_can_be_the_home_currency() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_one_home", MockDataInserts::none()).await;
        // Inactive, as legacy mSupply can send it, but still the home currency.
        let usd = currency("usd", "USD", true, false);
        CurrencyRowRepository::new(&connection)
            .upsert_one(&usd)
            .unwrap();

        assert_eq!(
            upsert_currency(&connection, &currency("nzd", "NZD", true, true), today()),
            Err(UpsertCurrencyError::HomeCurrencyTaken { home: usd.clone() })
        );
        // The home currency itself can still be edited, but not stop being the home currency
        // with no other to take over.
        upsert_currency(&connection, &currency("usd", "USD", true, true), today()).unwrap();
        assert_eq!(
            upsert_currency(&connection, &currency("usd", "USD", false, true), today()),
            Err(UpsertCurrencyError::HomeCurrencyRequired)
        );
        // Moving it takes a batch that checks the home currency itself once its saves are made,
        // as an import does: one save at a time leaves none or two between them.
        upsert_currency_leaving_home(&connection, &currency("nzd", "NZD", true, true), today())
            .unwrap();
        upsert_currency_leaving_home(&connection, &currency("usd", "USD", false, true), today())
            .unwrap();
        assert_eq!(
            home_currencies(&connection).unwrap(),
            [CurrencyRow {
                date_updated: Some(today()),
                ..currency("nzd", "NZD", true, true)
            }]
        );
    }

    #[actix_rt::test]
    async fn an_active_currency_cannot_take_another_active_currencys_code() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_duplicate_code", MockDataInserts::none()).await;
        let duplicate = || {
            Err(UpsertCurrencyError::DuplicateCode {
                other_id: "nzd".to_string(),
            })
        };
        upsert_currency(&connection, &currency("nzd", "NZD", false, true), today()).unwrap();
        upsert_currency(&connection, &currency("aud", "AUD", false, true), today()).unwrap();
        upsert_currency(&connection, &currency("old", "NZD", false, false), today()).unwrap();

        // Added, recoded or made active with the code, spaces around it included.
        assert_eq!(
            upsert_currency(&connection, &currency("new", " NZD", false, true), today()),
            duplicate()
        );
        assert_eq!(
            upsert_currency(&connection, &currency("aud", "NZD", false, true), today()),
            duplicate()
        );
        assert_eq!(
            upsert_currency(&connection, &currency("old", "NZD", false, true), today()),
            duplicate()
        );
        // Another letter case is another code.
        upsert_currency(&connection, &currency("new", "nzd", false, true), today()).unwrap();
    }

    #[actix_rt::test]
    async fn currencies_that_already_share_a_code_can_still_be_edited() {
        let (_, connection, _, _) = setup_all(
            "upsert_currency_existing_duplicates",
            MockDataInserts::none(),
        )
        .await;
        let repo = CurrencyRowRepository::new(&connection);
        repo.upsert_one(&currency("a", "NZD", false, true)).unwrap();
        repo.upsert_one(&currency("b", "NZD", false, true)).unwrap();

        let edited = CurrencyRow {
            rate: 1.6,
            ..currency("b", "NZD", false, true)
        };
        upsert_currency(&connection, &edited, today()).unwrap();
        assert_eq!(
            repo.find_one_by_id("b").unwrap(),
            Some(CurrencyRow {
                date_updated: Some(today()),
                ..edited
            })
        );
    }
}
