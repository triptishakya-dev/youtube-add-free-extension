# YouTube Ad Guard

A Chrome Manifest V3 starter extension for YouTube-focused ad-request blocking and visible ad-state detection.

## Local test

1. Open `chrome://extensions` in Chrome.
2. Turn on Developer mode.
3. Click the reload icon on the YouTube Ad Guard card.
4. Open or reload a YouTube page, then click the extension icon to view status or pause protection.

The popup reports promotional page elements hidden by the content filter. This is distinct from network requests blocked by the ruleset.

The summary combines hidden page elements with detected player ad indicators; it is activity reporting, not a claim that every detected ad was blocked.

## Limitation

YouTube may deliver ads in ways that cannot safely be distinguished from normal video content. This project does not promise that every ad will be blocked.
