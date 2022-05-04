use crate::{Permission, UserAccountRow, UserPermissionRow, UserStoreJoinRow};

// users

pub fn mock_user_account_a() -> UserAccountRow {
    UserAccountRow {
        id: String::from("user_account_a"),
        username: String::from("username_a"),
        hashed_password: String::from("password_a"),
        email: Some(String::from("username_a@openmsupply.foundation")),
    }
}

pub fn mock_user_account_b() -> UserAccountRow {
    UserAccountRow {
        id: String::from("user_account_b"),
        username: String::from("username_b"),
        hashed_password: String::from("password_b"),
        email: Some(String::from("username_b@openmsupply.foundation")),
    }
}

pub fn mock_user_store_join_a_store_a() -> UserStoreJoinRow {
    UserStoreJoinRow {
        id: "user_store_join_a_store_a".to_string(),
        user_id: "user_account_a".to_string(),
        store_id: "store_a".to_string(),
        is_default: true,
    }
}

// user store joins

pub fn mock_user_store_join_a_store_b() -> UserStoreJoinRow {
    UserStoreJoinRow {
        id: "user_store_join_a_store_b".to_string(),
        user_id: "user_account_a".to_string(),
        store_id: "store_b".to_string(),
        is_default: false,
    }
}

pub fn mock_user_store_join_b_store_a() -> UserStoreJoinRow {
    UserStoreJoinRow {
        id: "user_store_join_b_store_a".to_string(),
        user_id: "user_account_b".to_string(),
        store_id: "store_a".to_string(),
        is_default: true,
    }
}

// permissions

pub fn mock_user_permission_a1() -> UserPermissionRow {
    UserPermissionRow {
        id: "user_permission_a1".to_string(),
        user_id: "user_account_a".to_string(),
        store_id: Some("store_a".to_string()),
        permission: Permission::StocktakeMutate,
    }
}

pub fn mock_user_permission_a2() -> UserPermissionRow {
    UserPermissionRow {
        id: "user_permission_a2".to_string(),
        user_id: "user_account_a".to_string(),
        store_id: Some("store_a".to_string()),
        permission: Permission::RequisitionQuery,
    }
}

pub fn mock_user_permission_b1() -> UserPermissionRow {
    UserPermissionRow {
        id: "user_permission_b1".to_string(),
        user_id: "user_account_b".to_string(),
        store_id: Some("store_a".to_string()),
        permission: Permission::OutboundShipmentQuery,
    }
}

pub fn mock_user_accounts() -> Vec<UserAccountRow> {
    vec![mock_user_account_a(), mock_user_account_b()]
}

pub fn mock_user_store_joins() -> Vec<UserStoreJoinRow> {
    vec![
        mock_user_store_join_a_store_a(),
        mock_user_store_join_a_store_b(),
        mock_user_store_join_b_store_a(),
    ]
}

pub fn mock_user_permissions() -> Vec<UserPermissionRow> {
    vec![
        mock_user_permission_a1(),
        mock_user_permission_a2(),
        mock_user_permission_b1(),
    ]
}
