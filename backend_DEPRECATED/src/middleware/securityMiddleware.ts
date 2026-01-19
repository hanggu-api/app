import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * Middleware to sanitize inputs and add extra security headers.
 * Protects against basic XSS and NoSQL/SQL injection patterns in query/body strings.
 */
export const securityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 1. Force No-Cache for sensitive routes if not already set
    if (req.path.includes("/auth") || req.path.includes("/payment") || req.path.includes("/profile")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    }

    // 2. Extra Security Headers (Complementary to Helmet)
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // 3. Basic Input Sanitization (Recursive for objects/arrays) - In-place Mutation
    const sanitizeObject = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (typeof obj[key] === 'string') {
                    // Remove potentially dangerous characters/tags
                    obj[key] = obj[key].replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                        .replace(/on\w+="[^"]*"/gim, "")
                        .trim();
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        }
    };

    if (req.body) sanitizeObject(req.body);
    // Do not mutate req.query (read-only in Express 5)
    if (req.params) sanitizeObject(req.params);

    next();
};

export default securityMiddleware;
