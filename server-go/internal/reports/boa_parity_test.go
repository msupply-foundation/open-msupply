//go:build cgo && boa

// Runs only under `-tags boa` after building the Rust staticlib (cd ffi/boa && cargo build
// --release). Proves Boa-via-CGO and goja produce identical output for the same real bundle.
package reports

import (
	"encoding/json"
	"testing"
)

func canonical(t *testing.T, b []byte) string {
	t.Helper()
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("canonicalize %s: %v", b, err)
	}
	out, _ := json.Marshal(v)
	return string(out)
}

func TestBoaGojaParity(t *testing.T) {
	esm := readTestdata(t, "encounters_convert_data.mjs")     // ES module, for Boa
	varB := readTestdata(t, "encounters_convert_data.var.js") // var lib, for goja
	input := readTestdata(t, "encounters_input.json")

	boaOut, err := RunConvertBoa(esm, "convert_data", input)
	if err != nil {
		t.Fatalf("boa: %v", err)
	}
	gojaOut, err := RunConvertGoja(varB, "reportBundle", "convert_data", input)
	if err != nil {
		t.Fatalf("goja: %v", err)
	}

	// Both compute daysLate from new Date() within microseconds of each other, so the integer
	// day counts match; assert byte-identical canonical JSON.
	if b, g := canonical(t, boaOut), canonical(t, gojaOut); b != g {
		t.Errorf("Boa vs goja output differ:\n boa:  %s\n goja: %s", b, g)
	} else {
		t.Logf("Boa-CGO ≡ goja on the real bundle ✓\n %s", g)
	}
}
