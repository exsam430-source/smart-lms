import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ── Protect: verify token ────────────────────────────────
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "No token provided" });
  }
};

// ── Role: accept one or more roles ──────────────────────
// Usage: role("admin")  or  role("teacher", "admin")
export const role = (...allowed) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// ── Convenience shortcuts ────────────────────────────────
export const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === "student") return next();
  return res.status(403).json({ message: "Student access only" });
};

export const teacherOnly = (req, res, next) => {
  if (req.user && req.user.role === "teacher") return next();
  return res.status(403).json({ message: "Teacher access only" });
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Admin access only" });
};