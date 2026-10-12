import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ Ensure 'uploads' folder exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Multer storage configuration
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// ✅ File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /pdf|mp4|mov|avi|docx|doc|pptx|ppt|xlsx|xls|zip|rar|jpg|jpeg|png|gif|txt|csv/;

  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    cb(null, true);
  } else {
    cb(new Error("File type not supported. Allowed: PDF, videos, office documents, zip/rar, images, and text."));
  }
};

// ✅ Max file size 50MB (optional, adjust as needed)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ✅ Export middleware
export default upload;
