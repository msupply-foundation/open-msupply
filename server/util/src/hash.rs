use sha2::{Digest, Sha256};

pub fn sha256(plaintext: &str) -> String {
    format!("{:x}", Sha256::digest(plaintext.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256() {
        let plaintext = "plaintext";
        let ciphertext =
            "96d62e2abd3e42de5f50330fb8efc4c5599835278077b21e9aa0b33c1df07a1c".to_owned();
        assert_eq!(sha256(plaintext), ciphertext);
    }
}
