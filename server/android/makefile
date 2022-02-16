# Makefile to build the remote server for various Android target architectures
# The makefile requires that the Android NDK_HOME directory is set correctly in order to find the
# correct cross compilers.

ARCHS_ANDROID = aarch64-linux-android armv7-linux-androideabi i686-linux-android
# host tag for the host platform that does the build
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


all: android

android: $(ARCHS_ANDROID)

.PHONY: $(ARCHS_ANDROID)
$(ARCHS_ANDROID): %:
	$(CARGO_LINKER_ENV_$@)="$(CC_$@)" CC="$(CC_$@)" AR="$(AR_$@)" cargo build --target $@ --release
