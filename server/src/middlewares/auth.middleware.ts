import { Request, Response, NextFunction } from "express";

export class AuthMiddleware {
  static protect(_req: Request, _res: Response, next: NextFunction) {
    next();
  }

  static authenticate(_req: Request, _res: Response, next: NextFunction) {
    next();
  }
}
