# user.info.basic

## Use case
Confirm the TikTok account that completed the authorize URL is a real user Helixa can attach to the workspace. This is the identity check beside the business-account id. Helixa does not read the person's private social graph.

## Screencast
1. Leave `TIKTOK_MESSAGING_ENABLED` off and show that TikTok connect is unavailable. Then, on an approved app, set the flag and open Connected Platforms.
2. Start TikTok connect. On the consent screen, point out `user.info.basic`.
3. After redirect, show the connected TikTok account card.
4. Do not request `video.publish` and do not upload a video.
