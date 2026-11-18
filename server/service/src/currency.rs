use repository::{
    Currency, CurrencyFilter, CurrencyRepository, CurrencyRow, CurrencyRowRepository, CurrencySort,
    EqualFilter, RepositoryError, StorageConnection, trim_spaces,
};

use crate::{ListError, ListResult, i64_to_u32, service_provider::ServiceContext};

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
    /// Another currency, active or not, is the home currency.
    HomeCurrencyTaken {
        home: CurrencyRow,
    },
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

/// Adds or updates one currency. Joins the caller's transaction when there is one, so an import's
/// earlier rows count.
pub fn upsert_currency(
    connection: &StorageConnection,
    currency: &CurrencyRow,
) -> Result<(), UpsertCurrencyError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertCurrencyError> {
            validate(connection, currency)?;
            CurrencyRowRepository::new(connection).upsert_one(currency)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Only a save that brings in a problem is refused, so a saved currency that already has one stays
/// editable.
fn validate(
    connection: &StorageConnection,
    currency: &CurrencyRow,
) -> Result<(), UpsertCurrencyError> {
    if currency.code.trim().is_empty() {
        return Err(UpsertCurrencyError::CodeRequired);
    }
    let repo = CurrencyRowRepository::new(connection);
    let saved = repo.find_one_by_id(&currency.id)?;
    let saved = saved.as_ref();

    if currency.rate <= 0.0 && saved.is_none_or(|saved| saved.rate != currency.rate) {
        return Err(UpsertCurrencyError::RateNotPositive);
    }
    // Inactive ones count too: the home currency is found whether it's active or not.
    if currency.is_home_currency
        && saved.is_none_or(|saved| !saved.is_home_currency)
        && let Some(home) = repo
            .find_all()?
            .into_iter()
            .find(|other| other.is_home_currency && other.id != currency.id)
    {
        return Err(UpsertCurrencyError::HomeCurrencyTaken { home });
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
    use repository::{mock::MockDataInserts, test_db::setup_all};

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
            upsert_currency(&connection, &currency("a", " ", false, true)),
            Err(UpsertCurrencyError::CodeRequired)
        );
        for rate in [0.0, -1.0] {
            assert_eq!(
                upsert_currency(
                    &connection,
                    &CurrencyRow {
                        rate,
                        ..currency("a", "NZD", false, true)
                    }
                ),
                Err(UpsertCurrencyError::RateNotPositive)
            );
        }
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
        )
        .unwrap();
    }

    #[actix_rt::test]
    async fn only_one_currency_can_be_the_home_currency() {
        let (_, connection, _, _) =
            setup_all("upsert_currency_one_home", MockDataInserts::none()).await;
        // Inactive, but still the home currency.
        let usd = currency("usd", "USD", true, false);
        upsert_currency(&connection, &usd).unwrap();

        assert_eq!(
            upsert_currency(&connection, &currency("nzd", "NZD", true, true)),
            Err(UpsertCurrencyError::HomeCurrencyTaken { home: usd.clone() })
        );
        // The home currency itself can still be edited.
        upsert_currency(&connection, &currency("usd", "USD", true, true)).unwrap();

        upsert_currency(&connection, &currency("usd", "USD", false, true)).unwrap();
        upsert_currency(&connection, &currency("nzd", "NZD", true, true)).unwrap();
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
        upsert_currency(&connection, &currency("nzd", "NZD", false, true)).unwrap();
        upsert_currency(&connection, &currency("aud", "AUD", false, true)).unwrap();
        upsert_currency(&connection, &currency("old", "NZD", false, false)).unwrap();

        // Added, recoded or made active with the code, spaces around it included.
        assert_eq!(
            upsert_currency(&connection, &currency("new", " NZD", false, true)),
            duplicate()
        );
        assert_eq!(
            upsert_currency(&connection, &currency("aud", "NZD", false, true)),
            duplicate()
        );
        assert_eq!(
            upsert_currency(&connection, &currency("old", "NZD", false, true)),
            duplicate()
        );
        // Another letter case is another code.
        upsert_currency(&connection, &currency("new", "nzd", false, true)).unwrap();
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
        upsert_currency(&connection, &edited).unwrap();
        assert_eq!(repo.find_one_by_id("b").unwrap(), Some(edited));
    }
}
