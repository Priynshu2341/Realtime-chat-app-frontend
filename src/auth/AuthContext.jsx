import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("accessToken")
  );

  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem("refreshToken")
  );

  const [loggedInUserId,setLoggedInUserId] = useState(() => 
    localStorage.getItem("userId"));

  const login = (access, refresh, userId) => {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    localStorage.setItem("userId",userId)

    setAccessToken(access);
    setRefreshToken(refresh);
    setLoggedInUserId(userId);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    setAccessToken(null);
    setRefreshToken(null);
    setLoggedInUserId(null);

    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        loggedInUserId,
        refreshToken,
        login,
        logout
        
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}