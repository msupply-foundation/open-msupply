package auth

import "golang.org/x/crypto/bcrypt"

// VerifyPassword checks a plaintext password against a bcrypt hash from user_account.hashed_password.
// bcrypt.DefaultCost (10) matches the Rust DEFAULT_COST, so $2a$/$2b$ hashes are interchangeable.
func VerifyPassword(plain, hashed string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashed), []byte(plain))
}

// HashPassword produces a bcrypt hash (used by the seeder).
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
