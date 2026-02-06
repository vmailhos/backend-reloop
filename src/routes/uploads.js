const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const s3 = require("../config/s3");

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const bucketName = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;
    if (!bucketName) {
      console.error("Upload error: Missing S3 bucket env var (AWS_S3_BUCKET or S3_BUCKET_NAME)");
      return res.status(500).json({ error: "Upload failed", details: "S3 bucket is not configured" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const file = req.file;
    const safeName = file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "");

    const filename = `posts/${Date.now()}-${safeName}`;

    await s3
      .upload({
        Bucket: bucketName,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

    res.json({
      message: "Image uploaded successfully",
      imageUrl,
    });
    console.log("Uploaded to S3:", imageUrl);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

module.exports = router;
