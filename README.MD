# YouTube Ad Guard

A Chrome Manifest V3 extension for YouTube-focused request filtering and adaptive in-page ad handling.

## Local test

1. Open `chrome://extensions` in Chrome.
2. Turn on Developer mode.
3. Click the reload icon on the YouTube Ad Guard card.
4. Open or reload a YouTube page, then click the extension icon to view status or pause protection.

The content script observes changing YouTube markup, hides known and clearly labelled promotional containers, clicks a newly available Skip button, and temporarily mutes/speeds up a detected player ad. It restores the user's video audio, volume, and playback speed when the ad state ends.

The summary combines hidden page elements with detected player ad indicators; it is activity reporting, not a claim that every detected ad was blocked.

## Limitation

YouTube may deliver ads in ways that cannot safely be distinguished from normal video content. No browser extension can promise that every ad will be blocked, but this design continues checking the live page rather than relying on one fixed layout.
