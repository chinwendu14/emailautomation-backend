import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";

// Refresh token expires after 12 hours
const REFRESH_TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000;

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const createRefreshToken = async (
  userId: string,
  expiresAt?: Date,
): Promise<string> => {
  // Generate a random refresh token
  const refreshToken = crypto.randomBytes(64).toString("hex");

  // Hash the token before storing it in MongoDB
  const tokenHash = hashToken(refreshToken);

  // If an expiration date was provided, keep it.
  // Otherwise, create a new 12-hour expiration.
  const tokenExpiresAt =
    expiresAt ?? new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  // Store only the hash
  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt: tokenExpiresAt,
  });

  // Return the actual token to the caller
  return refreshToken;
};

export const verifyRefreshToken = async (refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);

  const storedToken = await RefreshToken.findOne({
    tokenHash,
  });

  if (!storedToken) {
    return null;
  }

  // Check whether the token has expired
  if (storedToken.expiresAt.getTime() <= Date.now()) {
    await RefreshToken.deleteOne({
      _id: storedToken._id,
    });

    return null;
  }

  return storedToken;
};

export const deleteRefreshToken = async (
  refreshToken: string,
): Promise<void> => {
  const tokenHash = hashToken(refreshToken);

  await RefreshToken.deleteOne({
    tokenHash,
  });
};
