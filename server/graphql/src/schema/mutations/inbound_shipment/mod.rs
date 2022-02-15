use async_graphql::*;

pub mod delete;
pub use self::delete::*;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub mod line;
pub use self::line::*;

pub mod batch;
pub use self::batch::*;
pub struct PackSizeAboveZero;
#[Object]
impl PackSizeAboveZero {
    pub async fn description(&self) -> &'static str {
        "Packsize must be above zero"
    }
}
