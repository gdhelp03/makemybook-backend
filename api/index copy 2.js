require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

const { connectDB } = require("../config/db");
const productRoutes = require("../routes/productRoutes");
const customerRoutes = require("../routes/customerRoutes");
const adminRoutes = require("../routes/adminRoutes");
const orderRoutes = require("../routes/orderRoutes");
const customerOrderRoutes = require("../routes/customerOrderRoutes");
const categoryRoutes = require("../routes/categoryRoutes");
const couponRoutes = require("../routes/couponRoutes");
const attributeRoutes = require("../routes/attributeRoutes");
const settingRoutes = require("../routes/settingRoutes");
const currencyRoutes = require("../routes/currencyRoutes");
const languageRoutes = require("../routes/languageRoutes");
const notificationRoutes = require("../routes/notificationRoutes");
const { isAuth, isAdmin } = require("../config/auth");
const galleryRoutes = require("../routes/galleryRoutes");
const gallerySharingRoutes = require("../routes/gallerySharingRoutes");
const galleryStreamRoutes = require("../routes/galleryStreamRoutes");

connectDB();

const app = express();
app.set("trust proxy", 1);

// security & parsing
app.use(express.json({ limit: "4mb" }));
app.use(helmet());
app.options("*", cors());
app.use(cors());

// root + health
app.get("/", (req, res) => {
  res.type("text/plain").send("App works properly!");
});

app.get("/health", (req, res) => {
  res.type("text/plain").send("OK");
});

// API routes
app.use("/api/products/", productRoutes);
app.use("/api/category/", categoryRoutes);
app.use("/api/coupon/", couponRoutes);
app.use("/api/customer/", customerRoutes);
app.use("/api/order/", isAuth, customerOrderRoutes);
app.use("/api/attributes/", attributeRoutes);
app.use("/api/setting/", settingRoutes);
app.use("/api/currency/", isAuth, currencyRoutes);
app.use("/api/language/", languageRoutes);
app.use("/api/notification/", isAuth, notificationRoutes);

app.use("/api/cloudinary/", isAuth, galleryRoutes);
app.use("/api/gshare/", isAuth, gallerySharingRoutes);
app.use("/api/stream/", galleryStreamRoutes);
app.use("/api/gallery/", isAuth, galleryRoutes);

// Admin / orders
app.use("/api/admin/", adminRoutes);
app.use("/api/orders/", isAuth, orderRoutes);
// app.use("/api/orders/", orderRoutes);

// Static assets (optional)
app.use("/static", express.static("public"));

// Optional SPA serving (only if build exists)
const buildDir = path.join(__dirname, "build");
const buildIndex = path.join(buildDir, "index.html");

if (fs.existsSync(buildIndex)) {
  app.use(express.static(buildDir));
  // Serve SPA for non-API routes only
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(buildIndex);
  });
} else {
  // No build present: return 404 JSON for unknown routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "Not found" });
    }
    return res
      .status(404)
      .type("text/plain")
      .send("Not found (no frontend build present)");
  });
}

// Error handler (keep last)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Server error" });
});

// Port (default to 5055 for Nginx)
const PORT = process.env.PORT || 5055;
app.listen(PORT, () => console.log(`server running on port ${PORT}`));
