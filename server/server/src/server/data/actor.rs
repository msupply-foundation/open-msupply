use crate::util::sync::SyncSenderActor;
use std::sync::{Arc, Mutex};

// Arc and Mutex are both unfortunate requirements here because we need to mutate the
// Sender later which the extractor doesn’t help us with, but all up it’s not a big deal.
// Should be possible to remove them both later.
pub struct ActorRegistry {
    pub sync_sender: Arc<Mutex<SyncSenderActor>>,
}
