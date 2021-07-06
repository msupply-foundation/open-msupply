use crate::database::repository::{
    PgSqlxRepository, Repository, RepositoryError, UserAccountRepository,
};
use crate::database::schema::UserAccountRow;

use async_trait::async_trait;

#[derive(Clone)]
pub struct UserAccountPgSqlxRepository {
    pool: sqlx::PgPool,
}

impl Repository for UserAccountPgSqlxRepository {}
impl PgSqlxRepository for UserAccountPgSqlxRepository {
    fn new(pool: sqlx::PgPool) -> UserAccountPgSqlxRepository {
        UserAccountPgSqlxRepository { pool }
    }
}

#[async_trait]
impl UserAccountRepository for UserAccountPgSqlxRepository {
    async fn insert_one(&self, user_account: &UserAccountRow) -> Result<(), RepositoryError> {
        sqlx::query!(
            r#"
            INSERT INTO user_account (id, username, password, email)
            VALUES ($1, $2, $3, $4)
            "#,
            user_account.id,
            user_account.username,
            user_account.password,
            user_account.email,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<UserAccountRow, RepositoryError> {
        let user_account = sqlx::query_as!(
            UserAccountRow,
            r#"
            SELECT id, username, password, email
            FROM user_account
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(user_account)
    }
}
