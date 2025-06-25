#!/bin/bash
set -e

python3 <<'EOF'
import os
import sys
import re
import requests

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
        print(f"Message sent successfully")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Failed to send message: {e}")
        return False

def main(): 
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
        if branch == 'develop':
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
    
if __name__ == "__main__":
    main()
EOF