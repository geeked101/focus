# Focus Alarm v3 — Expo SDK 54

ADHD-friendly repeating alarm app.

## Features
- Custom intervals (1 min → 4 hours)
- Sound, Vibrate, or Both
- Stop at a set time or run all day
- Stop button directly on the notification
- Custom ringtone — pick any mp3/m4a/wav from your phone
- 8 background themes
- Countdown recalculates correctly when you reopen the app

---

## Setup

1. Install Node.js v20+ from https://nodejs.org
2. Unzip, open terminal inside folder
3. `npm install`

## Run (Expo Go, for testing)
```
npx expo start
```

## Build APK (full features)
```
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

## Android background tip
If alarms don't fire when screen is off:
Settings → Apps → Focus Alarm → Battery → Unrestricted
