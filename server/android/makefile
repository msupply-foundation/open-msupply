ARCHS_IOS = i386-apple-ios x86_64-apple-ios armv7-apple-ios armv7s-apple-ios aarch64-apple-ios
ARCHS_ANDROID = aarch64-linux-android armv7-linux-androideabi i686-linux-android
LIB=libsigner.a

HOST_TAG := $(shell ./host.sh)

ANDROID_ABI=26

# Some dependencies need env vars to find CC and AR: (TODO is AR needed?)
TOOLCHAIN_DIR=$(NDK_HOME)/toolchains/llvm/prebuilt/$(HOST_TAG)/bin

CC_aarch64-linux-android=$(TOOLCHAIN_DIR)/aarch64-linux-android$(ANDROID_ABI)-clang
AR_aarch64-linux-android=$(TOOLCHAIN_DIR)/aarch64-linux-android-ar

CC_armv7-linux-androideabi=$(TOOLCHAIN_DIR)/armv7a-linux-androideabi$(ANDROID_ABI)-clang
AR_armv7-linux-androideabi=$(TOOLCHAIN_DIR)/arm-linux-androideabi-ar

CC_i686-linux-android=$(TOOLCHAIN_DIR)/i686-linux-android$(ANDROID_ABI)-clang
AR_i686-linux-android=$(TOOLCHAIN_DIR)/i686-linux-android-ar

# ENV variable name used by the cargo 
CARGO_LINKER_ENV_armv7-linux-androideabi=CARGO_TARGET_ARMV7_LINUX_ANDROIDEABI_LINKER
CARGO_LINKER_ENV_aarch64-linux-android=CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER
CARGO_LINKER_ENV_i686-linux-android=CARGO_TARGET_I686_LINUX_ANDROID_LINKER


all: ios android

ios: $(LIB)

android: $(ARCHS_ANDROID)

.PHONY: $(ARCHS_IOS)
$(ARCHS_IOS): %:
	cargo build --target $@ --release

.PHONY: $(ARCHS_ANDROID)
$(ARCHS_ANDROID): %:
	$(CARGO_LINKER_ENV_$@)="$(CC_$@)" CC="$(CC_$@)" AR="$(AR_$@)" cargo build --target $@ --release

$(LIB): $(ARCHS_IOS)
	lipo -create -output $@ $(foreach arch,$(ARCHS_IOS),$(wildcard target/$(arch)/release/$(LIB)))
