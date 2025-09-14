const express = require("express");
const router = express.Router();

const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getMyNotes,
} = require("../controllers/noteController");

const { authenticate } = require("../middleware/auth");
const {
  requireMember,
  requireOwnershipOrAdmin,
} = require("../middleware/rolePermission");
const {
  ensureTenantIsolation,
  checkAccountStatus,
} = require("../middleware/tenant");
const { checkNoteLimit } = require("../middleware/subscriptionLimit");

/**
 * All routes are protected and require authentication
 */
router.use(authenticate);
router.use(ensureTenantIsolation);
router.use(checkAccountStatus);

/**
 * Notes Routes
 */

// Create new note
router.post("/", requireMember, checkNoteLimit, createNote);

// Get all notes for the tenant
router.get("/", requireMember, getNotes);

// Get user's own notes
router.get("/my-notes", requireMember, getMyNotes);

// Get specific note by ID
router.get("/:id", requireMember, requireOwnershipOrAdmin(), getNoteById);

// Update note
router.put("/:id", requireMember, requireOwnershipOrAdmin(), updateNote);

// Delete note
router.delete("/:id", requireMember, requireOwnershipOrAdmin(), deleteNote);

module.exports = router;
