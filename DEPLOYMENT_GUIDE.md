# ColorFlow: Play Store Deployment Guide

Follow these exact steps to publish your game on the Google Play Store.

## 1. Preparation
- **Export Code:** Use the "Export" button in AI Studio to download your project as a ZIP.
- **Node.js:** Ensure you have Node.js installed on your computer.

## 2. Generate Android Project (TWA) & Signing Keys
We use Google's **Bubblewrap** to wrap this web app into an Android App Bundle (.aab).

### What is a Signing Key?
Yes, Google provides "Play App Signing", but you **must** still create an **Upload Key** locally first.
1. **Upload Key:** You generate this on your computer (Bubblewrap does this for you). You use this to sign your App Bundle (`.aab`) before uploading it to Google.
2. **App Signing Key:** Once you upload your app, Google replaces your upload signature with the permanent App Signing Key that they manage safely in their cloud.

### Steps:
1. Open your terminal.
2. Install Bubblewrap: `npm install -g @bubblewrap/cli`
3. Initialize the project: `bubblewrap init --manifest=https://[YOUR_LIVE_APP_URL]/manifest.json`
   - *Note: Replace [YOUR_LIVE_APP_URL] with your deployed app URL.*
4. Follow the prompts. When it asks about the **KeyStore**:
   - Say **Yes** to generate a new one.
   - **IMPORTANT:** Keep the password safe and do NOT lose the generated `.keystore` file.
   - It will show you a **SHA-256 fingerprint**. Copy this! You need it for Step 5.

## 3. Build the App
1. Build the bundle: `bubblewrap build`
2. You will get a file named `app-release-bundle.aab`.

## 4. Play Console Steps
1. Go to [Google Play Console](https://play.google.com/console).
2. Create a New App.
3. **Store Presence:**
   - **Icon:** 512x512 (PNG)
   - **Feature Graphic:** 1024x500 (PNG)
   - **Screenshots:** At least 2 for Phone and Tablet.
   - **Privacy Policy:** Link to `https://[YOUR_LIVE_APP_URL]/privacy.html`.
4. **App Content:** Fill out the rating questionnaire (it's a "Game").
5. **Upload:** Go to Production -> Create New Release and upload the `.aab` file.

## 5. Verification (Digital Asset Links)
To hide the browser address bar:
1. Get the SHA-256 fingerprint from the Bubblewrap build output.
2. Update `/public/.well-known/assetlinks.json` with this fingerprint.
3. Re-deploy your web app.

## 6. How to take Screenshots
1. **Open App:** Open your shared app URL: `https://ais-pre-4qzfleg2hkwljx6zc46ckf-220708558253.asia-southeast1.run.app`
2. **Mobile View:** Press `F12`, then click the **Device Toolbar** icon (mobile icon).
3. **Set Size:** 
   - Phone: **Pixel 7** (approx 412x915).
   - Tablet: **iPad Air** (approx 820x1180).
4. **Take Screenshot:** Click the three dots in the top-right of the Device Toolbar -> **"Capture screenshot"**.
5. **What to capture:**
   - [ ] Main Title Screen
   - [ ] Gameplay (Middle of a level)
   - [ ] Level Selection/Menu
   - [ ] Success/Level Clear screen

## 7. Feature Graphic (1024x500)
Since I can't generate the file right now, use this prompt in an AI tool or Canva:
> "A professional 1024x500 horizontal banner. Minimal matte beige background. A wooden artist palette with vibrant paint drops in the center. Text 'ColorFlow' in soft glowing pink bubbly font on the right. Zen aesthetic."

**Upload to:** `/public/feature-graphic.png`

## Mandatory Assets Checklist:
- [x] App Icon (512x512) -> Already in `/public/icon.png`
- [x] Feature Graphic (1024x500) -> Already in `/public/feature-graphic.png`
- [x] 8-10 Phone Screenshots -> Renamed and stored in `/screenshots/`
- [x] Privacy Policy URL: `https://ais-pre-4qzfleg2hkwljx6zc46ckf-220708558253.asia-southeast1.run.app/privacy.html`
