ARCHS_IOS = i386-apple-ios x86_64-apple-ios armv7-apple-ios armv7s-apple-ios aarch64-apple-ios
ARCHS_ANDROID = aarch64-linux-android armv7-linux-androideabi i686-linux-android
LIB=libsigner.a
NDK_DIR=/home/clemens/projects/openmsupply-client/NDK

# Some dependencies need env vars to find CC and AR:

CC_aarch64-linux-android="$(NDK_DIR)/arm64/bin/aarch64-linux-android-clang"
AR_aarch64-linux-android="$(NDK_DIR)/arm64/bin/aarch64-linux-android-ar"

CC_armv7-linux-androideabi="$(NDK_DIR)/arm/bin/arm-linux-androideabi-clang"
AR_armv7-linux-androideabi="$(NDK_DIR)/arm/bin/arm-linux-androideabi-ar"

CC_i686-linux-android="$(NDK_DIR)/x86/bin/i686-linux-android-clang"
AR_i686-linux-android="$(NDK_DIR)/x86/bin/i686-linux-android-ar"

all: ios android

ios: $(LIB)

android: $(ARCHS_ANDROID)
	sh copy_android.sh

.PHONY: $(ARCHS_IOS)
$(ARCHS_IOS): %:
	cd remote-server && cargo build --target $@ --release

.PHONY: $(ARCHS_ANDROID)
$(ARCHS_ANDROID): %:
	cd remote-server && CC="$(CC_$@)" AR="$(AR_$@)" cargo build --target $@ --release

$(LIB): $(ARCHS_IOS)
	cd remote-server && lipo -create -output $@ $(foreach arch,$(ARCHS_IOS),$(wildcard target/$(arch)/release/$(LIB)))
