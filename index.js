import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { verifyToken } from "./auth.js";

const PORT = 5000;
const app = express();

// Allowed frontend origins
const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean),
);

console.log("Allowed CORS Origins:", Array.from(allowedOrigins));

// CORS Middleware with HTTPOnly Cookie support
app.use((req, res, next) => {
  const origin = req.headers.origin;

  console.log("CORS CHECK:", req.method, origin || "No Origin");

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Content-Type, Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("MONGO_URI is missing. Check your server .env file.");
}

const client = new MongoClient(mongoUri);
const db = client.db("cat-harry");

const studiosCollection = db.collection("studios");
const bookingsCollection = db.collection("bookings");
const reviewsCollection = db.collection("reviews");

// MongoDB Connection
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}

// Start Server
connectToMongoDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server could not start:", error.message);
  });

// Home Route
app.get("/", (req, res) => {
  res.send("Hello, Torikul!");
});

// Test Route
app.get("/test", (req, res) => {
  res.send("Test endpoint is working!");
});

// Protected Test Route
app.get("/protected", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "You are authenticated!",
    user: req.user,
  });
});

// Get Logged-in User's Studios
app.get("/my-studios", verifyToken, async (req, res) => {
  try {
    const userEmail = req.user?.email?.trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).send({
        success: false,
        message: "Authenticated user email is missing.",
      });
    }

    const studios = await studiosCollection
      .find({
        userEmail,
        title: { $type: "string", $regex: /\S/ },
        category: { $type: "string", $regex: /\S/ },
        location: { $type: "string", $regex: /\S/ },
      })
      .sort({ _id: -1 })
      .toArray();

    return res.status(200).send(studios);
  } catch (error) {
    console.error("Failed to get user's studios:", error.message);

    return res.status(500).send({
      success: false,
      message: "Failed to get your studios.",
    });
  }
});

// Get All Valid Studios
app.get("/studios", async (req, res) => {
  try {
    const studios = await studiosCollection
      .find({
        title: { $type: "string", $regex: /\S/ },
        category: { $type: "string", $regex: /\S/ },
        location: { $type: "string", $regex: /\S/ },
      })
      .sort({ _id: -1 })
      .toArray();

    res.send(studios);
  } catch (error) {
    console.error("Failed to get studios:", error.message);
    res.status(500).send({ message: "Failed to get studios" });
  }
});

// Get Latest 6 Featured Studios
app.get("/studios/featured", async (req, res) => {
  try {
    const studios = await studiosCollection
      .find({
        title: { $type: "string", $regex: /\S/ },
        category: { $type: "string", $regex: /\S/ },
        location: { $type: "string", $regex: /\S/ },
      })
      .sort({ _id: -1 })
      .limit(6)
      .toArray();

    res.send(studios);
  } catch (error) {
    console.error("Failed to get featured studios:", error.message);
    res.status(500).send({ message: "Failed to get featured studios" });
  }
});

// Get Single Studio
app.get("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid studio ID" });
    }

    const studio = await studiosCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!studio) {
      return res.status(404).send({ message: "Studio not found" });
    }

    res.send(studio);
  } catch (error) {
    console.error("Failed to get studio:", error.message);
    res.status(500).send({ message: "Failed to get studio" });
  }
});

// Add New Studio - JWT Protected
app.post("/studios", verifyToken, async (req, res) => {
  try {
    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      image,
      amenities,
      overview,
    } = req.body;

    const userName = req.user?.name;
    const userEmail = req.user?.email?.trim().toLowerCase();

    if (typeof userName !== "string" || !userName.trim() || !userEmail) {
      return res.status(401).send({
        success: false,
        message: "Verified user information is missing from the token.",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      !Number.isFinite(Number(hourlyRate)) ||
      Number(hourlyRate) <= 0 ||
      securityDeposit === undefined ||
      !Number.isFinite(Number(securityDeposit)) ||
      Number(securityDeposit) < 0 ||
      !Number.isInteger(Number(maxCapacity)) ||
      Number(maxCapacity) < 1 ||
      typeof image !== "string" ||
      !image.trim() ||
      typeof overview !== "string" ||
      !overview.trim() ||
      !Array.isArray(amenities) ||
      !amenities.every((item) => typeof item === "string")
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide valid studio information.",
      });
    }

    const newStudio = {
      title: title.trim(),
      category: category.trim(),
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit),
      maxCapacity: Number(maxCapacity),
      location: location.trim(),
      image: image.trim(),
      amenities,
      overview: overview.trim(),
      userName: userName.trim(),
      userEmail,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date(),
    };

    const result = await studiosCollection.insertOne(newStudio);

    res.status(201).send({
      success: true,
      message: "Studio added successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to add studio:", error.message);

    res.status(500).send({
      success: false,
      message: "Failed to add studio.",
    });
  }
});

// Update Studio - JWT Protected + Owner Verification
app.put("/studios/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email?.trim().toLowerCase();

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    if (!userEmail) {
      return res.status(401).send({
        success: false,
        message: "Authenticated user email is missing.",
      });
    }

    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      image,
      amenities,
      overview,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      !Number.isFinite(Number(hourlyRate)) ||
      Number(hourlyRate) <= 0 ||
      securityDeposit === undefined ||
      !Number.isFinite(Number(securityDeposit)) ||
      Number(securityDeposit) < 0 ||
      !Number.isInteger(Number(maxCapacity)) ||
      Number(maxCapacity) < 1 ||
      typeof image !== "string" ||
      !image.trim() ||
      typeof overview !== "string" ||
      !overview.trim() ||
      !Array.isArray(amenities) ||
      !amenities.every((item) => typeof item === "string")
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide valid studio information.",
      });
    }

    const updatedStudio = {
      title: title.trim(),
      category: category.trim(),
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit),
      maxCapacity: Number(maxCapacity),
      location: location.trim(),
      image: image.trim(),
      amenities,
      overview: overview.trim(),
      updatedAt: new Date(),
    };

    const result = await studiosCollection.updateOne(
      {
        _id: new ObjectId(id),
        userEmail,
      },
      { $set: updatedStudio },
    );

    if (result.matchedCount === 0) {
      const studioExists = await studiosCollection.findOne(
        { _id: new ObjectId(id) },
        { projection: { _id: 1 } },
      );

      if (!studioExists) {
        return res.status(404).send({
          success: false,
          message: "Studio not found.",
        });
      }

      return res.status(403).send({
        success: false,
        message: "You are not allowed to edit this studio.",
      });
    }

    res.status(200).send({
      success: true,
      message: "Studio updated successfully!",
    });
  } catch (error) {
    console.error("Failed to update studio:", error.message);

    res.status(500).send({
      success: false,
      message: "Failed to update studio.",
    });
  }
});

// Delete Studio - JWT Protected + Owner Verification
app.delete("/studios/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email?.trim().toLowerCase();

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    if (!userEmail) {
      return res.status(401).send({
        success: false,
        message: "Authenticated user email is missing.",
      });
    }

    const result = await studiosCollection.deleteOne({
      _id: new ObjectId(id),
      userEmail,
    });

    if (result.deletedCount === 0) {
      const studioExists = await studiosCollection.findOne(
        { _id: new ObjectId(id) },
        { projection: { _id: 1 } },
      );

      if (!studioExists) {
        return res.status(404).send({
          success: false,
          message: "Studio not found.",
        });
      }

      return res.status(403).send({
        success: false,
        message: "You are not allowed to delete this studio.",
      });
    }

    res.status(200).send({
      success: true,
      message: "Studio deleted successfully!",
    });
  } catch (error) {
    console.error("Failed to delete studio:", error.message);

    res.status(500).send({
      success: false,
      message: "Failed to delete studio.",
    });
  }
});

// Create New Booking - JWT Protected
app.post("/bookings", verifyToken, async (req, res) => {
  try {
    const { studioId, bookingDate, startTime, endTime, totalAmount } = req.body;

    const userName = req.user?.name?.trim();
    const userEmail = req.user?.email?.trim().toLowerCase();

    if (!userName || !userEmail) {
      return res.status(401).send({
        message: "Authenticated user information is missing.",
      });
    }

    if (
      !studioId ||
      !ObjectId.isValid(studioId) ||
      !bookingDate ||
      !startTime ||
      !endTime ||
      totalAmount === undefined ||
      !Number.isFinite(Number(totalAmount)) ||
      Number(totalAmount) <= 0
    ) {
      return res.status(400).send({
        message: "Please provide valid booking information.",
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(bookingDate)) {
      return res.status(400).send({
        message: "Please provide a valid booking date.",
      });
    }

    const [year, month, day] = bookingDate.split("-").map(Number);
    const selectedDate = new Date(Date.UTC(year, month - 1, day));

    if (
      selectedDate.getUTCFullYear() !== year ||
      selectedDate.getUTCMonth() !== month - 1 ||
      selectedDate.getUTCDate() !== day
    ) {
      return res.status(400).send({
        message: "Please provide a valid booking date.",
      });
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      !timePattern.test(startTime) ||
      !timePattern.test(endTime) ||
      startTime >= endTime
    ) {
      return res.status(400).send({
        message: "Please provide a valid booking time.",
      });
    }

    const studio = await studiosCollection.findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).send({
        message: "Studio not found.",
      });
    }

    // Prevent overlapping Confirmed bookings
    const conflictingBooking = await bookingsCollection.findOne({
      studioId,
      bookingDate,
      status: "Confirmed",
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflictingBooking) {
      return res.status(409).send({
        message: "This studio is already booked for the selected time.",
      });
    }

    const newBooking = {
      studioId,
      studioTitle: studio.title,
      studioImage: studio.image || "",
      studioLocation: studio.location || "",
      userName,
      userEmail,
      bookingDate,
      startTime,
      endTime,
      totalAmount: Number(totalAmount),
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(newBooking);

    res.status(201).send({
      message: "Booking created successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to create booking:", error.message);

    res.status(500).send({
      message: "Failed to create booking.",
    });
  }
});

// Get Logged-in User's Bookings - JWT Protected
app.get("/bookings", verifyToken, async (req, res) => {
  try {
    const userEmail = req.user?.email?.trim().toLowerCase();

    if (!userEmail) {
      return res.status(401).send({
        message: "Authenticated user email is missing.",
      });
    }

    const bookings = await bookingsCollection
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    const bookingsWithStudioDetails = await Promise.all(
      bookings.map(async (booking) => {
        let studioImage = booking.studioImage || "";
        let studioLocation = booking.studioLocation || "";

        if (
          (!studioImage || !studioLocation) &&
          ObjectId.isValid(booking.studioId)
        ) {
          const studio = await studiosCollection.findOne(
            { _id: new ObjectId(booking.studioId) },
            { projection: { image: 1, location: 1 } },
          );

          studioImage = studioImage || studio?.image || "";
          studioLocation = studioLocation || studio?.location || "";
        }

        return {
          ...booking,
          studioImage,
          studioLocation,
        };
      }),
    );

    res.status(200).send(bookingsWithStudioDetails);
  } catch (error) {
    console.error("Failed to get bookings:", error.message);

    res.status(500).send({
      message: "Failed to get bookings.",
    });
  }
});

// Cancel Own Pending Booking - JWT Protected
app.patch("/bookings/:id/cancel", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email?.trim().toLowerCase();

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid booking ID.",
      });
    }

    if (!userEmail) {
      return res.status(401).send({
        message: "Authenticated user email is missing.",
      });
    }

    const result = await bookingsCollection.updateOne(
      {
        _id: new ObjectId(id),
        userEmail,
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message:
          "Pending booking not found or you are not allowed to cancel it.",
      });
    }

    res.status(200).send({
      message: "Booking cancelled successfully!",
    });
  } catch (error) {
    console.error("Failed to cancel booking:", error.message);

    res.status(500).send({
      message: "Failed to cancel booking.",
    });
  }
});

// Add or Update Studio Rating & Review - JWT Protected
app.post("/studios/:id/reviews", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // User information comes from the verified JWT, not request body
    const userName = req.user?.name?.trim();
    const userEmail = req.user?.email?.trim().toLowerCase();

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid studio ID.",
      });
    }

    if (!userName || !userEmail) {
      return res.status(401).send({
        message: "Authenticated user information is missing.",
      });
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      (comment !== undefined && typeof comment !== "string") ||
      (typeof comment === "string" && comment.length > 1000)
    ) {
      return res.status(400).send({
        message: "Please provide a valid rating (1-5) and comment.",
      });
    }

    const studio = await studiosCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!studio) {
      return res.status(404).send({
        message: "Studio not found.",
      });
    }

    const reviewData = {
      studioId: id,
      userName,
      userEmail,
      rating,
      comment: comment?.trim() || "",
      updatedAt: new Date(),
    };

    await reviewsCollection.updateOne(
      { studioId: id, userEmail },
      {
        $set: reviewData,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );

    const ratingSummary = await reviewsCollection
      .aggregate([
        { $match: { studioId: id } },
        {
          $group: {
            _id: "$studioId",
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const summary = ratingSummary[0];

    if (!summary) {
      return res.status(500).send({
        message: "Failed to calculate studio rating.",
      });
    }

    const averageRating = Number(summary.averageRating.toFixed(1));
    const totalReviews = summary.totalReviews;

    await studiosCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          rating: averageRating,
          ratingCount: totalReviews,
        },
      },
    );

    return res.status(200).send({
      success: true,
      message: "Review submitted successfully!",
      rating: averageRating,
      ratingCount: totalReviews,
    });
  } catch (error) {
    console.error("Failed to submit review:", error.message);

    return res.status(500).send({
      message: "Failed to submit review.",
    });
  }
});

// Get Reviews of a Studio
app.get("/studios/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid studio ID" });
    }

    const reviews = await reviewsCollection
      .find({ studioId: id })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(reviews);
  } catch (error) {
    console.error("Failed to get reviews:", error.message);

    res.status(500).send({
      message: "Failed to get reviews",
    });
  }
});
