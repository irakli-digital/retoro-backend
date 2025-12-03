import { jwtVerify, createRemoteJWKSet } from "jose";

// Apple's public keys endpoint
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

// Create a JWKS (JSON Web Key Set) instance for verifying Apple tokens
const JWKS = createRemoteJWKSet(new URL(APPLE_JWKS_URL));

export interface AppleTokenPayload {
  iss: string; // Issuer (should be "https://appleid.apple.com")
  sub: string; // Subject (Apple's unique identifier for the user)
  aud: string; // Audience (your client ID / bundle ID)
  iat: number; // Issued at
  exp: number; // Expiration time
  email?: string; // User's email (if shared)
  email_verified?: boolean | string; // Whether email is verified
  is_private_email?: boolean | string; // Whether it's a relay email
  real_user_status?: number; // 0=unsupported, 1=unknown, 2=likely real
}

/**
 * Verifies an Apple identity token and returns the decoded payload
 * @param identityToken - The identity token from Apple Sign In
 * @param clientId - Your app's bundle ID or service ID
 * @returns The verified token payload
 */
export async function verifyAppleToken(
  identityToken: string,
  clientId: string
): Promise<AppleTokenPayload> {
  try {
    // Verify the JWT signature using Apple's public keys
    const { payload } = await jwtVerify(identityToken, JWKS, {
      issuer: "https://appleid.apple.com",
      audience: clientId,
    });

    return payload as AppleTokenPayload;
  } catch (error) {
    console.error("Apple token verification failed:", error);
    throw new Error("Invalid Apple identity token");
  }
}

/**
 * Validates that the email from Apple is verified
 * Apple tokens have email_verified as either boolean or string "true"/"false"
 */
export function isEmailVerified(payload: AppleTokenPayload): boolean {
  if (payload.email_verified === undefined) return false;

  if (typeof payload.email_verified === "boolean") {
    return payload.email_verified;
  }

  return payload.email_verified === "true";
}

/**
 * Checks if the user appears to be a real person based on Apple's fraud detection
 * @param payload - The decoded Apple token payload
 * @returns true if user is likely real
 */
export function isLikelyRealUser(payload: AppleTokenPayload): boolean {
  // real_user_status: 0=unsupported, 1=unknown, 2=likely real
  return payload.real_user_status === 2;
}
