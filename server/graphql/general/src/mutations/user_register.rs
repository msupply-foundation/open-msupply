use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError, RecordAlreadyExist},
    ContextExt,
};
use repository::schema::UserAccountRow;
use service::user_account::{
    CreateUserAccount, CreateUserAccountError as ServiceError, UserAccountService,
};

pub struct RegisteredUser {
    pub user: UserAccountRow,
}

#[Object]
impl RegisteredUser {
    pub async fn id(&self) -> &str {
        &self.user.id
    }

    pub async fn username(&self) -> &str {
        &self.user.username
    }

    pub async fn email(&self) -> &Option<String> {
        &self.user.email
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UserRegisterErrorInterface {
    /// User already exists
    RecordAlreadyExist(RecordAlreadyExist),
    DatabaseError(DatabaseError),
    InternalError(InternalError),
}

#[derive(SimpleObject)]
pub struct UserRegisterError {
    pub error: UserRegisterErrorInterface,
}

#[derive(Union)]
pub enum UserRegisterResponse {
    Error(UserRegisterError),
    Response(RegisteredUser),
}

#[derive(InputObject)]
pub struct UserRegisterInput {
    username: String,
    password: String,
    email: Option<String>,
}

pub fn user_register(ctx: &Context<'_>, input: UserRegisterInput) -> UserRegisterResponse {
    let connection_manager = ctx.get_connection_manager();
    let con = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return UserRegisterResponse::Error(UserRegisterError {
                error: UserRegisterErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    let service = UserAccountService::new(&con);
    let user = match service.create_user(CreateUserAccount {
        username: input.username,
        password: input.password,
        email: input.email,
    }) {
        Ok(user) => user,
        Err(err) => {
            return UserRegisterResponse::Error(UserRegisterError {
                error: match err {
                    ServiceError::UserNameExist => {
                        UserRegisterErrorInterface::RecordAlreadyExist(RecordAlreadyExist)
                    }
                    ServiceError::PasswordHashError(_) => {
                        UserRegisterErrorInterface::InternalError(InternalError(
                            "Failed to hash password".to_string(),
                        ))
                    }
                    ServiceError::DatabaseError(err) => {
                        UserRegisterErrorInterface::DatabaseError(DatabaseError(err))
                    }
                },
            })
        }
    };
    UserRegisterResponse::Response(RegisteredUser { user })
}
