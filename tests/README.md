# Playwright E2E Tests for AyuCheck

## Overview
This directory contains end-to-end tests for the AyuCheck Ayurvedic chatbot application using Playwright.

## Test Files

### `eczema-remedy.spec.ts`
Comprehensive test suite for the chat functionality, specifically testing the eczema remedy query workflow.

**Test Cases:**
1. **Main Query Test**: Loads the page and asks "what is the remedy for eczema?"
   - Verifies page loads correctly
   - Validates welcome message appears
   - Tests input interaction
   - Submits the query
   - Waits for and validates AI response
   - Takes screenshot of successful interaction

2. **Loading States Test**: Validates UI behavior during API calls
   - Checks input is disabled during loading
   - Verifies submit button is disabled during loading
   - Confirms re-enablement after response

3. **Message Styling Test**: Validates visual presentation
   - Tests user message styling (green background)
   - Tests assistant message styling (white background)
   - Verifies bot icon presence

4. **Empty Message Test**: Validates form validation
   - Ensures empty messages cannot be submitted
   - Tests button disabled state

## Setup

### Install Dependencies
```bash
npm install
```

### Install Playwright Browsers
```bash
npx playwright install
```

## Running Tests

### Run all tests (headless mode)
```bash
npm test
```

### Run tests with UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Debug tests
```bash
npm run test:debug
```

### View test report
```bash
npm run test:report
```

### Run specific test file
```bash
npx playwright test tests/eczema-remedy.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "should load the page and ask about eczema remedy"
```

## Configuration

The tests are configured via `playwright.config.ts`:
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Web Server**: Automatically starts Next.js dev server before tests
- **Timeouts**: 30 seconds for API responses
- **Screenshots**: Captured on failure and manually for successful flows

## Environment Requirements

1. **Environment Variables**: Ensure `.env.local` contains:
   ```
   OPENAI_API_KEY=your_key_here
   ```

2. **Development Server**: Tests automatically start the dev server, or you can manually start it:
   ```bash
   npm run dev
   ```

## Test Screenshots

Screenshots are saved to `tests/screenshots/` directory:
- `eczema-remedy-query.png` - Successful query interaction

## CI/CD Integration

For CI environments, tests automatically:
- Run in headless mode
- Retry failed tests twice
- Run with single worker
- Disable existing server reuse

## Debugging Tips

1. **View browser during test**:
   ```bash
   npm run test:headed
   ```

2. **Step through test with debugger**:
   ```bash
   npm run test:debug
   ```

3. **View trace for failed tests**:
   - Traces are automatically captured on first retry
   - View with: `npx playwright show-trace trace.zip`

4. **Increase timeouts** if API is slow:
   ```typescript
   await expect(element).toBeVisible({ timeout: 60000 }); // 60 seconds
   ```

## Known Considerations

- API responses may take 10-30 seconds depending on RAG pipeline complexity
- Tests require valid OpenAI API key and sufficient credits
- First test run may be slower due to model initialization
- Network conditions affect response times

## Extending Tests

To add new test cases:

1. Create new test file in `tests/` directory
2. Import Playwright test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Follow existing patterns for page navigation and assertions
4. Update this README with new test descriptions

## Troubleshooting

### Test times out waiting for response
- Check OpenAI API key is valid
- Verify dev server is running
- Check network connectivity
- Review API endpoint logs

### Elements not found
- Ensure selectors match current UI implementation
- Use Playwright Inspector to identify elements:
  ```bash
  npm run test:debug
  ```

### Server doesn't start
- Check port 3000 is available
- Manually start server and use existing server:
  ```bash
  npm run dev
  # In another terminal
  npm test
  ```
