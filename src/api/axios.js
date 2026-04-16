import axios from "axios";

export const backendApi = axios.create({
    baseURL: "http://localhost:8080/api/v1"
});

export const backendApiSecure = axios.create({
  baseURL: "http://localhost:8080/api/v1" 
});

// REQUEST INTERCEPTOR
backendApiSecure.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR (THIS FIXES YOUR ISSUE)
backendApiSecure.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // if 401 and not retried already
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        // CALL REFRESH API
        const res = await axios.post(
          "http://localhost:8080/api/auth/refresh",
          {
            refreshToken: refreshToken,
          }
        );

        const newAccessToken = res.data.accessToken;

        // SAVE NEW TOKEN
        localStorage.setItem("accessToken", newAccessToken);

        // UPDATE HEADER
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // RETRY ORIGINAL REQUEST
        return backendApiSecure(originalRequest);
      } catch (err) {
        // REFRESH FAILED → FORCE LOGOUT
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        window.location.href = "/login";

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);