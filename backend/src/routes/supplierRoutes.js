const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const { authenticateToken, authorize } = require("../middlewares/auth");
const { Supplier } = require("../models");
const { Op } = require("sequelize");

/**
 * @route   GET /api/suppliers
 * @desc    List all suppliers with filters
 * @access  Private
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { search, country, page = 1, limit = 50 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { contact_person: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (country) {
      where.country = country;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Supplier.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [["name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("List suppliers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list suppliers",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private (Admin, Warehouse)
 */
router.post(
  "/",
  authenticateToken,
  authorize("ADMIN", "WAREHOUSE"),
  [
    body("name").notEmpty().withMessage("Supplier name is required"),
    body("contact_person").optional().isString(),
    body("phone").optional().isString(),
    body("email").optional().isEmail().withMessage("Valid email required"),
    body("address").optional().isString(),
    body("country").optional().isString(),
  ],
  async (req, res) => {
    try {
      const supplier = await Supplier.create(req.body);

      res.status(201).json({
        success: true,
        message: "Supplier created successfully",
        data: supplier,
      });
    } catch (error) {
      console.error("Create supplier error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create supplier",
        error: error.message,
      });
    }
  },
);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findByPk(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Get supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get supplier",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (Admin, Warehouse)
 */
router.put(
  "/:id",
  authenticateToken,
  authorize("ADMIN", "WAREHOUSE"),
  [
    param("id").isInt({ min: 1 }).withMessage("Valid supplier ID is required"),
    body("name")
      .optional()
      .notEmpty()
      .withMessage("Supplier name cannot be empty"),
    body("contact_person").optional().isString(),
    body("phone").optional().isString(),
    body("email").optional().isEmail().withMessage("Valid email required"),
    body("address").optional().isString(),
    body("country").optional().isString(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      await supplier.update(req.body);

      res.status(200).json({
        success: true,
        message: "Supplier updated successfully",
        data: supplier,
      });
    } catch (error) {
      console.error("Update supplier error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update supplier",
        error: error.message,
      });
    }
  },
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authenticateToken,
  authorize("ADMIN"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const supplier = await Supplier.findByPk(id);

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      await supplier.destroy();

      res.status(200).json({
        success: true,
        message: "Supplier deleted successfully",
      });
    } catch (error) {
      console.error("Delete supplier error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete supplier",
        error: error.message,
      });
    }
  },
);

module.exports = router;
