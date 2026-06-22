package auth

import (
	"context"
	"net/http"
)

type ctxKey int

const (
	userIDKey ctxKey = iota
	refreshTokenKey
	writerKey
)

// WithUserID stores the authenticated user id (set by the auth-context middleware when a valid
// API token is present).
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// UserID returns the authenticated user id, ok=false when the request is unauthenticated.
func UserID(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(userIDKey).(string)
	return id, ok && id != ""
}

// WithRefreshToken stashes the raw refresh-token cookie value (needed by the refreshToken
// resolver even when the API token is absent/expired).
func WithRefreshToken(ctx context.Context, token string) context.Context {
	return context.WithValue(ctx, refreshTokenKey, token)
}

func RefreshToken(ctx context.Context) (string, bool) {
	t, ok := ctx.Value(refreshTokenKey).(string)
	return t, ok && t != ""
}

// WithResponseWriter exposes the HTTP response writer so resolvers can Set-Cookie (gqlgen
// resolvers don't receive the writer directly).
func WithResponseWriter(ctx context.Context, w http.ResponseWriter) context.Context {
	return context.WithValue(ctx, writerKey, w)
}

func ResponseWriter(ctx context.Context) (http.ResponseWriter, bool) {
	w, ok := ctx.Value(writerKey).(http.ResponseWriter)
	return w, ok
}
