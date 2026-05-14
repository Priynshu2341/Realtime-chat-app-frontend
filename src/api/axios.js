
import axios from "axios";

export const backendApi = axios.create({
  baseURL:
    "http://localhost:8080/api/v1"
});

export const backendApiSecure =
  axios.create({
    baseURL:
      "http://localhost:8080/api/v1"
  });

// REQUEST INTERCEPTOR

backendApiSecure.interceptors.request.use(

  (config) => {

    const token =
      localStorage.getItem(
        "accessToken"
      );

    if (token) {

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

// RESPONSE INTERCEPTOR

backendApiSecure.interceptors.response.use(

  (response) => response,

  async (error) => {

    const originalRequest =
      error.config;

    // TOKEN EXPIRED

    if (
      error.response?.status === 401
      &&
      !originalRequest._retry
    ) {

      originalRequest._retry = true;

      try {

        const refreshToken =
          localStorage.getItem(
            "refreshToken"
          );

        if (!refreshToken) {

          throw new Error(
            "No refresh token"
          );
        }

        // REFRESH ACCESS TOKEN

        const res =
          await axios.post(

            "http://localhost:8080/api/v1/auth/refresh",

            {
              refreshToken
            }
          );

        const newAccessToken =
          res.data.accessToken;

        // SAVE NEW TOKEN

        localStorage.setItem(
          "accessToken",
          newAccessToken
        );

        // UPDATE FAILED REQUEST

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        // RETRY REQUEST

        return backendApiSecure(
          originalRequest
        );

      } catch (err) {

        console.error(
          "Refresh token failed",
          err
        );

        // FORCE LOGOUT

        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "refreshToken"
        );

        window.location.href =
          "/login";

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

