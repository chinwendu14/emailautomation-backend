import crypto from "crypto";
import PasswordResetToken from "../models/PasswordResetToken.js";

const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const createPasswordResetToken = async (
  userId: string,
): Promise<string> => {
  // Remove any existing reset token for this user
  await PasswordResetToken.deleteMany({
    userId,
  });

  // Generate a secure random token
  const resetToken = crypto.randomBytes(64).toString("hex");

  // Hash the token before storing it
  const tokenHash = hashToken(resetToken);

  // Token expires after 1 hour
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);

  await PasswordResetToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  // Return the original token.
  // This token will be included in the reset email.
  return resetToken;
};

export const verifyPasswordResetToken = async (resetToken: string) => {
  const tokenHash = hashToken(resetToken);

  const storedToken = await PasswordResetToken.findOne({
    tokenHash,
  });

  if (!storedToken) {
    return null;
  }

  // Check if the token has expired
  if (storedToken.expiresAt.getTime() <= Date.now()) {
    await PasswordResetToken.deleteOne({
      _id: storedToken._id,
    });

    return null;
  }

  return storedToken;
};

export const deletePasswordResetToken = async (
  resetToken: string,
): Promise<void> => {
  const tokenHash = hashToken(resetToken);

  await PasswordResetToken.deleteOne({
    tokenHash,
  });
};
