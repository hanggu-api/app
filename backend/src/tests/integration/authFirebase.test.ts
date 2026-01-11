import request from "supertest";
import app from "../../app";
import prisma from "../../database/prismaClient";

// Mock Firebase Admin
// Must be mocked before importing the module that uses it
jest.mock("../../config/firebase", () => ({
  firebaseAuth: {
    verifyIdToken: jest.fn(),
  },
  default: {
    auth: () => ({
      verifyIdToken: jest.fn(),
    }),
  },
}));

import { firebaseAuth } from "../../config/firebase";
import admin from "firebase-admin";
import { redis } from "../../platform";

describe("Firebase Auth Integration", () => {
  const testEmail = "integration-test@example.com";
  const testUid = "firebase-integration-test-uid";

  beforeAll(async () => {
    // Clean up before starting
    await prisma.users.deleteMany({
      where: {
        email: testEmail,
      },
    });
  });

  afterAll(async () => {
    // Cleanup after tests
    await prisma.users.deleteMany({
      where: {
        email: testEmail,
      },
    });
    await prisma.$disconnect();

    // Close Firebase apps to release the process
    if (admin.apps.length) {
      await Promise.all(admin.apps.map((app) => app?.delete()));
      console.log("[Test] Firebase Admin connections closed");
    }

    // Close Redis connection
    if (redis) {
      if (typeof redis.quit === "function") {
        await redis.quit();
        console.log("[Test] Redis disconnected (quit)");
      } else if (typeof redis.disconnect === "function") {
        redis.disconnect();
        console.log("[Test] Redis disconnected (disconnect)");
      }
    }

    console.log("[Test] Prisma Database disconnected");
  });

  it("should create a new user when logging in with a new Firebase user", async () => {
    // Setup Mock
    (firebaseAuth.verifyIdToken as jest.Mock).mockResolvedValue({
      uid: testUid,
      email: testEmail,
      name: "Integration Test User",
      picture: "http://example.com/avatar.jpg",
    });

    const response = await request(app).post("/auth/firebase/login").send({
      token: "fake-valid-token",
      role: "client",
    });

    // Check HTTP response
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(testEmail);
    expect(response.body.user.firebase_uid).toBe(testUid);
    expect(response.body.user.name).toBe("Integration Test User");

    // Check Database
    const user = await prisma.users.findUnique({
      where: { email: testEmail },
    });
    expect(user).toBeDefined();
    expect(user?.firebase_uid).toBe(testUid);
    expect(user?.full_name).toBe("Integration Test User");
    expect(user?.role).toBe("client");
  });

  it("should login an existing user and update firebase_uid if missing", async () => {
    // 1. Create a user without firebase_uid
    await prisma.users.deleteMany({ where: { email: testEmail } });
    await prisma.users.create({
      data: {
        email: testEmail,
        full_name: "Existing User",
        password_hash: "legacy_hash",
        role: "client",
        firebase_uid: null, // Simulate legacy user
      },
    });

    // 2. Mock Firebase login
    (firebaseAuth.verifyIdToken as jest.Mock).mockResolvedValue({
      uid: testUid,
      email: testEmail,
      name: "Existing User Updated", // Name from Firebase
      picture: "http://example.com/avatar.jpg",
    });

    // 3. Call Login
    const response = await request(app).post("/auth/firebase/login").send({
      token: "fake-valid-token-2",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // 4. Verify DB Update
    const user = await prisma.users.findUnique({
      where: { email: testEmail },
    });
    expect(user?.firebase_uid).toBe(testUid);
  });
});
