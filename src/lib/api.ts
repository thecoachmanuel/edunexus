import axios from "axios";
import axiosRetry from "axios-retry";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Retry on network errors and 504 gateway timeouts only.
// We deliberately do NOT retry 500 errors — AI generation failures are not
// transient and retrying would fire multiple expensive AI calls silently.
// We also never retry POST /timetables/generate (costly AI endpoint).
axiosRetry(api, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    const url = error.config?.url || "";
    if (url.includes("timetables/generate")) return false; // never retry AI calls
    const status = error.response?.status;
    return axiosRetry.isNetworkError(error) || status === 504;
  },
});
