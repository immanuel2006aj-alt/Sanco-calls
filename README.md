# Sanco Calls – Private ID-to-ID Voice Calling

**Lightweight, encrypted, peer‑to‑peer voice calling with zero infrastructure.**

Sanco Calls is a production‑ready, single‑page web application that enables direct browser‑to‑browser audio calls using WebRTC. It uses PeerJS for signaling and adapts to low‑bandwidth networks (down to ~6 kbps) with crystal‑clear Opus audio, echo cancellation, noise suppression, and automatic gain control.

## Features

- **ID‑based calling** – Generate a unique Call ID, share it, and connect.
- **Zero‑server** – No backend required; uses PeerJS cloud signaling (or self‑host).
- **Adaptive audio** – Opus codec forced to 6 kbps with FEC and DTX for low‑bandwidth resilience.
- **Responsive UI** – Works on old phones, modern smartphones, tablets, and desktops.
- **Pure SVG icons** – No emojis; sharp on every screen.
- **Privacy‑first** – No logs, no tracking, end‑to‑end encrypted (DTLS‑SRTP).
- **GitHub Pages ready** – Deploy with one click.

## Live Demo

[https://yourusername.github.io/sanco-calls/](https://yourusername.github.io/sanco-calls/)

## How to Use

1. **Caller**: Click **Generate Call ID** – copy the displayed ID.
2. **Receiver**: Paste the ID into the input field and click **Connect**.
3. **Talk** – use the mic toggle and end call buttons.
4. **End** – click **End Call** or close the tab; all resources are cleaned.

## Deployment on GitHub Pages

1. Fork or clone this repository.
2. Enable GitHub Pages in your repository settings (branch: `main`, root folder).
3. Your app is live at `https://yourusername.github.io/sanco-calls/`.

## Technology Stack

- HTML5 + CSS3 (minified)
- Vanilla JavaScript (minified/obfuscated)
- WebRTC (via PeerJS)
- SVG for all icons

## Security Notes

- The code includes runtime checks to prevent file‑protocol and iframe embedding.
- All sensitive logic is minified; no secrets are exposed.
- WebRTC encryption is mandatory.

## License

MIT – Use it freely, modify it, and share it.