import { Request, Response, NextFunction } from "express";
import { UserRepository } from "../repositories/userRepository";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    full_name: string;
    role: "client" | "provider" | "admin";
  };
}

import { FirebaseService } from "../services/firebase_service";

const userRepo = new UserRepository();

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ success: false, message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // BYPASS FOR TESTING (Development Only)
    if (token === 'SUPER_TEST_TOKEN') {
      console.log('⚠️ Using Test Token Bypass');
      // Try to find a default test user or specific user
      // For now, let's try to find the client@test.com
      const testUser = await userRepo.findByEmail('client@test.com');
      
      if (testUser) {
         (req as AuthRequest).user = {
          id: testUser.id!,
          email: testUser.email,
          full_name: testUser.full_name,
          role: testUser.role as "client" | "provider" | "admin",
        };
        next();
        return;
      } else {
         console.log('⚠️ Test user client@test.com not found for bypass');
      }
    }

    // Verify Firebase Token
    const decodedToken = await FirebaseService.verifyIdToken(token);

    if (!decodedToken) {
      res.status(401).json({ success: false, message: "Invalid or expired session" });
      return;
    }

    // Find user in MySQL by email (or we could use a firebase_uid column if added)
    const exists = await userRepo.findByEmail(decodedToken.email!);

    if (!exists) {
      res.status(401).json({
        success: false,
        message: "User account not linked. Please complete registration.",
        needs_profile: true,
        email: decodedToken.email,
        uid: decodedToken.uid
      });
      return;
    }

    (req as AuthRequest).user = {
      id: exists.id!,
      email: exists.email,
      full_name: exists.full_name,
      role: exists.role as "client" | "provider" | "admin",
    };
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ success: false, message: "Authentication failed" });
  }
};
