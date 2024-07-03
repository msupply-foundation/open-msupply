use std::{
    cmp::Ordering,
    fmt::{Display, Formatter},
};

use rust_embed::RustEmbed;
use serde::Deserialize;

#[derive(RustEmbed)]
// Relative to repository/Cargo.toml
#[folder = "../../package.json"]
struct PackageJsonAsset;

#[derive(Deserialize)]
struct PackageJson {
    version: String,
}

impl PackageJsonAsset {
    fn version() -> String {
        // Since #[folder] of RustEmbed is pointed at a file, need to use empty string to access the file
        let package_json = PackageJsonAsset::get("").expect("Embedded package json not found");
        let package: PackageJson = serde_json::from_slice(&package_json.data)
            .expect("Embedded package json cannot be parsed");
        package.version
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Version {
    pub major: i16,
    pub minor: i16,
    pub patch: i16,
    // RC or TEST etc
    pub pre_release: Option<String>,
}

impl Display for Version {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let Version {
            major,
            minor,
            patch,
            pre_release,
        } = self;

        write!(f, "{major}.{minor}.{patch}")?;

        if let Some(pre_release) = pre_release {
            write!(f, "-{pre_release}")?;
        }

        Ok(())
    }
}
// TODO no unwrap ?

impl Version {
    pub fn from_package_json() -> Self {
        Self::from_str(&PackageJsonAsset::version())
    }

    pub(crate) fn from_str(version: &str) -> Self {
        let mut version_split = version.split('.');
        let major = version_split.next().unwrap();
        let minor = version_split.next().unwrap();
        let patch_and_extra = version_split.next().unwrap();

        let mut patch_and_extra_split = patch_and_extra.splitn(2, '-');
        let patch = patch_and_extra_split.next().unwrap();
        let extra = patch_and_extra_split.next();

        Version {
            major: major.parse().unwrap(),
            minor: minor.parse().unwrap(),
            patch: patch.parse().unwrap(),
            pre_release: extra.map(String::from),
        }
    }

    pub(crate) fn is_pre_release(&self) -> bool {
        self.pre_release.is_some()
    }

    pub(crate) fn is_equivalent(&self, other: &Self) -> bool {
        self.major == other.major && self.minor == other.minor && self.patch == other.patch
    }
}

impl PartialOrd for Version {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        if self.major != other.major {
            return Some(self.major.cmp(&other.major));
        }

        if self.minor != other.minor {
            return Some(self.minor.cmp(&other.minor));
        }

        if self.patch != other.patch {
            return Some(self.patch.cmp(&other.patch));
        }

        Some(Ordering::Equal)

        // pre release version (RC or TEST etc), are not compared
    }
}

#[cfg(test)]
mod test {
    use super::*;
    #[test]
    fn parsing_version() {
        assert_eq!(
            Version::from_str("10.11.99"),
            Version {
                major: 10,
                minor: 11,
                patch: 99,
                pre_release: None
            }
        );

        assert_eq!(
            Version::from_str("1.2.3-RC1"),
            Version {
                major: 1,
                minor: 2,
                patch: 3,
                pre_release: Some("RC1".to_string())
            }
        );

        assert_eq!(
            Version::from_str("3.2.1-TEST-IT_1"),
            Version {
                major: 3,
                minor: 2,
                patch: 1,
                pre_release: Some("TEST-IT_1".to_string())
            }
        );
    }

    #[test]
    #[should_panic]
    fn parsing_version_panic1() {
        Version::from_str("10.11");
    }
    #[test]
    #[should_panic]
    fn parsing_version_panic2() {
        Version::from_str("10.11.99RC1");
    }
    #[test]
    #[should_panic]
    fn parsing_version_panic3() {
        Version::from_str("10.11b.99");
    }

    #[test]
    fn comparing_versions() {
        assert!(Version::from_str("10.11.01") > Version::from_str("01.11.2"));
        assert!(Version::from_str("12.10.03") < Version::from_str("12.11.02"));
        assert!(Version::from_str("10.11.01") < Version::from_str("10.11.2"));

        assert!(Version::from_str("10.11.01-RC1") >= Version::from_str("10.11.1-RC2"));
    }
}
