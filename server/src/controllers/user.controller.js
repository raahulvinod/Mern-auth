import jwt from "jsonwebtoken";

import User from "../models/user.model.js";

/**
 * @desc    Get logged-in user data
 * @route   GET /api/users/me
 * @access  Private
 */
export const getUserData = async (req, res) => {
  const { userId } = req.user;

  try {
    const user = await User.findById(userId).select(
      "-password -resetOtp -resetOtpExpiredAt -verifyOtp -verifyOtpExpiredAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("getUserData Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving user data.",
    });
  }
};

export const isAuthenticated = async (req, res) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token not found.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "-password -verifyOtp -verifyOtpExpiredAt -resetOtp -resetOtpExpiredAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User is authenticated.",
      user,
    });
  } catch (error) {
    console.error("isAuthenticated Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
  }
};
