use std::collections::HashMap;

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum ApiRole {
    /// Admin user can use all API endpoints
    Admin,
    /// Normal API user
    User,
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum StoreRole {
    User,
}

#[derive(Debug, Clone)]
pub struct UserPermissions {
    pub api: Vec<ApiRole>,
    /// Store id -> list of roles for this store
    pub stores: HashMap<String, Vec<StoreRole>>,
}

pub trait PermissionServiceTrait: Send + Sync {
    fn permissions(&self, _user_id: &str) -> UserPermissions;
}

pub struct PermissionService {
    pub user_permissions: UserPermissions,
}

impl PermissionService {
    pub fn new() -> Self {
        PermissionService {
            // returns some dummy default permissions
            // TODO read permissions from the DB
            user_permissions: UserPermissions {
                api: vec![ApiRole::Admin],
                stores: HashMap::new(),
            },
        }
    }
}

impl PermissionServiceTrait for PermissionService {
    fn permissions(&self, _user_id: &str) -> UserPermissions {
        self.user_permissions.clone()
    }
}
