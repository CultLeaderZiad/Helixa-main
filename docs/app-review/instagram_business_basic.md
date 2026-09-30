# instagram_business_basic

## Use case
Identify the Instagram professional account the creator just connected. Helixa stores the account id and username so the inbox, comment rules, and reconnect banner know which profile the token belongs to. The scope is requested in `INSTAGRAM_LOGIN_SCOPES` during Instagram Login. Helixa does not read the media library and does not request a content-publishing scope.

## Screencast
1. Sign in to Helixa and open Connected Platforms.
2. Click Connect Instagram and approve the Instagram Login dialog. The reviewer can see `instagram_business_basic` in the consent screen.
3. Return to Connected Platforms. The professional username is shown on the connected card.
4. Open Settings and confirm the same account is the one automations will reply as.
5. Do not open a composer. Helixa does not publish a post, story, or reel.
