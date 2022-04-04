use super::diesel_schema::user_account;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, Default)]
#[table_name = "user_account"]
pub struct UserAccountRow {
    pub id: String,
    pub username: String,
    pub hashed_password: String,
    pub email: Option<String>,
}
