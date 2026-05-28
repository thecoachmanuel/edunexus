import axios from "axios";
import axiosRetry from "axios-retry";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Automatically retry failed requests (e.g. cold starts, network blips)
axiosRetry(api, {
  retries: 3, // number of retries
  retryDelay: axiosRetry.exponentialDelay, // exponential backoff
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 500 || error.response?.status === 504;
  },
});
