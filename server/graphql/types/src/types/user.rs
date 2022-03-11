use async_graphql::*;
use repository::schema::UserAccountRow;

pub struct UserNode {
    pub user: UserAccountRow,
}

#[Object]
impl UserNode {
    /// Internal user id
    pub async fn user_id(&self) -> &str {
        &self.user.id
    }

    /// The user's email address
    pub async fn email(&self) -> &Option<String> {
        &self.user.email
    }

    pub async fn username(&self) -> &str {
        &self.user.username
    }
}

impl UserNode {
    pub fn from_domain(user: UserAccountRow) -> Self {
        UserNode { user }
    }
}
