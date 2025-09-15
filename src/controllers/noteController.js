const Note = require("../models/Note");
const Tag = require("../models/Tag");
const Account = require("../models/Account");
const { sendResponse, sendError } = require("../utils/helpers");
const { ROLES } = require("../utils/constants");

/**
 * Create a new note
 * POST /notes
 */
const createNote = async (req, res) => {
  try {
    const { title, description, tags = [] } = req.body;
    const user = req.user;
    const account = req.account;

    // Validate required fields
    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    // Process tags if provided
    let tagIds = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        if (typeof tagName === "string" && tagName.trim()) {
          const tag = await Tag.findOrCreate(account._id, tagName.trim());
          tagIds.push(tag._id);
        }
      }
    }

    // Create note
    const note = new Note({
      account: account._id,
      user: user._id,
      title: title.trim(),
      description: description ? description.trim() : "",
      tags: tagIds,
    });

    await note.save();

    // Increment account note count
    await account.incrementNoteCount();

    // Populate tags for response
    await note.populate("tags");

    sendResponse(res, 201, true, "Note created successfully");
  } catch (error) {
    console.error("Create note error:", error);
    sendError(res, 500, "Failed to create note");
  }
};

/**
 * Get all notes for the tenant
 * GET /notes
 */
const getNotes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tags } = req.query;
    const user = req.user;
    const tenantFilter = req.tenantFilter || {};

    // Build query
    const query = {
      ...tenantFilter,
      isDeleted: false,
    };

    // Add text search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Add tag filter if provided
    // (STOP HERE)
    if (tags) {
      const tagNames = typeof tags === "string" ? tags.split(",") : tags;

      const tagObjects = await Tag.find({
        account: user.account._id,
        tagName: { $in: tagNames.map((tag) => tag.toLowerCase()) },
      });

      if (tagObjects.length > 0) {
        query.tags = { $in: tagObjects.map((tag) => tag._id) };
      } else {
        // if you want NO results when tags don't exist:
        query.tags = { $in: [] };
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Note.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Fetch notes with pagination
    let notesQuery = Note.find(query)
      .populate("tags")
      .populate("user", "name email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Add text search score sorting if searching
    if (search) {
      notesQuery = notesQuery.sort({ score: { $meta: "textScore" } });
    }

    const notes = await notesQuery;

    // Format response
    const formattedNotes = notes.map((note) => ({
      id: note._id,
      title: note.title,
      description: note.description,
      tags: note.tags.map((tag) => tag.tagName),
      author: {
        id: note.user._id,
        name: note.user.name,
        email: note.user.email,
      },
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));

    sendResponse(res, 200, true, "Notes retrieved successfully", {
      notes: formattedNotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Get notes error:", error);
    sendError(res, 500, "Failed to retrieve notes");
  }
};

/**
 * Get specific note by ID
 * GET /notes/:id
 */
const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantFilter = req.tenantFilter || {};

    const note = await Note.findOne({
      _id: id,
      ...tenantFilter,
      isDeleted: false,
    })
      .populate("tags")
      .populate("user", "name email");

    if (!note) {
      return sendError(res, 404, "Note not found");
    }

    sendResponse(res, 200, true, "Note retrieved successfully", {
      note: {
        id: note._id,
        title: note.title,
        description: note.description,
        tags: note.tags.map((tag) => tag.tagName),
        author: {
          id: note.user._id,
          name: note.user.name,
          email: note.user.email,
        },
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get note by ID error:", error);
    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid note ID");
    }
    sendError(res, 500, "Failed to retrieve note");
  }
};

/**
 * Update note
 * PUT /notes/:id
 */
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags } = req.body;
    const user = req.user;
    const tenantFilter = req.tenantFilter || {};

    // Find note
    const note = await Note.findOne({
      _id: id,
      ...tenantFilter,
      isDeleted: false,
    });

    if (!note) {
      return sendError(res, 404, "Note not found");
    }

    // Check ownership if user is not admin
    if (
      user.role.roleName !== ROLES.ADMIN &&
      note.user.toString() !== user._id.toString()
    ) {
      return sendError(res, 403, "You can only update your own notes");
    }

    // Update fields
    if (title !== undefined) {
      if (!title.trim()) {
        return sendError(res, 400, "Title is required");
      }
      note.title = title.trim();
    }

    if (description !== undefined) {
      note.description = description ? description.trim() : "";
    }

    // Process tags if provided
    if (tags !== undefined) {
      let tagIds = [];
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tagName of tags) {
          if (typeof tagName === "string" && tagName.trim()) {
            const tag = await Tag.findOrCreate(
              user.account._id,
              tagName.trim()
            );
            tagIds.push(tag._id);
          }
        }
      }
      note.tags = tagIds;
    }

    await note.save();
    await note.populate("tags");

    sendResponse(res, 200, true, "Note updated successfully", {
      note: {
        id: note._id,
        title: note.title,
        description: note.description,
        tags: note.tags.map((tag) => tag.tagName),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update note error:", error);
    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid note ID");
    }
    sendError(res, 500, "Failed to update note");
  }
};

/**
 * Delete note
 * DELETE /notes/:id
 */
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const account = req.account;
    const tenantFilter = req.tenantFilter || {};

    // Find note
    const note = await Note.findOne({
      _id: id,
      ...tenantFilter,
      isDeleted: false,
    });

    if (!note) {
      return sendError(res, 404, "Note not found");
    }

    // Check ownership if user is not admin
    if (
      user.role.roleName !== ROLES.ADMIN &&
      note.user.toString() !== user._id.toString()
    ) {
      return sendError(res, 403, "You can only delete your own notes");
    }

    // Soft delete the note
    note.isDeleted = true;
    await note.save();

    // Decrement account note count
    await account.decrementNoteCount();

    sendResponse(res, 200, true, "Note deleted successfully");
  } catch (error) {
    console.error("Delete note error:", error);
    if (error.name === "CastError") {
      return sendError(res, 400, "Invalid note ID");
    }
    sendError(res, 500, "Failed to delete note");
  }
};

/**
 * Get user's own notes
 * GET /notes/my-notes
 */
const getMyNotes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tags } = req.query;
    const user = req.user;

    // Build query for user's own notes
    const query = {
      account: user.account._id,
      user: user._id,
      isDeleted: false,
    };

    // Add text search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Add tag filter if provided
    if (tags) {
      const tagNames = Array.isArray(tags) ? tags : [tags];
      const tagObjects = await Tag.find({
        account: user.account._id,
        tagName: { $in: tagNames.map((tag) => tag.toLowerCase()) },
      });

      if (tagObjects.length > 0) {
        query.tags = { $in: tagObjects.map((tag) => tag._id) };
      } else {
        // If tags don't exist, return empty result
        return sendResponse(
          res,
          200,
          true,
          "Your notes retrieved successfully",
          {
            notes: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0,
            },
          }
        );
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Note.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Fetch notes with pagination
    let notesQuery = Note.find(query)
      .populate("tags")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Add text search score sorting if searching
    if (search) {
      notesQuery = notesQuery.sort({ score: { $meta: "textScore" } });
    }

    const notes = await notesQuery;

    // Format response
    const formattedNotes = notes.map((note) => ({
      id: note._id,
      title: note.title,
      description: note.description,
      tags: note.tags.map((tag) => tag.tagName),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));

    sendResponse(res, 200, true, "Your notes retrieved successfully", {
      notes: formattedNotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Get my notes error:", error);
    sendError(res, 500, "Failed to retrieve your notes");
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getMyNotes,
};
