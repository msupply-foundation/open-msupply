//go:build cgo && boa

// This file is only compiled when CGO is enabled AND the `boa` build tag is set, so the
// default (pure-Go) build never requires the Rust static library. Build with:
//
//	(cd ffi/boa && cargo build --release) && go test -tags boa ./internal/reports/
package reports

/*
// The boa_ffi static library path is supplied per-target via CGO_LDFLAGS (it differs by
// GOOS/GOARCH), e.g. CGO_LDFLAGS="$PWD/ffi/boa/target/release/libboa_ffi.a".
#cgo LDFLAGS: -lm
#cgo darwin LDFLAGS: -framework CoreFoundation -framework Security
#cgo linux LDFLAGS: -ldl
#include <stdint.h>
#include <stdlib.h>
int bjs_run(const uint8_t* bundle, size_t bundle_len,
            const uint8_t* method, size_t method_len,
            const uint8_t* input,  size_t input_len,
            uint8_t** out, size_t* out_len);
void bjs_free(uint8_t* ptr, size_t len);
*/
import "C"
import (
	"fmt"
	"unsafe"
)

// RunConvertBoa runs an ES-module convert_data bundle through the Boa engine (Rust, via cgo).
// JSON in -> JSON out. `method` is the exported function name (e.g. "convert_data").
func RunConvertBoa(esmBundle []byte, method string, inputJSON []byte) ([]byte, error) {
	m := []byte(method)
	var outPtr *C.uint8_t
	var outLen C.size_t
	rc := C.bjs_run(
		bytePtr(esmBundle), C.size_t(len(esmBundle)),
		bytePtr(m), C.size_t(len(m)),
		bytePtr(inputJSON), C.size_t(len(inputJSON)),
		&outPtr, &outLen,
	)
	if outPtr == nil {
		return nil, fmt.Errorf("bjs_run returned no output (rc=%d)", rc)
	}
	defer C.bjs_free(outPtr, outLen)
	out := C.GoBytes(unsafe.Pointer(outPtr), C.int(outLen))
	if rc != 0 {
		return nil, fmt.Errorf("boa: %s", string(out))
	}
	return out, nil
}

// bytePtr returns a C pointer to a Go byte slice (read synchronously by Rust, never retained).
func bytePtr(b []byte) *C.uint8_t {
	if len(b) == 0 {
		return nil
	}
	return (*C.uint8_t)(unsafe.Pointer(&b[0]))
}
