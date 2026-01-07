use std::sync::RwLock;

use super::*;

static SYNC_SITE: RwLock<i32> = RwLock::new(0);

pub static SYNC_VISITORS: RwLock<Vec<Box<dyn BoxableSyncRecord>>> = RwLock::new(Vec::new());

pub fn add_sync_visitor(visitor: Box<dyn BoxableSyncRecord>) {
    let mut visitors = SYNC_VISITORS.write().unwrap();
    visitors.push(visitor);
}
pub fn set_sync_site(site_id: i32) {
    let mut sync_site = SYNC_SITE.write().unwrap();
    *sync_site = site_id;
}
pub fn get_sync_site() -> i32 {
    let sync_site = SYNC_SITE.read().unwrap();
    *sync_site
}
