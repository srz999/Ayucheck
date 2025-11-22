# Quick Start - Running Playwright Tests

## ✅ Best Practice: Dev Server Already Running

Since you have `npm run dev` already running in a terminal:

```bash
# Use this command to skip starting another dev server
npm run test:ui:manual
```

This will open the Playwright UI with all your tests visible and ready to run!

## 🚀 Alternative: Automatic Server Start

If you DON'T have dev server running:

```bash
# Playwright will automatically start the dev server
npm run test:ui
```

## 🔍 Why the Empty UI Window?

The UI mode was showing empty because:
1. Playwright was trying to start the dev server
2. But port 3000 was already in use (your existing dev server)
3. The configuration was set to `reuseExistingServer: true` but wasn't connecting properly

## ✨ Solution Applied

Updated configuration to allow two modes:
- **`npm run test:ui:manual`** - Skip webServer (use existing dev server)
- **`npm run test:ui`** - Auto-start dev server if needed

## 📝 Other Useful Commands

```bash
# Run tests in headed mode (see browser)
npm run test:headed

# Run tests with debugger
npm run test:debug

# Run specific test
npx playwright test tests/eczema-remedy.spec.ts --project=chromium

# View last test report
npm run test:report
```

## ⚡ Quick Test Now

1. Make sure dev server is running: `npm run dev` (already running ✅)
2. In another terminal: `npm run test:ui:manual`
3. Select a test from the UI and click the play button!
