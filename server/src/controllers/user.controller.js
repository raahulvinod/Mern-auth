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
