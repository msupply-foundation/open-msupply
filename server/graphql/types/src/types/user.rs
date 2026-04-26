use super::{StorePreferenceNode, UserStorePermissionConnector};
use async_graphql::{Context, Enum, ErrorExtensions, Object, Result, SimpleObject};
use chrono::NaiveDate;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use repository::{CurrencyFilter, NameRowRepository, User, UserStore};
use service::permission::permissions;

pub struct UserStoreNode {
    user_store: UserStore,
    name: String,
    home_currency_code: Option<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::store_row
::StoreMode")]
pub enum StoreModeNodeType {
    Store,
    Dispensary,
}

#[Object]
impl UserStoreNode {
    pub async fn id(&self) -> &str {
        &self.user_store.store_row.id
    }

    pub async fn code(&self) -> &str {
        &self.user_store.store_row.code
    }

    pub async fn name_id(&self) -> &str {
        &self.user_store.store_row.name_id
    }

    pub async fn name(&self) -> &str {
        &self.name
    }

    pub async fn preferences(&self) -> StorePreferenceNode {
        StorePreferenceNode::from_domain(self.user_store.store_preferences.clone())
    }

    pub async fn store_mode(&self) -> StoreModeNodeType {
        StoreModeNodeType::from(self.user_store.store_row.store_mode.clone())
    }

    pub async fn created_date(&self) -> &Option<NaiveDate> {
        &self.user_store.store_row.created_date
    }

    pub async fn home_currency_code(&self) -> &Option<String> {
        &self.home_currency_code
    }

    pub async fn is_disabled(&self) -> bool {
        self.user_store.store_row.is_disabled
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::user_row::LanguageType")]
pub enum LanguageTypeNode {
    English,
    French,
    Spanish,
    Laos,
    Khmer,
    Portuguese,
    Russian,
    Tetum,
}

#[derive(SimpleObject)]
pub struct UserStoreConnector {
    total_count: u32,
    nodes: Vec<UserStoreNode>,
}

pub struct UserNode {
    pub user: User,
}

#[Object]
impl UserNode {
    /// Internal user id
    pub async fn user_id(&self) -> &str {
        &self.user.user_row.id
    }

    /// The user's email address
    pub async fn email(&self) -> &Option<String> {
        &self.user.user_row.email
    }

    pub async fn username(&self) -> &str {
        &self.user.user_row.username
    }

    pub async fn default_store(&self, ctx: &Context<'_>) -> Result<Option<UserStoreNode>> {
        let home_currency_code = resolve_home_currency_code(ctx)?;
        let names = resolve_store_names(ctx, &self.user.stores)?;
        Ok(self.user.default_store().map(|user_store| {
            let name = names
                .get(&user_store.store_row.name_id)
                .cloned()
                .unwrap_or_default();
            UserStoreNode {
                user_store: user_store.clone(),
                name,
                home_currency_code: home_currency_code.clone(),
            }
        }))
    }

    pub async fn stores(&self, ctx: &Context<'_>) -> Result<UserStoreConnector> {
        let home_currency_code = resolve_home_currency_code(ctx)?;
        let names = resolve_store_names(ctx, &self.user.stores)?;
        let nodes = self
            .user
            .stores
            .iter()
            .map(|user_store| {
                let name = names
                    .get(&user_store.store_row.name_id)
                    .cloned()
                    .unwrap_or_default();
                UserStoreNode {
                    user_store: user_store.clone(),
                    name,
                    home_currency_code: home_currency_code.clone(),
                }
            })
            .collect::<Vec<_>>();
        Ok(UserStoreConnector {
            total_count: nodes.len() as u32,
            nodes,
        })
    }

    pub async fn permissions(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
    ) -> Result<UserStorePermissionConnector> {
        let service_context = ctx.service_provider().basic_context()?;

        let result = permissions(
            &service_context.connection,
            &self.user.user_row.id,
            store_id,
        )?;

        Ok(UserStorePermissionConnector::from_vec(result))
    }

    pub async fn language(&self) -> LanguageTypeNode {
        LanguageTypeNode::from(self.user.user_row.language.clone())
    }

    pub async fn first_name(&self) -> &Option<String> {
        &self.user.user_row.first_name
    }

    pub async fn last_name(&self) -> &Option<String> {
        &self.user.user_row.last_name
    }

    pub async fn phone_number(&self) -> &Option<String> {
        &self.user.user_row.phone_number
    }

    pub async fn job_title(&self) -> &Option<String> {
        &self.user.user_row.job_title
    }
}

impl UserNode {
    pub fn from_domain(user: User) -> Self {
        UserNode { user }
    }
}

fn resolve_store_names(
    ctx: &Context<'_>,
    stores: &[UserStore],
) -> Result<std::collections::HashMap<String, String>> {
    let name_ids: Vec<String> = stores
        .iter()
        .map(|s| s.store_row.name_id.clone())
        .collect();
    if name_ids.is_empty() {
        return Ok(std::collections::HashMap::new());
    }
    let service_context = ctx.service_provider().basic_context()?;
    let name_rows = NameRowRepository::new(&service_context.connection)
        .find_many_by_id(&name_ids)
        .map_err(|e| StandardGraphqlError::InternalError(format!("{:?}", e)).extend())?;
    Ok(name_rows
        .into_iter()
        .map(|n| (n.id, n.name))
        .collect())
}

fn resolve_home_currency_code(ctx: &Context<'_>) -> Result<Option<String>> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let home_currency = service_provider
        .currency_service
        .get_currencies(
            &service_context,
            Some(CurrencyFilter::new().is_home_currency(true)),
            None,
        )
        .map_err(StandardGraphqlError::from_list_error)?
        .rows
        .pop();
    Ok(home_currency.map(|c| c.currency_row.code))
}
