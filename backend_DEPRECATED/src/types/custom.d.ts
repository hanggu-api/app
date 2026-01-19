import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        full_name: string;
        role: "client" | "provider" | "admin";
        firebase_uid?: string;
      };
      firebaseUser?: any;
    }
  }
}
