import Department from "../models/Department.js";

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.status(200).json(departments);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private/Admin
export const createDepartment = async (req, res, next) => {
  try {
    const { name, programs } = req.body;

    if (!name) {
      res.status(400);
      throw new Error("Department name is required");
    }

    const exists = await Department.findOne({ name });
    if (exists) {
      res.status(400);
      throw new Error("Department name already exists");
    }

    const department = await Department.create({
      name,
      programs: Array.isArray(programs) ? programs : [],
    });

    res.status(201).json(department);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private/Admin
export const updateDepartment = async (req, res, next) => {
  try {
    const { name, programs } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404);
      throw new Error("Department not found");
    }

    if (name) {
      // Check if another department has the same name
      const exists = await Department.findOne({ name, _id: { $ne: req.params.id } });
      if (exists) {
        res.status(400);
        throw new Error("Department name already exists");
      }
      department.name = name;
    }

    if (programs) {
      department.programs = Array.isArray(programs) ? programs : [];
    }

    const updated = await department.save();
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
export const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404);
      throw new Error("Department not found");
    }

    await department.deleteOne();
    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    next(error);
  }
};
