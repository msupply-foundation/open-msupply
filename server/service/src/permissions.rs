use std::collections::HashMap;

#[derive(Debug, PartialEq, Eq)]
pub enum ApiRole {
    /// Admin user can use all API endpoints
    Admin,
    /// Normal API user
    User,
}

#[derive(Debug, PartialEq, Eq)]
pub enum StoreRole {
    User,
}

#[derive(Debug)]
pub struct UserPermissions {
    pub api: Vec<ApiRole>,
    /// Store id -> list of roles for this store
    pub stores: HashMap<String, Vec<StoreRole>>,
}

pub struct PermissionService {}

impl PermissionService {
    pub fn new() -> Self {
        PermissionService {}
    }

    pub fn permissions(&self, _user_id: &str) -> UserPermissions {
        // returns some dummy default permissions
        // TODO read permissions from the DB
        UserPermissions {
            api: vec![ApiRole::User],
            stores: HashMap::new(),
        }
    }
}
