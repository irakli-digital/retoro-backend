import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userSettings, returnItems, sessions } from "@/lib/db/schema";
import {
  exchangeGoogleCodeForUserInfo,
  isGoogleEmailVerified,
} from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

/**
 * GET /api/auth/google/callback
 * Handles OAuth callback from Google
 * Called by iOS app via ASWebAuthenticationSession
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      // Redirect back to app with error
      return NextResponse.redirect(
        `retoro://google-auth?error=${encodeURIComponent(error)}&message=${encodeURIComponent("Google sign in failed")}`
      );
    }

    // Validate required parameters
    if (!code) {
      console.error("No authorization code received from Google");
      return NextResponse.redirect(
        `retoro://google-auth?error=missing_code&message=${encodeURIComponent("No authorization code received")}`
      );
    }

    // Parse state to get anonymous_user_id
    let anonymousUserId: string | undefined;
    if (state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(decodeURIComponent(state), "base64").toString()
        );
        anonymousUserId = stateData.anonymous_user_id;
      } catch (e) {
        console.warn("Failed to parse state parameter:", e);
      }
    }

    // Exchange code for user info
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
    let userInfo;
    try {
      userInfo = await exchangeGoogleCodeForUserInfo(code, redirectUri);
    } catch (error: any) {
      console.error("Failed to exchange Google code:", error);
      return NextResponse.redirect(
        `retoro://google-auth?error=exchange_failed&message=${encodeURIComponent(error.message || "Failed to authenticate with Google")}`
      );
    }

    const googleUserId = userInfo.sub;
    const email = userInfo.email;
    const fullName = userInfo.name || null;

    // Check if user already exists by Google ID
    let existingUserByGoogle = await db
      .select()
      .from(users)
      .where(eq(users.googleUserId, googleUserId))
      .limit(1);

    let user;

    if (existingUserByGoogle.length > 0) {
      // User exists with this Google ID - just log them in
      user = existingUserByGoogle[0];

      // Update name if provided and not already set
      if (fullName && !user.name) {
        [user] = await db
          .update(users)
          .set({ name: fullName, updatedAt: new Date() })
          .where(eq(users.id, user.id))
          .returning();
      }
    } else {
      // Check if user exists by email
      const existingUserByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUserByEmail.length > 0) {
        // User exists with this email - link Google ID to existing account
        user = existingUserByEmail[0];

        if (user.googleUserId && user.googleUserId !== googleUserId) {
          return NextResponse.redirect(
            `retoro://google-auth?error=email_conflict&message=${encodeURIComponent("This email is already linked to a different Google account")}`
          );
        }

        // Link Google ID to existing account
        [user] = await db
          .update(users)
          .set({
            googleUserId,
            emailVerified: isGoogleEmailVerified(userInfo),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();
      } else {
        // Create new user
        [user] = await db
          .insert(users)
          .values({
            email,
            googleUserId,
            name: fullName,
            password: null, // OAuth users don't have passwords
            emailVerified: isGoogleEmailVerified(userInfo),
          })
          .returning();

        // Create default user settings
        await db.insert(userSettings).values({
          userId: user.id,
          preferredCurrency: "USD",
          notificationsEnabled: true,
          emailNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        });

        console.log(`Created new user via Google: ${user.id}`);
      }
    }

    // Migrate anonymous user data if anonymous_user_id provided
    if (anonymousUserId) {
      // Migrate sessions
      await db
        .update(sessions)
        .set({ userId: user.id })
        .where(eq(sessions.anonymousUserId, anonymousUserId));

      // Migrate return items from anonymous user to new user
      await db
        .update(returnItems)
        .set({ userId: user.id })
        .where(eq(returnItems.userId, anonymousUserId));

      console.log(
        `Migrated anonymous data for ${anonymousUserId} to user ${user.id}`
      );
    }

    // Create session
    const session = await createSession(user.id, anonymousUserId);

    console.log(`Google auth successful for user ${user.id}`);

    // Redirect back to app with success and token
    // The iOS app will parse this URL and extract the token
    return NextResponse.redirect(
      `retoro://google-auth?status=success&token=${encodeURIComponent(session.token)}`
    );
  } catch (error) {
    console.error("Google authentication callback error:", error);
    return NextResponse.redirect(
      `retoro://google-auth?error=server_error&message=${encodeURIComponent("Authentication failed")}`
    );
  }
}
