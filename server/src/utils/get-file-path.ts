import path from "path";
import config from "../config/config";

export const getFilePath = (filename: string): string =>
  path.join(
    process.cwd(),
    `${config.env === "development" ? "src" : "dist"}`,
    "uploads",
    filename
  );


