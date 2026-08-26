use std::collections::HashMap;
use std::sync::Mutex;

/// One synthesised "site" — what `create_site` returns, and what subsequent
/// `get_site_info` calls echo back.
#[derive(Clone)]
pub struct SiteRecord {
    pub id: String,
    pub site_id: i32,
    pub name: String,
    pub password_sha256: String,
    pub store_id: String,
    pub name_id: String,
}

pub struct MockState {
    sites_by_name: Mutex<HashMap<String, SiteRecord>>,
    next_site_id: Mutex<i32>,
    pub config: MockConfig,
}

pub struct MockConfig {
    /// What `omSupplyCentralServerUrl` will return for non-central callers.
    /// Operator points the central OMS at the mock; the mock points the
    /// remote at the central OMS via this URL.
    pub oms_central_url: String,
    /// Site name that the central OMS itself uses to authenticate against
    /// the mock — when this name asks for site info, we say "you are the
    /// OMS central server".
    pub oms_central_username: String,
    /// Returned as `mSupplyCentralSiteId` so the OMS instances agree about
    /// who the legacy-central site is.
    pub msupply_central_site_id: i32,
}

impl MockState {
    pub fn new(config: MockConfig) -> Self {
        Self {
            sites_by_name: Mutex::new(HashMap::new()),
            next_site_id: Mutex::new(100),
            config,
        }
    }

    pub fn insert_site(&self, record: SiteRecord) {
        self.sites_by_name
            .lock()
            .unwrap()
            .insert(record.name.clone(), record);
    }

    /// Look up a site by basic-auth username. If we haven't seen it before
    /// (e.g. it's the central OMS asking at startup with its statically
    /// configured credentials, not a site created via the test helper),
    /// synthesise one and remember it so subsequent calls return the same id.
    pub fn get_or_create_by_name(&self, name: &str, password_sha256: &str) -> SiteRecord {
        let mut sites = self.sites_by_name.lock().unwrap();
        if let Some(existing) = sites.get(name) {
            return existing.clone();
        }
        let mut next_id = self.next_site_id.lock().unwrap();
        let id = *next_id;
        *next_id += 1;
        let record = SiteRecord {
            id: uuid::Uuid::new_v4().to_string(),
            site_id: id,
            name: name.to_string(),
            password_sha256: password_sha256.to_string(),
            store_id: uuid::Uuid::new_v4().to_string(),
            name_id: uuid::Uuid::new_v4().to_string(),
        };
        sites.insert(name.to_string(), record.clone());
        record
    }

    pub fn alloc_site_id(&self) -> i32 {
        let mut next_id = self.next_site_id.lock().unwrap();
        let id = *next_id;
        *next_id += 1;
        id
    }
}
