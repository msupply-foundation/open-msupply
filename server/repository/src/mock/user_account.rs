use crate::schema::UserAccountRow;

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

pub fn mock_user_accounts() -> Vec<UserAccountRow> {
    vec![mock_user_account_a(), mock_user_account_b()]
}
