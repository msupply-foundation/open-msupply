use crate::database::repository::Repository;
use crate::database::schema::UserAccountRow;

#[derive(Clone)]
pub struct UserAccountRepository {
    pool: sqlx::PgPool,
}

impl Repository for UserAccountRepository {}

impl UserAccountRepository {
    pub fn new(pool: sqlx::PgPool) -> UserAccountRepository {
        UserAccountRepository { pool }
    }

    pub async fn insert_one(&self, user_account: UserAccountRow) -> Result<(), sqlx::Error> {
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

    pub async fn find_one_by_id(&self, id: &str) -> Result<UserAccountRow, sqlx::Error> {
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
