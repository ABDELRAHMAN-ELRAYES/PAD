import express, { RequestHandler } from "express";
import cookieParser from "cookie-parser";
import config from "../config/config";
import cors from "cors";
import rateLimit from "express-rate-limit";

// middlewares for parsing the request body
export const bodyParser: RequestHandler = express.json();
// Middleware for parsing cookies from browser
export const cookieParserMiddleware: RequestHandler = cookieParser();

// To Parse the Form Data Request
export const formParser: RequestHandler = express.urlencoded({ extended: true });

// Middleware to verify cross origin requests
export const corsMiddleware = cors({
  origin: config.webUrl,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Limit the requests from the same tab to 100 at 15 minutes
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 429,
    message: "لقد تجاوزت الحد المسموح من الطلبات، حاول لاحقًا.",
  },
});
