import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import {
  createRefreshToken,
  verifyRefreshToken,
  deleteRefreshToken,
} from "../services/refreshToken.service.js";
import {
  verifyPasswordResetToken,
  deletePasswordResetToken,
} from "../services/passwordReset.service.js";
import RefreshToken from "../models/RefreshToken.js";
import { createPasswordResetToken } from "../services/passwordReset.service.js";
import { sendPasswordResetEmail } from "../services/email.service.js";

const REFRESH_TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000;

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Name is required",
      });

      return;
    }

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });

      return;
    }

    if (!password) {
      res.status(400).json({
        success: false,
        message: "Password is required",
      });

      return;
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });

      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while creating your account",
    });
  }
};

// LOGIN
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });

      return;
    }

    if (!password) {
      res.status(400).json({
        success: false,
        message: "Password is required",
      });

      return;
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });

      return;
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
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

    // Short-lived access token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
      },
      secret,
      {
        expiresIn: "15m",
      },
    );

    // Create refresh token with a 12-hour expiration
    const refreshToken = await createRefreshToken(user._id.toString());

    // Store refresh token securely in an HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_TOKEN_EXPIRY_MS,
      path: "/api/auth",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while logging in",
    });
  }
};

// REFRESH ACCESS TOKEN
export const refreshAccessToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token is missing",
      });

      return;
    }

    const storedToken = await verifyRefreshToken(refreshToken);

    if (!storedToken) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
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

    const userId = storedToken.userId.toString();

    // Create a new short-lived access token
    const token = jwt.sign(
      {
        userId,
      },
      secret,
      {
        expiresIn: "15m",
      },
    );

    // Calculate how much time is left on the original refresh token
    const remainingTime = storedToken.expiresAt.getTime() - Date.now();

    // Rotate the refresh token
    await deleteRefreshToken(refreshToken);

    // Keep the original expiration time
    const newRefreshToken = await createRefreshToken(
      userId,
      storedToken.expiresAt,
    );

    // Store the new refresh token in the cookie
    // using the remaining time instead of another 12 hours
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.max(remainingTime, 0),
      path: "/api/auth",
    });

    res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      token,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while refreshing your session",
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while logging out",
    });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });

      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Always return the same response whether the email exists or not.
    // This prevents revealing which emails have accounts.
    if (!user) {
      res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });

      return;
    }

    const resetToken = await createPasswordResetToken(user._id.toString());

    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};
export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });

      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });

      return;
    }

    // Verify the reset token
    const storedToken = await verifyPasswordResetToken(token);

    if (!storedToken) {
      res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired",
      });

      return;
    }

    // Find the user
    const user = await User.findById(storedToken.userId);

    if (!user) {
      res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired",
      });

      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    user.password = hashedPassword;

    await user.save();

    // Delete the reset token so it cannot be reused
    await deletePasswordResetToken(token);

    // Log the user out of existing sessions
    await RefreshToken.deleteMany({
      userId: user._id,
    });

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};
