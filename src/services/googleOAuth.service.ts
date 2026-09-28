import { google } from "googleapis";

const getGoogleOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth environment variables are not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const generateGoogleAuthUrl = (state: string): string => {
  const oauth2Client = getGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    state,
  });
};

export const getGoogleTokens = async (code: string) => {
  const oauth2Client = getGoogleOAuthClient();

  const { tokens } = await oauth2Client.getToken(code);

  return tokens;
};

export const getGoogleEmail = async (accessToken: string): Promise<string> => {
  const oauth2Client = getGoogleOAuthClient();

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const response = await oauth2Client.request<{
    email?: string;
  }>({
    url: "https://www.googleapis.com/oauth2/v2/userinfo",
  });

  if (!response.data.email) {
    throw new Error("Unable to get Google email address");
  }

  return response.data.email;
};
