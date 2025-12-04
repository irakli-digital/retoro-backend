/**
 * Google OAuth utilities
 * Handles Google OAuth token verification and user info retrieval
 */

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Exchange Google authorization code for access token and get user info
 */
export async function exchangeGoogleCodeForUserInfo(
  code: string,
  redirectUri: string
): Promise<GoogleUserInfo> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  // Exchange code for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Google token exchange error:", error);
    throw new Error("Failed to exchange Google authorization code");
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error("No access token received from Google");
  }

  // Get user info using access token
  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!userInfoResponse.ok) {
    const error = await userInfoResponse.text();
    console.error("Google userinfo error:", error);
    throw new Error("Failed to get user info from Google");
  }

  const userInfo: GoogleUserInfo = await userInfoResponse.json();

  if (!userInfo.email) {
    throw new Error("No email received from Google");
  }

  return userInfo;
}

/**
 * Verify if email is verified by Google
 */
export function isGoogleEmailVerified(userInfo: GoogleUserInfo): boolean {
  return userInfo.email_verified === true;
}
