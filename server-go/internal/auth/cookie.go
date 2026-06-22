package auth

import (
	"net/http"
	"time"
)

// RefreshTokenCookieName mirrors the Rust refresh_token cookie.
const RefreshTokenCookieName = "refresh_token"

// SetRefreshTokenCookie writes the HttpOnly refresh-token cookie. secure must be false on dev
// (plain HTTP) or the browser refuses to store it; SameSite=Strict matches Rust.
func SetRefreshTokenCookie(w http.ResponseWriter, refresh string, maxAge time.Duration, secure bool) {
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    refresh,
		Path:     "/",
		MaxAge:   int(maxAge.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})
}

// ClearRefreshTokenCookie expires the refresh-token cookie (logout).
func ClearRefreshTokenCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     RefreshTokenCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
}
