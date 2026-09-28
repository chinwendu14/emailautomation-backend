import { Request, Response } from "express";
import EmailAccount from "../models/EmailAccount.js";

export const getEmailAccounts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const emailAccounts = await EmailAccount.find({
      userId: req.userId,
    }).select("-accessToken -refreshToken");

    res.status(200).json({
      success: true,
      emailAccounts,
    });
  } catch (error) {
    console.error("Get email accounts error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while getting your email accounts",
    });
  }
};
