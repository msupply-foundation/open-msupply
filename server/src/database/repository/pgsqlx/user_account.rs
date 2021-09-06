use crate::database::repository::RepositoryError;
use crate::database::schema::UserAccountRow;

#[derive(Clone)]
pub struct UserAccountRepository {
    pool: sqlx::PgPool,
}

impl UserAccountRepository {
    pub fn new(pool: sqlx::PgPool) -> UserAccountRepository {
        UserAccountRepository { pool }
    }

    pub async fn insert_one(&self, user_account: &UserAccountRow) -> Result<(), RepositoryError> {
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

    pub async fn find_one_by_id(&self, id: &str) -> Result<UserAccountRow, RepositoryError> {
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

    pub async fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<UserAccountRow>, RepositoryError> {
        let user_accounts = sqlx::query_as!(
            UserAccountRow,
            r#"
            SELECT id, username, password, email
            FROM user_account
            WHERE id = ANY($1)
            "#,
            ids
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(user_accounts)
    }
}
