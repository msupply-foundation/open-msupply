use async_graphql::{dataloader::DataLoader, Context, Enum, ErrorExtensions, Object, Result};
use chrono::{DateTime, NaiveDate, Utc};
use repository::{unknown_user, StocktakeRow, StocktakeStatus};
use serde::Serialize;

use graphql_core::{
    loader::{InvoiceByIdLoader, StocktakeLineByStocktakeIdLoader, UserLoader},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use super::{InvoiceNode, StocktakeLineConnector, UserNode};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum StocktakeNodeStatus {
    New,
    Finalised,
}

pub struct StocktakeNode {
    pub stocktake: StocktakeRow,
}

#[Object]
impl StocktakeNode {
    pub async fn id(&self) -> &str {
        &self.stocktake.id
    }

    pub async fn store_id(&self) -> &str {
        &self.stocktake.store_id
    }

    /// User that created stocktake, if user is not found in system default unknown user is returned
    pub async fn user(&self, ctx: &Context<'_>) -> Result<UserNode> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();

        let user = loader
            .load_one(self.stocktake.user_id.clone())
            .await?
            .unwrap_or(unknown_user());

        Ok(UserNode::from_domain(user))
    }

    pub async fn stocktake_number(&self) -> i64 {
        self.stocktake.stocktake_number
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.stocktake.comment
    }

    pub async fn description(&self) -> &Option<String> {
        &self.stocktake.description
    }

    pub async fn is_locked(&self) -> bool {
        self.stocktake.is_locked
    }

    pub async fn status(&self) -> StocktakeNodeStatus {
        StocktakeNodeStatus::from_domain(&self.stocktake.status)
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.stocktake.created_datetime, Utc)
    }

    pub async fn stocktake_date(&self) -> &Option<NaiveDate> {
        &self.stocktake.stocktake_date
    }

    pub async fn finalised_datetime(&self) -> Option<DateTime<Utc>> {
        self.stocktake
            .finalised_datetime
            .map(|dt| DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
    }

    pub async fn inventory_addition_id(&self) -> &Option<String> {
        &self.stocktake.inventory_addition_id
    }

    pub async fn inventory_reduction_id(&self) -> &Option<String> {
        &self.stocktake.inventory_reduction_id
    }

    pub async fn inventory_addition(&self, ctx: &Context<'_>) -> Result<Option<InvoiceNode>> {
        if let Some(ref addition_id) = self.stocktake.inventory_addition_id {
            let loader = ctx.get_loader::<DataLoader<InvoiceByIdLoader>>();
            let invoice = loader.load_one(addition_id.clone()).await?.ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find inventory addition {}",
                    addition_id
                ))
                .extend(),
            )?;
            Ok(Some(InvoiceNode { invoice }))
        } else {
            Ok(None)
        }
    }

    pub async fn inventory_reduction(&self, ctx: &Context<'_>) -> Result<Option<InvoiceNode>> {
        if let Some(ref reduction_id) = self.stocktake.inventory_reduction_id {
            let loader = ctx.get_loader::<DataLoader<InvoiceByIdLoader>>();
            let invoice = loader.load_one(reduction_id.clone()).await?.ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find inventory reduction {}",
                    reduction_id
                ))
                .extend(),
            )?;
            Ok(Some(InvoiceNode { invoice }))
        } else {
            Ok(None)
        }
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<StocktakeLineConnector> {
        let loader = ctx.get_loader::<DataLoader<StocktakeLineByStocktakeIdLoader>>();

        let lines_option = loader.load_one(self.stocktake.id.clone()).await?;

        let result = match lines_option {
            None => StocktakeLineConnector::empty(),
            Some(lines) => StocktakeLineConnector::from_domain_vec(lines),
        };

        Ok(result)
    }
}

impl StocktakeNode {
    pub fn from_domain(stocktake: StocktakeRow) -> StocktakeNode {
        StocktakeNode { stocktake }
    }
}

impl StocktakeNodeStatus {
    pub fn to_domain(self) -> StocktakeStatus {
        match self {
            StocktakeNodeStatus::New => StocktakeStatus::New,
            StocktakeNodeStatus::Finalised => StocktakeStatus::Finalised,
        }
    }

    pub fn from_domain(status: &StocktakeStatus) -> StocktakeNodeStatus {
        match status {
            StocktakeStatus::New => StocktakeNodeStatus::New,
            StocktakeStatus::Finalised => StocktakeNodeStatus::Finalised,
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::{EmptyMutation, Object};

    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::{mock_user_account_a, MockDataInserts},
        unknown_user, StocktakeRow,
    };
    use serde_json::json;
    use util::inline_init;

    use crate::types::StocktakeNode;

    #[actix_rt::test]
    async fn graphql_stocktake_user_loader() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphql_stocktake_user_loader",
            MockDataInserts::none().user_accounts(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query_user_exists(&self) -> StocktakeNode {
                StocktakeNode {
                    stocktake: inline_init(|r: &mut StocktakeRow| {
                        r.user_id = mock_user_account_a().id;
                    }),
                }
            }
            pub async fn test_query_user_does_not_exist(&self) -> StocktakeNode {
                StocktakeNode {
                    stocktake: inline_init(|r: &mut StocktakeRow| {
                        r.user_id = "does not exist".to_string()
                    }),
                }
            }
        }

        let expected = json!({
            "testQueryUserExists": {
                "user": {
                    "userId": mock_user_account_a().id
                }
            },
            "testQueryUserDoesNotExist": {
                "user": {
                    "userId": unknown_user().user_row.id
                }
            },
        }
        );

        let query = r#"
        query {
            testQueryUserExists {
                ...user
            }
            testQueryUserDoesNotExist {
                ...user
            }         
        }
        fragment user on StocktakeNode {
            user {
                userId
            }
        }
        "#;

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
