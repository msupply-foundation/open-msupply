import os
import sys
import re
import requests

# -- Scripts to send Slack notifications based on build status or tag creation -- #
def send_slack_notification(webhook_url, message):
    payload = {"text": message}

    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        print("✅ Message sent successfully")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to send Slack message: {e}")
        return False

# -- Determines which channel to use based on tag pattern -- #
def get_channel_for_tag(tag):
    dev_webhook = os.getenv("SLACK_DEV_RELEASE_WEBHOOK_URL")
    rc_webhook = os.getenv("SLACK_RC_RELEASE_WEBHOOK_URL")

    # Check if tag contains RC pattern
    if re.search(r'-(R|r)(C|c)', tag):
        return rc_webhook, "RC"
    else:
        return dev_webhook, "Dev"

# -- Handles Android build notifications -- #
def handle_android_build_notification(filenames):
    tag = os.getenv("TAG_NAME")
    build_status = os.getenv("BUILD_STATUS", "unknown").lower()

    if not tag:
        print("❌ No tag found for Android build notification.")
        sys.exit(1)

    # Get appropriate channel based on tag
    webhook_url, channel_type = get_channel_for_tag(tag)

    if not webhook_url:
        print(f"❌ No webhook URL configured for {channel_type} channel.")
        sys.exit(1)

    BASE_URL = "https://f002.backblazeb2.com/file/msupply-releases"

    # Create message based on build status
    status_mapping = {
        "success": ("✅", "Completed Successfully"),
        "failure": ("❌", "Failed"),
        "cancelled": ("⏹️", "Cancelled"),
        "timed_out": ("⏱️", "Timed Out"),
        "skipped": ("⏭️", "Skipped")
    }

    emoji, status_text = status_mapping.get(build_status, ("❓", "Unknown Status"))

    message = f"{emoji} *Android Build {status_text}*\n\n"
    message += f"Tag: `{tag}`\n"
    message += f"Status: {status_text}"

    # A cancelled build is most often the self-hosted runner being offline: the
    # queued job is force-cancelled after waiting too long for a runner. Surface
    # an actionable hint (manual cancellation is the other possibility).
    if build_status == "cancelled":
        message += "\n\n⚠️ Often caused by the self-hosted build runner being offline or unavailable (the queued job is cancelled if no runner picks it up) — check the runner. Otherwise the build was cancelled manually."

    for filename in filenames:
        # Construct the full URL for the APK file
        file_url = f"{BASE_URL}/{tag}/{filename}"
        print(f"📦 File URL: {file_url}")
        message += f"\n\n Download: <{file_url}|{filename}>"

    # Link straight to the workflow run when available (set by the notify job).
    run_url = os.getenv("RUN_URL")
    if run_url:
        message += f"\n\n<{run_url}|View workflow run>"

    print(f"Sending Message:\n {message}")
    if send_slack_notification(webhook_url, message):
        print(f"✅ Android build notification sent to {channel_type} channel")

# -- Handles tag creation notifications -- #
def handle_tag_notification():
    dev_webhook = os.getenv("SLACK_DEV_RELEASE_WEBHOOK_URL")
    rc_webhook = os.getenv("SLACK_RC_RELEASE_WEBHOOK_URL")

    created_tags = os.getenv("CREATED_TAGS", "").split()
    affected_branches = os.getenv("AFFECTED_BRANCHES", "").split()

    # Separate develop and RC tags
    develop_tags = []
    rc_tags = []

    for tag, branch in zip(created_tags, affected_branches):
        if branch == 'develop' or re.search(r'-(dev|develop)$', branch, re.IGNORECASE):
            develop_tags.append(tag)
        else:
            rc_tags.append(tag)

    # Send notification for develop branch
    if develop_tags and dev_webhook:
        message = "🚀 *Development Build Started*\n\n"
        message += "New versions being built:\n"
        for tag in develop_tags:
            message += f"• `{tag}`\n"

        if send_slack_notification(dev_webhook, message):
            print(f"✅ Notification sent to Open-mSupply dev Builds channel")

    # Send notification for RC branches
    if rc_tags and rc_webhook:
        message = "🏗️ *RC Build Started*\n\n"
        message += "New versions being built:\n"
        for tag in rc_tags:
            message += f"• `{tag}`\n"

        if send_slack_notification(rc_webhook, message):
            print(f"✅ Notification sent to Open-mSupply RC Builds channel")

def main():
    notification_type = os.getenv("NOTIFICATION_TYPE", "tag_creation")

    if notification_type == "android_build":
        handle_android_build_notification(sys.argv[1:])
    else:
        handle_tag_notification()

if __name__ == "__main__":
    main()
