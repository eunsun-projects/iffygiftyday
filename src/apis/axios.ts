import axios, { type AxiosError, type AxiosResponse } from "axios";

const api = axios.create({
  // baseURL: import.meta.env.APP_URL,
  //baseURL: "http://127.0.0.1:8000",
  baseURL: "/",
});

// api.interceptors.request.use((config) => {
//   if (typeof window !== 'undefined') {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.set('Authorization', `Bearer ${token}`);
//     }
//   }
//   return config;
// });

api.interceptors.response.use(
  <T>(response: AxiosResponse<T>): T => response.data,
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export default api;
