package auth

import "testing"

func TestTokenRoundTrip(t *testing.T) {
	secret := []byte("dev-secret")
	pair, err := CreatePair(secret, "user-1")
	if err != nil {
		t.Fatalf("create pair: %v", err)
	}

	claims, err := ValidateToken(secret, pair.Token, AudienceApi)
	if err != nil {
		t.Fatalf("validate api token: %v", err)
	}
	if claims.UserID != "user-1" || claims.Aud != AudienceApi {
		t.Errorf("unexpected claims: %+v", claims)
	}

	// An Api token must not validate as a refresh token (audience check).
	if _, err := ValidateToken(secret, pair.Token, AudienceTokenRefresh); err == nil {
		t.Error("api token should not validate as refresh token")
	}
	// Wrong secret must fail.
	if _, err := ValidateToken([]byte("other"), pair.Token, AudienceApi); err == nil {
		t.Error("token should not validate under a different secret")
	}
}

func TestRefreshPair(t *testing.T) {
	secret := []byte("dev-secret")
	pair, err := CreatePair(secret, "user-2")
	if err != nil {
		t.Fatalf("create pair: %v", err)
	}
	next, err := RefreshPair(secret, pair.Refresh)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	claims, err := ValidateToken(secret, next.Token, AudienceApi)
	if err != nil || claims.UserID != "user-2" {
		t.Errorf("refreshed token invalid: %v %+v", err, claims)
	}
	// The API token is not a refresh token, so RefreshPair must reject it.
	if _, err := RefreshPair(secret, pair.Token); err == nil {
		t.Error("RefreshPair should reject an Api-audience token")
	}
}

func TestPasswordHashVerify(t *testing.T) {
	hash, err := HashPassword("password")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if err := VerifyPassword("password", hash); err != nil {
		t.Errorf("verify correct password: %v", err)
	}
	if err := VerifyPassword("wrong", hash); err == nil {
		t.Error("verify should fail for wrong password")
	}
}
