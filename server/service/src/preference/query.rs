use crate::preference::preferences::ShowContactTracing;

use super::{preferences::PreferenceRegistry, Preference};

pub struct PreferencesList {
    pub show_contact_tracing: ShowContactTracing,
}

pub fn get_preference_registry() -> PreferenceRegistry {
    PreferenceRegistry {
        show_contact_tracing: ShowContactTracing,
    }
}

// TODO: Value = bool obviously won't work when we have non-bool preferences
// Genericising involves boxing Value as Any, i.e. type loss, but I think we will move away
// from this method in cooldown anyway, so just leaving like this for now
pub fn get_preference_descriptions() -> Vec<Box<dyn Preference<Value = bool>>> {
    vec![Box::new(ShowContactTracing)]
}
