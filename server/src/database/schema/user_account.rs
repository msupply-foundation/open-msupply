use super::diesel_schema::user_account;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "user_account"]
pub struct UserAccountRow {
    pub id: String,
    pub username: String,
    pub password: String,
    pub email: Option<String>,
}
