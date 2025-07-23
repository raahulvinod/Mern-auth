import { Link, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import axios from "axios";

const Navbar = () => {
  const navigate = useNavigate();

  const { userData, setUserData } = useContext(AppContext);

  const sendVerificationOtp = async () => {
    try {
      const { data } = await axios.post(
        import.meta.env.VITE_SERVER_URL + "/auth/send-verify-otp",
        { withCredentials: true }
      );

      if (data.success) {
        toast.success(data.message);
        navigate("/email-verify");
      }
    } catch (error) {
      console.log("sendVerificationOtp Error", error);
      toast.error(error.message);
    }
  };

  const logoutHandler = async () => {
    try {
      const { data } = await axios.post(
        import.meta.env.VITE_SERVER_URL + "/auth/logout"
      );

      if (data) {
        toast.success(data.message);
        setUserData(null);
      }
    } catch (error) {
      console.log("LogoutHandler Error", error);
      toast.error(error.message);
    }
  };

  return (
    <div className="w-full flex justify-between items-center p-4 sm:p-6 absolute top-0 cursor-pointer">
      <img
        src={assets.logo}
        alt=""
        className="w-28 sm:w-32"
        onClick={() => navigate("/")}
      />
      {userData ? (
        <button className="w-8 h-8 flex justify-center items-center rounded-full bg-black text-white relative group">
          {userData.name[0].toUpperCase()}
          <div className="absolute hidden group-hover:block top-0 right-0 z-10 text-black rounded pt-10">
            <ul className="list-none m-0 p-2 bg-gray-100 text-sm">
              {!userData?.isAccountVerified && (
                <li
                  onClick={sendVerificationOtp}
                  className="py-1 px-2 hover:bg-gray-200 cursor-pointer"
                >
                  Verify email
                </li>
              )}
              <li
                onClick={logoutHandler}
                className="py-1 px-2 pr-10 hover:bg-gray-200 cursor-pointer"
              >
                Logout
              </li>
            </ul>
          </div>
        </button>
      ) : (
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 border border-gray-500 rounded-full px-6 py-2 text-gray-800 hover:bg-gray-100 transition-all"
        >
          Login <img src={assets.arrow_icon} alt="" />
        </button>
      )}
    </div>
  );
};

export default Navbar;
