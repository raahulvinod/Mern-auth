import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import transporter from "../config/nodemailer.js";

/**
 * @desc Register a new user
 * @route POST /api/auth/register
 * @access Public
 */

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide name, email, and password.",
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // welcome email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to Our RAD Tech",
      text: `Welcome to Rad-tech. Your account had been created with email id: ${email}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

/**
 * @desc Login existing user
 * @route POST /api/auth/login
 * @access Public
 */

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide email, and password.",
    });
  }
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invaid email" });
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return res
        .status(400)
        .json({ success: false, message: "Invaid password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "User logged in successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAccountVerified: user.isAccountVerified,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

/**
 * @desc Logout user by clearing the auth token cookie
 * @route POST /api/auth/logout
 * @access Public (or Protected based on implementation)
 */

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

/**
 * @desc Send OTP to user for account verification
 * @route POST /api/auth/send-verify-otp
 * @access Private
 */

export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const user = await User.findById(userId).select(
      "-password -verifyOtp -verifyOtpExpiredAt -resetOtp -resetOtpExpiredAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.isAccountVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Account is already verified" });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Save OTP and expiry (24 hours)
    user.verifyOtp = otp;
    user.verifyOtpExpiredAt = Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Verify Your Account - OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Verify Your Account</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your OTP is:</p>
          <h3>${otp}</h3>
          <p>This OTP is valid for 24 hours.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Verification OTP sent to email.",
    });
  } catch (error) {
    console.error("sendVerifyOtp Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

/**
 * @desc    Verify user's email with OTP
 * @route   POST /api/auth/verify-email
 * @access  Private
 */

export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const { userId } = req.user;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: !userId ? "User ID is required." : "OTP is required.",
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      !user.verifyOtp ||
      user.verifyOtp !== otp ||
      user.verifyOtpExpiredAt < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message:
          user.verifyOtpExpiredAt < Date.now()
            ? "OTP has expired. Please request a new one."
            : "Invalid OTP.",
      });
    }

    // Mark account as verified and clear OTP data
    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpiredAt = 0;

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully.", user });
  } catch (error) {
    console.error("verifyEmail Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

/**
 * @desc    Send password reset OTP to user's email
 * @route   POST /api/auth/send-reset-otp
 * @access  Public
 */

export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Save OTP and expiry (24 hours)
    user.resetOtp = otp;
    user.resetOtpExpiredAt = Date.now() + 15 * 60 * 1000;

    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset - OTP",
      html: `
    <div style="max-width: 600px; margin: auto; padding: 20px; font-family: 'Segoe UI', sans-serif; background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center;">
        <h2 style="color: #333;">🔐 Password Reset Request</h2>
        <p style="font-size: 16px; color: #555;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 16px; color: #555;">We received a request to reset your password.</p>
      </div>

      <div style="margin: 30px 0; text-align: center;">
        <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Use the OTP below to reset your password:</p>
        <h1 style="font-size: 36px; color: #007BFF; letter-spacing: 6px;">${otp}</h1>
        <p style="font-size: 14px; color: #999; margin-top: 10px;">This OTP is valid for <strong>15 Minutes</strong>.</p>
      </div>

      <div style="font-size: 14px; color: #888; text-align: center; margin-top: 40px;">
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>Thank you,<br><strong>RAD Tech</strong></p>
      </div>
    </div>
  `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      success: true,
      message: "Reset OTP send to your email.",
    });
  } catch (error) {
    console.error("sendResetOtp Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

/**
 * @desc    Reset user password using OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.json({
      success: false,
      message: "Email, OTP and New password are required.",
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isOtpExpired =
      user.resetOtpExpiredAt && user.resetOtpExpiredAt < Date.now();
    const isOtpValid = user.resetOtp && user.resetOtp === otp;

    if (!isOtpValid || isOtpExpired) {
      return res.status(400).json({
        success: false,
        message: isOtpExpired
          ? "OTP has expired. Please request a new one."
          : "Invalid OTP. Please check and try again.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.resetOtp = "";
    user.resetOtpExpiredAt = 0;
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    console.error("resetPassword Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
