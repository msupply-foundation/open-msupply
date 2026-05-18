import os
import sys
import re
import requests

def escape_markdown_v2(text):
    """
    Escape special characters for Telegram MarkdownV2 format.
    Characters that need escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
    """
    # Characters that need to be escaped in MarkdownV2
    escape_chars = r'\_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!'
    return re.sub(f'([{escape_chars}])', r'\\\1', text)

# -- Scripts to send Telegram notifications based on build status or tag creation -- #
def send_telegram_notification(chat_id, message, bot_key):
    url = f"https://api.telegram.org/bot{bot_key}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "MarkdownV2",
    }

    try:
        response = requests.post(url, data=payload)
        response.raise_for_status()
        print(f"✅ Message sent successfully to chat {chat_id}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to send message to chat {chat_id}: {e}")
        return False

# -- Determines which channel to use based on tag pattern -- #
def get_channel_for_tag(tag):
    dev_chat_id = os.getenv("TELEGRAM_DEV_RELEASE_CHAT_ID")
    rc_chat_id = os.getenv("TELEGRAM_RC_RELEASE_CHAT_ID")

    # Check if tag contains RC pattern
    if re.search(r'-(R|r)(C|c)', tag):
        return rc_chat_id, "RC"
    else:
        return dev_chat_id, "Dev"

# -- Handles Android build notifications -- #
def handle_android_build_notification(filenames):
    bot_key = os.getenv("TELEGRAM_RELEASE_BOT_KEY")
    tag = os.getenv("TAG_NAME")
    build_status = os.getenv("BUILD_STATUS", "unknown").lower()

    if not bot_key:
        print("❌ TELEGRAM_RELEASE_BOT_KEY not found.")
        sys.exit(1)

    if not tag:
        print("❌ No tag found for Android build notification.")
        sys.exit(1)

    # Get appropriate channel based on tag
    chat_id, channel_type = get_channel_for_tag(tag)

    if not chat_id:
        print(f"❌ No chat ID configured for {channel_type} channel.")
        sys.exit(1)

    BASE_URL = "https://f002.backblazeb2.com/file/msupply-releases"

    # Create message based on build status
    status_mapping = {
        "success": ("✅", "Completed Successfully"),
        "failure": ("❌", "Failed"),
        "cancelled": ("⏹️", "Cancelled"),
        "skipped": ("⏭️", "Skipped")
    }

    emoji, status_text = status_mapping.get(build_status, ("❓", "Unknown Status"))

    message = f"{emoji} *Android Build {status_text}*\n\n"
    message += f"Tag: `{tag}`\n"
    message += f"Status: {status_text}"

    for filename in filenames:
        # Construct the full URL for the APK file
        file_url = f"{BASE_URL}/{tag}/{filename}"
        print(f"📦 File URL: {file_url}")
        escaped_filename = escape_markdown_v2(filename)
        message += f"\n\n Download: [{escaped_filename}]({file_url})"

    print(f"Sending Message:\n {message}")
    if send_telegram_notification(chat_id, message, bot_key):
        print(f"✅ Android build notification sent to {channel_type} chat {chat_id}")

# -- Handles tag creation notifications -- #
def handle_tag_notification():
    bot_key = os.getenv("TELEGRAM_RELEASE_BOT_KEY")
    dev_chat_id = os.getenv("TELEGRAM_DEV_RELEASE_CHAT_ID")
    rc_chat_id = os.getenv("TELEGRAM_RC_RELEASE_CHAT_ID")

    created_tags = os.getenv("CREATED_TAGS", "").split()
    affected_branches = os.getenv("AFFECTED_BRANCHES", "").split()

    if not bot_key:
        print("❌ TELEGRAM_RELEASE_BOT_KEY not found.")
        sys.exit(1)

    # Separate develop and RC tags
    develop_tags = []
    rc_tags = []

    for tag, branch in zip(created_tags, affected_branches):
        if branch == 'develop' or re.search(r'-(dev|develop)$', branch, re.IGNORECASE):
            develop_tags.append(tag)
        else:
            rc_tags.append(tag)

    # Send notification for develop branch
    if develop_tags and dev_chat_id:
        message = "🚀 *Development Build Started*\n\n"
        message += "New versions being built:\n"
        for tag in develop_tags:
            message += f"• `{tag}`\n"

        if send_telegram_notification(dev_chat_id, message, bot_key):
            print(f"✅ Notification sent to Open-mSupply dev Builds chat")

    # Send notification for RC branches
    if rc_tags and rc_chat_id:
        message = "🏗️ *RC Build Started*\n\n"
        message += "New versions being built:\n"
        for tag in rc_tags:
            message += f"• `{tag}`\n"

        if send_telegram_notification(rc_chat_id, message, bot_key):
            print(f"✅ Notification sent to Open-mSupply RC Builds chat")

def main():
    notification_type = os.getenv("NOTIFICATION_TYPE", "tag_creation")

    if notification_type == "android_build":
        handle_android_build_notification(sys.argv[1:])
    else:
        handle_tag_notification()

if __name__ == "__main__":
    main()
