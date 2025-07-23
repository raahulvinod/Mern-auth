import axios from "axios";
import { useEffect } from "react";
import { useState } from "react";
import { createContext } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

const serverUrl = import.meta.env.VITE_SERVER_URL;

export const AppContextProvider = ({ children }) => {
  const [isLoggedin, setIsLoggedin] = useState(false);
  const [userData, setUserData] = useState("");

  const getAuthStatus = async (req, res) => {
    try {
      const { data } = await axios.get(
        import.meta.env.VITE_SERVER_URL + "/user/check",
        {
          withCredentials: true,
        }
      );

      if (data.success) {
        setUserData(data.user);
        setIsLoggedin(true);
      } else {
        setUserData(null);
      }
      return data;
    } catch (error) {
      console.error("getAuthStats Error", error.message);
      toast.error("Something went wrong. Please try again.");
      setUserData(null);
      setIsLoggedin(false);
    }
  };

  useEffect(() => {
    getAuthStatus();
  }, []);

  const value = {
    userData,
    isLoggedin,
    serverUrl,
    setIsLoggedin,
    setUserData,
    getAuthStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
