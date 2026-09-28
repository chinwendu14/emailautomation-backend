//

import { google } from "googleapis";
import EmailAccount from "../models/EmailAccount.js";
import { decryptToken, encryptToken } from "../utils/tokenEncryption.js";

const getGoogleOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth environment variables are not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const getGmailAuthClient = async (
  emailAccountId: string,
  userId: string,
) => {
  // Make sure the Gmail account belongs to the logged-in user.
  const emailAccount = await EmailAccount.findOne({
    _id: emailAccountId,
    userId,
  });

  if (!emailAccount) {
    throw new Error("Email account not found");
  }

  if (emailAccount.provider !== "gmail") {
    throw new Error("Email account is not a Gmail account");
  }

  if (!emailAccount.refreshToken) {
    throw new Error("Gmail refresh token is not available");
  }

  // Decrypt the refresh token stored in MongoDB.
  const refreshToken = decryptToken(emailAccount.refreshToken);

  const oauth2Client = getGoogleOAuthClient();

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Get a fresh access token from Google.
  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Unable to refresh Gmail access token");
  }

  // Encrypt and save the new access token.
  emailAccount.accessToken = encryptToken(credentials.access_token);

  if (credentials.expiry_date) {
    emailAccount.tokenExpiresAt = new Date(credentials.expiry_date);
  }

  await emailAccount.save();

  return {
    oauth2Client,
    emailAccount,
  };
};
