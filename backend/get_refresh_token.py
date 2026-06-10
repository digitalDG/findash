"""
One-time script to get a refresh token for Microsoft Graph email sending.
Run once: python get_refresh_token.py
Copy the printed refresh token into MS_REFRESH_TOKEN in backend/.env
"""
import time
import httpx

CLIENT_ID = input("Paste your MS_CLIENT_ID: ").strip()

DEVICE_CODE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode"
TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
SCOPE = "https://graph.microsoft.com/Mail.Send offline_access"

with httpx.Client() as client:
    # Step 1: get device code
    resp = client.post(DEVICE_CODE_URL, data={"client_id": CLIENT_ID, "scope": SCOPE})
    resp.raise_for_status()
    data = resp.json()

    print(f"\n1. Go to: {data['verification_uri']}")
    print(f"2. Enter code: {data['user_code']}")
    print("\nWaiting for you to log in...\n")

    # Step 2: poll for token
    interval = data.get("interval", 5)
    while True:
        time.sleep(interval)
        token_resp = client.post(TOKEN_URL, data={
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "client_id": CLIENT_ID,
            "device_code": data["device_code"],
        })
        token_data = token_resp.json()

        if "refresh_token" in token_data:
            print("Success! Add this to backend/.env:\n")
            print(f'MS_REFRESH_TOKEN="{token_data["refresh_token"]}"')
            break
        elif token_data.get("error") == "authorization_pending":
            continue
        else:
            print(f"Error: {token_data}")
            break
