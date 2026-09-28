import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  generateGoogleAuthUrl,
  getGoogleEmail,
  getGoogleTokens,
} from "../services/googleOAuth.service.js";
import EmailAccount from "../models/EmailAccount.js";
import { encryptToken } from "../utils/tokenEncryption.js";

export const connectGoogle = (req: Request, res: Response): void => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });
      return;
    }

    const state = jwt.sign(
      {
        userId: req.userId,
      },
      secret,
      {
        expiresIn: "10m",
      },
    );

    const authUrl = generateGoogleAuthUrl(state);

    res.status(200).json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error("Google OAuth connect error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to start Google authentication",
    });
  }
};

export const googleCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      res.status(400).json({
        success: false,
        message: "Google authorization code is missing",
      });
      return;
    }

    if (!state || typeof state !== "string") {
      res.status(400).json({
        success: false,
        message: "OAuth state is missing",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });
      return;
    }

    const decoded = jwt.verify(state, secret) as {
      userId: string;
    };

    const tokens = await getGoogleTokens(code);

    if (!tokens.access_token) {
      res.status(400).json({
        success: false,
        message: "Google did not provide an access token",
      });
      return;
    }

    const email = await getGoogleEmail(tokens.access_token);

    const encryptedAccessToken = encryptToken(tokens.access_token);

    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : undefined;

    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : undefined;

    const emailAccount = await EmailAccount.findOneAndUpdate(
      {
        userId: decoded.userId,
        provider: "gmail",
        email,
      },
      {
        userId: decoded.userId,
        provider: "gmail",
        email,
        accessToken: encryptedAccessToken,
        ...(encryptedRefreshToken && {
          refreshToken: encryptedRefreshToken,
        }),
        tokenExpiresAt,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Google account connected successfully",
      emailAccount: {
        id: emailAccount._id,
        provider: emailAccount.provider,
        email: emailAccount.email,
      },
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error);

    res.status(400).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};
