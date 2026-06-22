package graphql

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/msupply-foundation/open-msupply/server-go/internal/auth"
)

// corsMiddleware allows the configured frontend origin with credentials. The origin MUST be an
// exact value (never "*") when Access-Control-Allow-Credentials is true, or the browser drops
// responses for the credentials:'include' client. OPTIONS preflight is answered 204.
func corsMiddleware(allowOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", allowOrigin)
		h.Set("Access-Control-Allow-Credentials", "true")
		h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		h.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		h.Add("Vary", "Origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// authContextMiddleware extracts the API token (Authorization: Bearer, falling back to the
// non-HttpOnly 'auth' cookie's JSON {token}) and validates it, putting the user id into context.
// It also stashes the raw refresh_token cookie and the response writer (so resolvers can set
// cookies). It NEVER rejects a request — login / initialisationStatus must run unauthenticated;
// resolvers that need a user enforce it themselves.
func authContextMiddleware(secret []byte, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := auth.WithResponseWriter(r.Context(), w)

		if c, err := r.Cookie(auth.RefreshTokenCookieName); err == nil && c.Value != "" {
			ctx = auth.WithRefreshToken(ctx, c.Value)
		}

		token := bearerToken(r)
		if token == "" {
			token = authCookieToken(r)
		}
		if token != "" {
			if claims, err := auth.ValidateToken(secret, token, auth.AudienceApi); err == nil {
				ctx = auth.WithUserID(ctx, claims.UserID)
			}
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func bearerToken(r *http.Request) string {
	const prefix = "Bearer "
	if h := r.Header.Get("Authorization"); strings.HasPrefix(h, prefix) {
		return strings.TrimSpace(strings.TrimPrefix(h, prefix))
	}
	return ""
}

// authCookieToken reads the frontend-written non-HttpOnly 'auth' cookie, whose value is JSON
// {"token":"<api jwt>"} (js-cookie URL-encodes it, so try a decode too).
func authCookieToken(r *http.Request) string {
	c, err := r.Cookie("auth")
	if err != nil || c.Value == "" {
		return ""
	}
	var payload struct {
		Token string `json:"token"`
	}
	raw := c.Value
	if json.Unmarshal([]byte(raw), &payload) == nil && payload.Token != "" {
		return payload.Token
	}
	if dec, err := url.QueryUnescape(raw); err == nil {
		if json.Unmarshal([]byte(dec), &payload) == nil {
			return payload.Token
		}
	}
	return ""
}
