
import { createRemoteJWKSet, jwtVerify } from "jose";

const BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || "http://localhost:3000";

const JWKS = createRemoteJWKSet(
  new URL("/api/auth/jwks", BETTER_AUTH_URL)
);

// Read HTTPOnly Cookie
const getCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
};

// Cookie-only JWT Verification
export const verifyToken = async (req, res, next) => {
  try {
    const token = getCookie(
      req.headers.cookie,
      "better-auth.session_data"
    );

    // Reject unauthorized requests
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    // Verify JWT using BetterAuth JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: BETTER_AUTH_URL,
      audience: "better-auth:session-cache",
    });

    const tokenUser =
      typeof payload.user === "object" && payload.user !== null
        ? payload.user
        : {};

    req.user = {
      id: payload.sub || tokenUser.id,
      email: tokenUser.email || payload.email,
      name: tokenUser.name || payload.name,
    };

    return next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};
