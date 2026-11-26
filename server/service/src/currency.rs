use repository::{
    Currency, CurrencyFilter, CurrencyRepository, CurrencyRow, CurrencyRowRepository, CurrencySort,
    CurrencyUser, EqualFilter, RepositoryError, StorageConnection, trim_spaces,
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
    /// Records are valued in it as the home currency, so it must stay the home currency.
    HomeCurrencyInUse(CurrencyUser),
    /// Another active currency has the code, which would make lookups by code ambiguous.
    DuplicateCode {
        other_id: String,
    },
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

/// Adds or updates one currency, which `currency_errors` has passed. `date_updated` is when the
/// currency last changed, so the caller saves only a changed currency, and it's set to `today`,
/// the date in the user's time zone, whatever the caller passes. Never refuses a save for the
/// home currency it leaves, none or a second: the caller checks there is exactly one once all its
/// saves are made, so a batch such as an import can move it in either order.
pub fn upsert_currency_unchecked(
    connection: &StorageConnection,
    currency: &CurrencyRow,
    today: NaiveDate,
) -> Result<(), RepositoryError> {
    CurrencyRowRepository::new(connection).upsert_one(&CurrencyRow {
        date_updated: Some(today),
        ..currency.clone()
    })
}

/// Every rule `currency` breaks. Only what the save brings in counts, so a saved currency that
/// already breaks one stays editable.
pub fn currency_errors(
    connection: &StorageConnection,
    currency: &CurrencyRow,
    saved: Option<&CurrencyRow>,
) -> Result<Vec<UpsertCurrencyError>, RepositoryError> {
    let mut errors = Vec::new();
    if currency.code.trim().is_empty() {
        errors.push(UpsertCurrencyError::CodeRequired);
    }
    let repo = CurrencyRowRepository::new(connection);

    if currency.rate <= 0.0 && saved.is_none_or(|saved| saved.rate != currency.rate) {
        errors.push(UpsertCurrencyError::RateNotPositive);
    }
    // Rates are against the home currency, so its own is 1.
    let was_home = saved.is_some_and(|saved| saved.is_home_currency);
    if currency.is_home_currency
        && currency.rate != 1.0
        && (!was_home || saved.is_some_and(|saved| saved.rate != currency.rate))
    {
        errors.push(UpsertCurrencyError::HomeRateNotOne);
    }
    if currency.is_home_currency
        && !currency.is_active
        && (!was_home || saved.is_some_and(|saved| saved.is_active))
    {
        errors.push(UpsertCurrencyError::HomeCurrencyInactive);
    }
    if was_home
        && !currency.is_home_currency
        && let Some(user) = repo.used_by(&currency.id)?
    {
        errors.push(UpsertCurrencyError::HomeCurrencyInUse(user));
    }
    let brings_in_clash = currency.is_active
        && !trim_spaces(&currency.code).is_empty()
        && saved.is_none_or(|saved| {
            !saved.is_active || trim_spaces(&saved.code) != trim_spaces(&currency.code)
        });
    if brings_in_clash
        && let Some(other) = repo
            .find_by_trimmed_code(&currency.code)?
            .into_iter()
            .find(|other| other.is_active && other.id != currency.id)
    {
        errors.push(UpsertCurrencyError::DuplicateCode { other_id: other.id });
    }
    Ok(errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use chrono::NaiveDate;
    use repository::{
        PurchaseOrderRow, PurchaseOrderRowRepository,
        mock::{MockDataInserts, mock_purchase_order_a},
        test_db::setup_all,
    };

    /// The importing user's date, pinned so a run across midnight can't change it.
    fn today() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 11, 18).unwrap()
    }

    fn save(
        connection: &StorageConnection,
        currency: &CurrencyRow,
        today: NaiveDate,
    ) -> Result<(), Vec<UpsertCurrencyError>> {
        let saved = CurrencyRowRepository::new(connection)
            .find_one_by_id(&currency.id)
            .unwrap();
        save_checked(
            currency_errors(connection, currency, saved.as_ref()),
            || upsert_currency_unchecked(connection, currency, today),
        )
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
            save(&connection, &currency("a", " ", false, true), today()),
            Err(vec![UpsertCurrencyError::CodeRequired])
        );
        for rate in [0.0, -1.0] {
            assert_eq!(
                save(
                    &connection,
                    &CurrencyRow {
                        rate,
                        ..currency("a", "NZD", false, true)
                    },
                    today()
                ),
                Err(vec![UpsertCurrencyError::RateNotPositive])
            );
        }
    }

    #[actix_rt::test]
    async fn a_save_sets_date_updated_to_today() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_date_updated", MockDataInserts::none()).await;
        let repo = CurrencyRowRepository::new(&connection);
        let saved = CurrencyRow {
            date_updated: NaiveDate::from_ymd_opt(2026, 1, 15),
            ..currency("a", "NZD", false, true)
        };
        repo.upsert_one(&saved).unwrap();

        // Whatever the caller's date_updated.
        let new_rate = CurrencyRow {
            rate: 1.6,
            date_updated: NaiveDate::from_ymd_opt(2020, 1, 1),
            ..saved
        };
        save(&connection, &new_rate, today()).unwrap();
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
        save(&connection, &usd, today()).unwrap();

        assert_eq!(
            save(
                &connection,
                &CurrencyRow {
                    rate: 1.2,
                    ..usd.clone()
                },
                today()
            ),
            Err(vec![UpsertCurrencyError::HomeRateNotOne])
        );
        assert_eq!(
            save(
                &connection,
                &CurrencyRow {
                    rate: 1.6,
                    ..currency("nzd", "NZD", true, true)
                },
                today()
            ),
            Err(vec![UpsertCurrencyError::HomeRateNotOne])
        );
        assert_eq!(
            save(&connection, &currency("usd", "USD", true, false), today()),
            Err(vec![UpsertCurrencyError::HomeCurrencyInactive])
        );
        // No longer the home currency, it can be.
        save(&connection, &currency("usd", "USD", false, false), today()).unwrap();

        // A saved home currency that already breaks either rule stays editable.
        let legacy = CurrencyRow {
            rate: 1.2,
            ..currency("eur", "EUR", true, false)
        };
        CurrencyRowRepository::new(&connection)
            .upsert_one(&legacy)
            .unwrap();
        save(
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
    async fn a_home_currency_records_are_valued_in_stays_the_home_currency() {
        let (_, connection, _, _) = setup_all(
            "upsert_currency_home_in_use",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let usd = currency("usd", "USD", true, true);
        save(&connection, &usd, today()).unwrap();
        PurchaseOrderRowRepository::new(&connection)
            .upsert_one(&PurchaseOrderRow {
                currency_id: Some("usd".to_string()),
                ..mock_purchase_order_a()
            })
            .unwrap();

        // Even in a batch that gives another the home currency.
        save(&connection, &currency("nzd", "NZD", true, true), today()).unwrap();
        assert_eq!(
            save(&connection, &currency("usd", "USD", false, true), today()),
            Err(vec![UpsertCurrencyError::HomeCurrencyInUse(
                CurrencyUser::PurchaseOrder
            )])
        );
        // Its other columns can still change.
        save(&connection, &currency("usd", "USD", true, true), today()).unwrap();
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

        save(
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
    async fn an_active_currency_cannot_take_another_active_currencys_code() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_duplicate_code", MockDataInserts::none()).await;
        let duplicate = || {
            Err(vec![UpsertCurrencyError::DuplicateCode {
                other_id: "nzd".to_string(),
            }])
        };
        save(&connection, &currency("nzd", "NZD", false, true), today()).unwrap();
        save(&connection, &currency("aud", "AUD", false, true), today()).unwrap();
        save(&connection, &currency("old", "NZD", false, false), today()).unwrap();

        // Added, recoded or made active with the code, spaces around it included.
        assert_eq!(
            save(&connection, &currency("new", " NZD", false, true), today()),
            duplicate()
        );
        assert_eq!(
            save(&connection, &currency("aud", "NZD", false, true), today()),
            duplicate()
        );
        assert_eq!(
            save(&connection, &currency("old", "NZD", false, true), today()),
            duplicate()
        );
        // Another letter case is another code.
        save(&connection, &currency("new", "nzd", false, true), today()).unwrap();
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
        save(&connection, &edited, today()).unwrap();
        assert_eq!(
            repo.find_one_by_id("b").unwrap(),
            Some(CurrencyRow {
                date_updated: Some(today()),
                ..edited
            })
        );
    }
}
