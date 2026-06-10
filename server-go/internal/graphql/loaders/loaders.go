// Package loaders provides request-scoped DataLoaders (N+1 batching), the gqlgen analogue of
// async-graphql's DataLoader registry. Each HTTP request gets fresh loaders so batching is
// scoped to one operation.
package loaders

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/msupply-foundation/open-msupply/server-go/internal/db"
	"github.com/msupply-foundation/open-msupply/server-go/internal/graphql/model"
	"github.com/msupply-foundation/open-msupply/server-go/internal/repository"
	"github.com/vikstrous/dataloadgen"
)

type Loaders struct {
	NameByID *dataloadgen.Loader[string, *model.NameNode]
}

// nameFetcher returns the batch function that loads many names in one query. The optional
// onBatch hook is used by tests to observe how many batched DB round-trips happened.
func nameFetcher(repo *repository.NameRepository, onBatch func(keys []string)) func(context.Context, []string) ([]*model.NameNode, []error) {
	return func(_ context.Context, keys []string) ([]*model.NameNode, []error) {
		if onBatch != nil {
			onBatch(keys)
		}
		byID, err := repo.LoadByIDs(keys)
		out := make([]*model.NameNode, len(keys))
		errs := make([]error, len(keys))
		for i, k := range keys {
			if err != nil {
				errs[i] = err
				continue
			}
			n := byID[k]
			if n == nil {
				errs[i] = fmt.Errorf("name %q not found", k)
				continue
			}
			out[i] = &model.NameNode{ID: n.ID, Name: n.Name, Code: n.Code}
		}
		return out, errs
	}
}

// New builds the loaders for one request.
func New(conn *sql.DB, dialect db.Dialect) *Loaders {
	repo := repository.NewNameRepository(conn, dialect)
	return &Loaders{NameByID: dataloadgen.NewLoader(nameFetcher(repo, nil))}
}

// NewWithObserver is like New but reports each batch's keys (used in tests to prove batching).
func NewWithObserver(conn *sql.DB, dialect db.Dialect, onBatch func(keys []string)) *Loaders {
	repo := repository.NewNameRepository(conn, dialect)
	return &Loaders{NameByID: dataloadgen.NewLoader(nameFetcher(repo, onBatch))}
}

type ctxKey struct{}

// WithLoaders puts a Loaders set on the context (exported so tests can inject an observed set).
func WithLoaders(ctx context.Context, l *Loaders) context.Context {
	return context.WithValue(ctx, ctxKey{}, l)
}

// Middleware attaches a fresh set of loaders to each request's context.
func Middleware(conn *sql.DB, dialect db.Dialect, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r.WithContext(WithLoaders(r.Context(), New(conn, dialect))))
	})
}

// For retrieves the request's loaders.
func For(ctx context.Context) *Loaders {
	l, _ := ctx.Value(ctxKey{}).(*Loaders)
	return l
}
