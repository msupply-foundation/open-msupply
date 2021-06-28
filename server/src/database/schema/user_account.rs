#[derive(Clone)]
pub struct UserAccountRow {
    pub id: String,
    pub username: String,
    pub password: String,
    pub email: Option<String>,
}
