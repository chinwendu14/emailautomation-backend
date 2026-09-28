import { Request, Response } from "express";
import ContactGroup from "../models/ContactGroup.js";
import { Types } from "mongoose";

// create contact group
export const createContactGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Make sure the user is authenticated
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const { name, description } = req.body;

    // Validate name
    if (!name) {
      res.status(400).json({
        success: false,
        message: "Group name is required",
      });
      return;
    }

    if (typeof name !== "string") {
      res.status(400).json({
        success: false,
        message: "Group name must be a string",
      });
      return;
    }

    if (name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Group name cannot be empty",
      });
      return;
    }

    // Validate description if provided
    if (description !== undefined && typeof description !== "string") {
      res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
      return;
    }

    const normalizedName = name.trim();

    // Check if this user already has a group with this name
    const existingGroup = await ContactGroup.findOne({
      userId: req.userId,
      name: normalizedName,
    });

    if (existingGroup) {
      res.status(409).json({
        success: false,
        message: "A contact group with this name already exists",
      });
      return;
    }

    // Create the group
    const group = await ContactGroup.create({
      userId: req.userId,
      name: normalizedName,
      description: description?.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Contact group created successfully",
      data: {
        group,
      },
    });
  } catch (error) {
    console.error("❌ Create contact group error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create contact group",
    });
  }
};

// get all contact groups for a user

// get contact groups with pagination and search
export const getContactGroups = async (
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

    // Search by group name or description
    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [groups, totalGroups] = await Promise.all([
      ContactGroup.find(query)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),

      ContactGroup.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalGroups / limit);

    res.status(200).json({
      success: true,
      groups,
      pagination: {
        total: totalGroups,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Get contact groups error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to get contact groups",
    });
  }
};

// update contact group

// get single contact group by id
export const getContactGroupById = async (
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

    // Validate contact group ID
    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid contact group ID",
      });
      return;
    }

    // Find group belonging to the logged-in user
    const group = await ContactGroup.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!group) {
      res.status(404).json({
        success: false,
        message: "Contact group not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        group,
      },
    });
  } catch (error) {
    console.error("❌ Get contact group error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to get contact group",
    });
  }
};

// update contact group By ID
export const updateContactGroup = async (
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

    // Validate contact group ID
    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid contact group ID",
      });
      return;
    }

    const { name, description } = req.body;

    // Make sure at least one field was provided
    if (name === undefined && description === undefined) {
      res.status(400).json({
        success: false,
        message: "Please provide at least one field to update",
      });
      return;
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string") {
        res.status(400).json({
          success: false,
          message: "Group name must be a string",
        });
        return;
      }

      if (name.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: "Group name cannot be empty",
        });
        return;
      }
    }

    // Validate description if provided
    if (description !== undefined && typeof description !== "string") {
      res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
      return;
    }

    // Find the group belonging to the logged-in user
    const group = await ContactGroup.findOne({
      _id: id,
      userId: req.userId,
    });

    if (!group) {
      res.status(404).json({
        success: false,
        message: "Contact group not found",
      });
      return;
    }

    // Update name
    if (name !== undefined) {
      const normalizedName = name.trim();

      // Check if another group already has this name
      const existingGroup = await ContactGroup.findOne({
        userId: req.userId,
        name: normalizedName,
        _id: { $ne: id },
      });

      if (existingGroup) {
        res.status(409).json({
          success: false,
          message: "A contact group with this name already exists",
        });
        return;
      }

      group.name = normalizedName;
    }

    // Update description
    if (description !== undefined) {
      group.description = description.trim();
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: "Contact group updated successfully",
      data: {
        group,
      },
    });
  } catch (error) {
    console.error("❌ Update contact group error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update contact group",
    });
  }
};

// delete contact group
export const deleteContactGroup = async (
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

    // Validate contact group ID
    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid contact group ID",
      });
      return;
    }

    // Delete only if the group belongs to the logged-in user
    const group = await ContactGroup.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!group) {
      res.status(404).json({
        success: false,
        message: "Contact group not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Contact group deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete contact group error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete contact group",
    });
  }
};
