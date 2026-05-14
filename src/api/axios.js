import axios from "axios";

const BASE_URL = "http://localhost:8080/api/v1";

export const backendApi = axios.create({
  baseURL: BASE_URL
});

export const backendApiSecure = axios.create({
  baseURL: BASE_URL
});

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

backendApiSecure.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const status = error.response?.status;

    // NO RESPONSE
    // NETWORK ERROR

    if (!error.response) {
      return Promise.reject(error);
    }

    // ACCESS TOKEN EXPIRED

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          return Promise.reject(error);
        }

        // REFRESH TOKEN REQUEST

        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken
        });

        const newAccessToken = res.data.accessToken;

        // SAVE NEW TOKEN

        localStorage.setItem("accessToken", newAccessToken);

        // UPDATE REQUEST HEADER

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // RETRY ORIGINAL REQUEST

        return backendApiSecure(originalRequest);
      } catch (refreshError) {
        const refreshStatus = refreshError.response?.status;

        // ONLY LOGOUT IF
        // REFRESH TOKEN INVALID

        if (refreshStatus === 401 || refreshStatus === 403) {
          localStorage.removeItem("accessToken");

          localStorage.removeItem("refreshToken");

          localStorage.removeItem("userId");

          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
