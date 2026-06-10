package reports

import (
	"testing"

	"github.com/dop251/goja"
)

// WS5-C, the pure-Go plugin path: backend plugins are the NON-leaf case — their JS calls host
// methods (sql, use_graphql, …) back into the backend. goja can satisfy these with ordinary
// Go closures injected via vm.Set, so plugins can run pure-Go too — no CGO, no bidirectional
// FFI. This proves a plugin-style bundle calling sql() gets rows supplied by Go.
func TestGoja_HostFunctionSQL_PureGo(t *testing.T) {
	vm := goja.New()

	var capturedQuery string
	// `sql` is the host method a plugin calls; here it's a plain Go function (in the real port
	// it would run the query against the repository layer).
	vm.Set("sql", func(query string) []map[string]any {
		capturedQuery = query
		return []map[string]any{
			{"id": "inv-1", "status": "NEW"},
			{"id": "inv-2", "status": "PICKED"},
		}
	})

	// A plugin-style transform that calls back into the host via sql().
	const pluginJS = `
		function run() {
			var rows = sql("SELECT id, status FROM invoice WHERE store_id = 'store-1'");
			return { count: rows.length, ids: rows.map(function (r) { return r.id; }) };
		}
	`
	if _, err := vm.RunString(pluginJS); err != nil {
		t.Fatalf("load plugin: %v", err)
	}
	fn, ok := goja.AssertFunction(vm.Get("run"))
	if !ok {
		t.Fatal("run is not a function")
	}
	res, err := fn(goja.Undefined())
	if err != nil {
		t.Fatalf("plugin run: %v", err)
	}

	out, _ := res.Export().(map[string]any)
	if capturedQuery != "SELECT id, status FROM invoice WHERE store_id = 'store-1'" {
		t.Errorf("host sql() got unexpected query: %q", capturedQuery)
	}
	if c, _ := out["count"].(int64); c != 2 {
		t.Errorf("plugin saw count=%v, want 2", out["count"])
	}
	t.Logf("plugin called Go-native sql() host function and got rows back — pure-Go, no CGO ✓ (result: %v)", out)
}
