use async_graphql::{
    dataloader::DataLoader, Context, ErrorExtensions, Object, Result, SimpleObject,
};
use graphql_core::{
    loader::{NameRowLoader, PermissionByIdsLoader, PermissionByIdsLoaderInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{User, UserStore};

use super::{UserStorePermissionConnector, UserStorePermissionNode};

pub struct UserStoreNode {
    user_store: UserStore,
}

#[Object]
impl UserStoreNode {
    pub async fn id(&self) -> &str {
        &self.user_store.store_row.id
    }

    pub async fn code(&self) -> &str {
        &self.user_store.store_row.code
    }

    pub async fn name(&self, ctx: &Context<'_>) -> Result<String> {
        let loader = ctx.get_loader::<DataLoader<NameRowLoader>>();

        let name_row = loader
            .load_one(self.user_store.store_row.name_id.clone())
            .await?
            .ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find name ({}) for store ({})",
                    self.user_store.store_row.name_id, self.user_store.store_row.id
                ))
                .extend(),
            )?;

        Ok(name_row.name)
    }
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
        let loader = ctx.get_loader::<DataLoader<PermissionByIdsLoader>>();
        let result_option = loader
            .load_one(PermissionByIdsLoaderInput::new(
                &store_id.clone().unwrap_or_else(|| "".to_string()),
                &self.user.user_row.id,
            ))
            .await?;

        Ok(UserStorePermissionConnector::from_vec(
            result_option.unwrap_or_else(Vec::new),
        ))
    }
}

impl UserNode {
    pub fn from_domain(user: User) -> Self {
        UserNode { user }
    }
}
