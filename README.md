# Splitwise Mini

**Important Disclaimer: This is absolutely not that expense-splitting app on your phone. Seriously, don't sue me.**

This experimental project was built with Next.js and React to help you scan receipts and slice your friends' wallets into neat little pieces. It's laced with dark humor, because we all know friendships crumble the moment money shows up.

In truth, the entire codebase was hammered out by AI while I procrastinated on things that actually matter. What a fantastic waste of time. The app talks to the paid GPT-4.1 API through a GitHub integration, so every request feels like lighting cash on fire—even if the hookup itself is free.

## Features

- **Receipt OCR**: Throw in shaky, blurry photos of receipts. The backend tries its best to read them. If it fails, blame your camera, not me.
- **Multi-Person Management**: Add friends, exes, or any mysterious debtor and drag them into the debt spiral.
- **Itemized Splitting**: Assign each item to different people so everyone shares the pain.
- **Drag-and-Drop Allocation**: Don't want to type numbers? Just drag items onto your friend's face.
- **Sharing Support**: Generate a public link with one click so no one can pretend they didn't know.

## Getting Started

1. Run `npm install` to fetch dependencies. It's more rewarding than waiting for your friends to pay you back.
2. Start the dev server with `npm run dev` and open <http://localhost:3000> in your browser.
3. To run tests, use `npm test`. It's easier than double-checking every line of a receipt.

## Testing

A few Vitest tests are included to ensure the image compression feature works. Example:

```bash
npm test
```

You'll see the tests pass unless your environment is even more cursed than mine.

## Final Words

This project exists purely for entertainment. Handle any money disputes on your own. If you find a bug, feel free to open an issue—I'll probably pretend I didn't see it.
