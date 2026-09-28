import { Request, Response } from "express";
import { Types } from "mongoose";
import Contact from "../models/Contact.js";
import { isValidEmail } from "../utils/validation.js";

// create contact
export const createContact = async (
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

    const { firstName, lastName, email, company, phone } = req.body;

    if (!firstName || !email) {
      res.status(400).json({
        success: false,
        message: "First name and email are required",
      });
      return;
    }

    if (typeof firstName !== "string") {
      res.status(400).json({
        success: false,
        message: "First name must be a string",
      });
      return;
    }

    if (firstName.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "First name cannot be empty",
      });
      return;
    }

    if (typeof email !== "string" || !isValidEmail(email)) {
      res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
      return;
    }

    if (lastName !== undefined && typeof lastName !== "string") {
      res.status(400).json({
        success: false,
        message: "Last name must be a string",
      });
      return;
    }

    if (company !== undefined && typeof company !== "string") {
      res.status(400).json({
        success: false,
        message: "Company must be a string",
      });
      return;
    }

    if (phone !== undefined && typeof phone !== "string") {
      res.status(400).json({
        success: false,
        message: "Phone must be a string",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingContact = await Contact.findOne({
      userId: req.userId,
      email: normalizedEmail,
    });

    if (existingContact) {
      res.status(409).json({
        success: false,
        message: "A contact with this email already exists",
      });
      return;
    }

    const contact = await Contact.create({
      userId: req.userId,
      firstName: firstName.trim(),
      lastName: lastName?.trim(),
      email: normalizedEmail,
      company: company?.trim(),
      phone: phone?.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: {
        contact,
      },
    });
  } catch (error) {
    console.error("❌ Create contact error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create contact",
    });
  }
};

// get contacts with pagination
export const getContacts = async (
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

    const query: any = {
      userId: req.userId,
    };

    if (search) {
      query.$or = [
        {
          firstName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          company: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [contacts, totalContacts] = await Promise.all([
      Contact.find(query)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      Contact.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalContacts / limit);

    res.status(200).json({
      success: true,
      contacts,
      pagination: {
        total: totalContacts,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Get contacts error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to get contacts",
    });
  }
};

// get single contact by id
export const getContactById = async (
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

    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid contact ID",
      });
      return;
    }

    const contact = await Contact.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!contact) {
      res.status(404).json({
        success: false,
        message: "Contact not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        contact,
      },
    });
  } catch (error) {
    console.error("❌ Get contact error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to get contact",
    });
  }
};

// update contact by id

// update contact
export const updateContact = async (
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

    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid contact ID",
      });
      return;
    }

    const { firstName, lastName, email, company, phone } = req.body;

    // Make sure at least one field was provided
    if (
      firstName === undefined &&
      lastName === undefined &&
      email === undefined &&
      company === undefined &&
      phone === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one field to update",
      });
      return;
    }

    // Validate first name
    if (firstName !== undefined) {
      if (typeof firstName !== "string") {
        res.status(400).json({
          success: false,
          message: "First name must be a string",
        });
        return;
      }

      if (firstName.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "First name cannot be empty",
        });
        return;
      }
    }

    // Validate last name
    if (lastName !== undefined && typeof lastName !== "string") {
      res.status(400).json({
        success: false,
        message: "Last name must be a string",
      });
      return;
    }

    // Validate email
    if (email !== undefined) {
      if (typeof email !== "string" || !isValidEmail(email)) {
        res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
        return;
      }
    }

    // Validate company
    if (company !== undefined && typeof company !== "string") {
      res.status(400).json({
        success: false,
        message: "Company must be a string",
      });
      return;
    }

    // Validate phone
    if (phone !== undefined && typeof phone !== "string") {
      res.status(400).json({
        success: false,
        message: "Phone must be a string",
      });
      return;
    }

    // Find the contact
    const contact = await Contact.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!contact) {
      res.status(404).json({
        success: false,
        message: "Contact not found",
      });
      return;
    }

    // Normalize email if it is being updated
    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      const existingContact = await Contact.findOne({
        userId: req.userId,
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (existingContact) {
        res.status(409).json({
          success: false,
          message: "A contact with this email already exists",
        });
        return;
      }

      contact.email = normalizedEmail;
    }

    // Update only the fields provided
    if (firstName !== undefined) {
      contact.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      contact.lastName = lastName.trim();
    }

    if (company !== undefined) {
      contact.company = company.trim();
    }

    if (phone !== undefined) {
      contact.phone = phone.trim();
    }

    await contact.save();

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: {
        contact,
      },
    });
  } catch (error) {
    console.error("❌ Update contact error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update contact",
    });
  }
};

// delete contact by id
// delete contact
export const deleteContact = async (
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

    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid contact ID",
      });
      return;
    }

    const contact = await Contact.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!contact) {
      res.status(404).json({
        success: false,
        message: "Contact not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete contact error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete contact",
    });
  }
};
