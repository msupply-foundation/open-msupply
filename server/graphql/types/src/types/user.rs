use super::{StorePreferenceNode, UserStorePermissionConnector};
use async_graphql::{
    dataloader::DataLoader, Context, Enum, ErrorExtensions, Object, Result, SimpleObject,
};
use chrono::NaiveDate;
use graphql_core::{
    loader::NameRowLoader, standard_graphql_error::StandardGraphqlError, ContextExt,
};
use repository::{CurrencyFilter, LanguageType as LanguageTypeRepo, StoreMode, User, UserStore};
use service::permission::permissions;

pub struct UserStoreNode {
    user_store: UserStore,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
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
        &self.user_store.store_row.name_link_id
    }

    pub async fn name(&self, ctx: &Context<'_>) -> Result<String> {
        let loader = ctx.get_loader::<DataLoader<NameRowLoader>>();

        let name_row = loader
            .load_one(self.user_store.store_row.name_link_id.clone())
            .await?
            .ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find name ({}) for store ({})",
                    self.user_store.store_row.name_link_id, self.user_store.store_row.id
                ))
                .extend(),
            )?;

        Ok(name_row.name)
    }

    pub async fn preferences(&self) -> StorePreferenceNode {
        StorePreferenceNode::from_domain(self.user_store.store_preferences.clone())
    }

    pub async fn store_mode(&self) -> StoreModeNodeType {
        StoreModeNodeType::from_domain(&self.user_store.store_row.store_mode)
    }

    pub async fn created_date(&self) -> &Option<NaiveDate> {
        &self.user_store.store_row.created_date
    }
    pub async fn home_currency_code(&self, ctx: &Context<'_>) -> Result<Option<String>> {
        let service_provider = ctx.service_provider();
        let currency_provider = &service_provider.currency_service;
        let service_context = service_provider.basic_context()?;

        let home_currency = currency_provider
            .get_currencies(
                &service_context,
                Some(CurrencyFilter::new().is_home_currency(true)),
                None,
            )
            .map_err(StandardGraphqlError::from_list_error)?
            .rows
            .pop();

        match home_currency {
            Some(home_currency) => Ok(Some(home_currency.currency_row.code)),
            None => Ok(None),
        }
    }
    pub async fn is_disabled(&self) -> bool {
        self.user_store.store_row.is_disabled
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum LanguageType {
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

    pub async fn default_store(&self) -> Option<UserStoreNode> {
        self.user.default_store().map(|user_store| UserStoreNode {
            user_store: user_store.clone(),
        })
    }

    pub async fn stores(&self) -> UserStoreConnector {
        let nodes: Vec<UserStoreNode> = self
            .user
            .stores
            .iter()
            .map(|user_store| UserStoreNode {
                user_store: user_store.clone(),
            })
            .collect();
        UserStoreConnector {
            total_count: nodes.len() as u32,
            nodes,
        }
    }

    pub async fn permissions(
        &self,
        ctx: &Context<'_>,
        store_id: Option<String>,
    ) -> Result<UserStorePermissionConnector> {
        let service_provider = &ctx.service_provider().connection_manager;

        let result = match store_id {
            Some(store_id) => permissions(
                service_provider,
                &self.user.user_row.id.clone(),
                Some(store_id),
            ),
            None => permissions(service_provider, &self.user.user_row.id.clone(), None),
        }?;

        Ok(UserStorePermissionConnector::from_vec(result))
    }

    pub async fn language(&self) -> LanguageType {
        LanguageType::from_domain(&self.user.user_row.language)
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

impl LanguageType {
    fn from_domain(from: &LanguageTypeRepo) -> Self {
        match from {
            LanguageTypeRepo::English => Self::English,
            LanguageTypeRepo::French => Self::French,
            LanguageTypeRepo::Spanish => Self::Spanish,
            LanguageTypeRepo::Laos => Self::Laos,
            LanguageTypeRepo::Khmer => Self::Khmer,
            LanguageTypeRepo::Portuguese => Self::Portuguese,
            LanguageTypeRepo::Russian => Self::Russian,
            LanguageTypeRepo::Tetum => Self::Tetum,
        }
    }
}

impl StoreModeNodeType {
    pub fn from_domain(from: &StoreMode) -> StoreModeNodeType {
        match from {
            StoreMode::Store => Self::Store,
            StoreMode::Dispensary => Self::Dispensary,
        }
    }
}

impl UserNode {
    pub fn from_domain(user: User) -> Self {
        UserNode { user }
    }
}
