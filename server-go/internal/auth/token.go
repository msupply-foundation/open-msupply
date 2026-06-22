// Package auth provides the prototype's authentication primitives: JWT issue/validate (HS256),
// bcrypt password verification, the refresh-token cookie, and per-request auth context. It
// mirrors the Rust TokenService (server/service/src/token.rs) closely enough that tokens and
// bcrypt hashes are interchangeable, while dropping the server-side token-revocation bucket
// (equivalent to Rust's validate_token_bucket=false in dev).
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Issuer mirrors the Rust iss claim.
const Issuer = "om-supply-remote-server"

// Audience is the (non-RFC) capitalized variant string Rust serializes into the aud claim.
type Audience string

const (
	AudienceApi          Audience = "Api"
	AudienceTokenRefresh Audience = "TokenRefresh"
)

const (
	TokenLifetime        = time.Hour
	RefreshTokenLifetime = 2 * time.Hour
)

// Pair is an API token + refresh token with their unix expiry times.
type Pair struct {
	Token             string
	ExpiryDate        int64
	Refresh           string
	RefreshExpiryDate int64
}

// Claims is the validated subset we care about.
type Claims struct {
	UserID string
	Aud    Audience
}

func issue(secret []byte, userID string, aud Audience, lifetime time.Duration, now time.Time) (string, int64, error) {
	exp := now.Add(lifetime)
	claims := jwt.MapClaims{
		"exp": exp.Unix(),
		"aud": string(aud),
		"iat": now.Unix(),
		"iss": Issuer,
		"sub": userID,
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
	if err != nil {
		return "", 0, err
	}
	return signed, exp.Unix(), nil
}

// CreatePair mints an Api token (60m) + TokenRefresh token (120m), mirroring create_jwt_pair.
func CreatePair(secret []byte, userID string) (Pair, error) {
	now := time.Now()
	api, apiExp, err := issue(secret, userID, AudienceApi, TokenLifetime, now)
	if err != nil {
		return Pair{}, err
	}
	refresh, refreshExp, err := issue(secret, userID, AudienceTokenRefresh, RefreshTokenLifetime, now)
	if err != nil {
		return Pair{}, err
	}
	return Pair{Token: api, ExpiryDate: apiExp, Refresh: refresh, RefreshExpiryDate: refreshExp}, nil
}

// ValidateToken verifies signature + expiry (via the parser) and then checks issuer and the
// capitalized audience manually — golang-jwt's built-in audience check assumes RFC semantics and
// would reject the Rust-style "Api"/"TokenRefresh" value, so it is intentionally not used.
func ValidateToken(secret []byte, tokenString string, expectedAud Audience) (*Claims, error) {
	mc := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(tokenString, mc, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return secret, nil
	}, jwt.WithExpirationRequired(), jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, err
	}

	aud, _ := mc["aud"].(string)
	if Audience(aud) != expectedAud {
		return nil, fmt.Errorf("unexpected audience %q (want %q)", aud, expectedAud)
	}
	if iss, _ := mc["iss"].(string); iss != Issuer {
		return nil, fmt.Errorf("unexpected issuer %q", iss)
	}
	sub, _ := mc["sub"].(string)
	if sub == "" {
		return nil, errors.New("token missing subject")
	}
	return &Claims{UserID: sub, Aud: Audience(aud)}, nil
}

// RefreshPair validates a refresh token and mints a fresh pair, mirroring the refresh flow.
func RefreshPair(secret []byte, refreshToken string) (Pair, error) {
	claims, err := ValidateToken(secret, refreshToken, AudienceTokenRefresh)
	if err != nil {
		return Pair{}, err
	}
	return CreatePair(secret, claims.UserID)
}
