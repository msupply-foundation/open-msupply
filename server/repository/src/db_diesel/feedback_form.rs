use super::{feedback_form_row::FeedbackFormRow, StorageConnection, StoreRow, UserAccountRow};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct FeedbackForm {
    pub feedback_form_row: FeedbackFormRow,
    pub user_row: UserAccountRow,
    pub store_row: StoreRow,
    // TODO site_row
}

pub struct FeedbackFormRepository<'a> {
    _connection: &'a StorageConnection,
}

// type FeedbackFormJoin = (FeedbackFormRow, UserAccountRow, StoreRow);

impl<'a> FeedbackFormRepository<'a> {
    pub fn new(_connection: &'a StorageConnection) -> Self {
        FeedbackFormRepository { _connection }
    }
}
