import { Request, Response } from "express";
import { Types } from "mongoose";
import { sendGmailEmail } from "../services/gmail.service.js";
import EmailAccount from "../models/EmailAccount.js";
import EmailLog from "../models/EmailLog.js";
import { isValidEmail } from "../utils/validation.js";

// send email controller
export const sendEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailAccountId, to, subject, body } = req.body;

    // Authentication check
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Required fields
    if (!emailAccountId || !to || !subject || !body) {
      res.status(400).json({
        success: false,
        message: "emailAccountId, to, subject, and body are required",
      });
      return;
    }

    // Recipient email validation
    if (typeof to !== "string" || !isValidEmail(to)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid recipient email address",
      });
      return;
    }

    // Subject validation
    if (typeof subject !== "string") {
      res.status(400).json({
        success: false,
        message: "Subject must be a string",
      });
      return;
    }

    if (subject.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Subject cannot be empty",
      });
      return;
    }

    if (subject.length > 200) {
      res.status(400).json({
        success: false,
        message: "Subject cannot exceed 200 characters",
      });
      return;
    }

    // Body validation
    if (typeof body !== "string") {
      res.status(400).json({
        success: false,
        message: "Email body must be a string",
      });
      return;
    }

    if (body.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Email body cannot be empty",
      });
      return;
    }

    if (body.length > 100000) {
      res.status(400).json({
        success: false,
        message: "Email body is too large",
      });
      return;
    }

    // Find the email account
    const emailAccount = await EmailAccount.findOne({
      _id: emailAccountId,
      userId: req.userId,
    });

    if (!emailAccount) {
      res.status(404).json({
        success: false,
        message: "Email account not found",
      });
      return;
    }

    try {
      // Send the email
      const result = await sendGmailEmail({
        userId: req.userId,
        emailAccountId,
        to: to.trim(),
        subject: subject.trim(),
        body,
      });

      // Save successful email log
      await EmailLog.create({
        userId: req.userId,
        emailAccountId: emailAccount._id,
        provider: emailAccount.provider,
        from: emailAccount.email,
        to: to.trim(),
        subject: subject.trim(),
        body,
        status: "sent",
        // messageId: result.messageId,
        // threadId: result.threadId,
        messageId: result.messageId ?? undefined,
        threadId: result.threadId ?? undefined,
        sentAt: new Date(),
      });

      res.status(200).json({
        success: true,
        message: "Email sent successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("❌ Gmail send error:", error);

      // Save failed email log
      await EmailLog.create({
        userId: req.userId,
        emailAccountId: emailAccount._id,
        provider: emailAccount.provider,
        from: emailAccount.email,
        to: to.trim(),
        subject: subject.trim(),
        body,
        status: "failed",
        errorMessage: error?.message || "Unable to send email",
      });

      res.status(500).json({
        success: false,
        message: "Unable to send email",
      });
    }
  } catch (error) {
    console.error("❌ Send email controller error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while sending the email",
    });
  }
};

// get sent emails with pagination
// export const getSentEmails = async (
//   req: Request,
//   res: Response,
// ): Promise<void> => {
//   try {
//     if (!req.userId) {
//       res.status(401).json({
//         success: false,
//         message: "Authentication required",
//       });
//       return;
//     }

//     const pageParam = req.query.page;
//     const limitParam = req.query.limit;

//     const page =
//       typeof pageParam === "string" &&
//       Number.isInteger(Number(pageParam)) &&
//       Number(pageParam) > 0
//         ? Number(pageParam)
//         : 1;

//     const limit =
//       typeof limitParam === "string" &&
//       Number.isInteger(Number(limitParam)) &&
//       Number(limitParam) > 0
//         ? Math.min(Number(limitParam), 100)
//         : 20;

//     const skip = (page - 1) * limit;

//     const [emails, totalEmails] = await Promise.all([
//       EmailLog.find({
//         userId: req.userId,
//       })
//         .select("-body")
//         .sort({
//           createdAt: -1,
//         })
//         .skip(skip)
//         .limit(limit),

//       EmailLog.countDocuments({
//         userId: req.userId,
//       }),
//     ]);

//     const totalPages = Math.ceil(totalEmails / limit);

//     res.status(200).json({
//       success: true,
//       emails,
//       pagination: {
//         currentPage: page,
//         limit,
//         totalEmails,
//         totalPages,
//         hasNextPage: page < totalPages,
//         hasPreviousPage: page > 1,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Get sent emails error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Unable to get sent emails",
//     });
//   }
// };

export const getSentEmails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    const searchParam = req.query.search;
    const statusParam = req.query.status;

    const page =
      typeof pageParam === "string" &&
      Number.isInteger(Number(pageParam)) &&
      Number(pageParam) > 0
        ? Number(pageParam)
        : 1;

    const limit =
      typeof limitParam === "string" &&
      Number.isInteger(Number(limitParam)) &&
      Number(limitParam) > 0
        ? Math.min(Number(limitParam), 100)
        : 20;

    const search = typeof searchParam === "string" ? searchParam.trim() : "";

    const status = typeof statusParam === "string" ? statusParam.trim() : "";

    if (status && !["sent", "failed"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be either sent or failed",
      });
      return;
    }

    const query: {
      userId: string;
      status?: "sent" | "failed";
      $or?: Array<{
        from?: { $regex: string; $options: string };
        to?: { $regex: string; $options: string };
        subject?: { $regex: string; $options: string };
      }>;
    } = {
      userId: req.userId,
    };

    if (status) {
      query.status = status as "sent" | "failed";
    }

    if (search) {
      query.$or = [
        {
          from: {
            $regex: search,
            $options: "i",
          },
        },
        {
          to: {
            $regex: search,
            $options: "i",
          },
        },
        {
          subject: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [emails, totalEmails] = await Promise.all([
      EmailLog.find(query)
        .select("-body")
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      EmailLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalEmails / limit);

    res.status(200).json({
      success: true,
      emails,
      pagination: {
        total: totalEmails,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Get sent emails error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to get sent emails",
    });
  }
};

// get emails By ID

export const getSentEmailById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid email ID",
      });
      return;
    }

    // Check if the ID is a valid MongoDB ObjectId
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid email ID",
      });
      return;
    }

    const email = await EmailLog.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!email) {
      res.status(404).json({
        success: false,
        message: "Email not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      email,
    });
  } catch (error) {
    console.error("❌ Get sent email error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to get sent email",
    });
  }
};
