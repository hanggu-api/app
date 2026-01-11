import { Request, Response } from "express";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { FieldPacket, RowDataPacket } from "mysql2";
import { v4 as uuidv4 } from "uuid";
import pool from "../database/db";
import { AuthRequest } from "../middleware/authMiddleware";
import { notificationManager, TEMPLATES } from "../notifications/manager";
import { io } from "../platform";
import { ServiceRepository } from "../repositories/serviceRepository";
import { UserRepository } from "../repositories/userRepository";
import { providerDispatcher } from "../services/providerDispatcher";
import logger from "../utils/logger";

// Initialize Mercado Pago Client
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || "",
});

const payment = new Payment(client);

export class PaymentController {
  static async process(req: Request, res: Response) {
    console.log(
      "----------------------------------------------------------------",
    );
    console.log(
      "💰 [BACKEND] Payment Request Received:",
      new Date().toISOString(),
    );
    console.log("📥 [BACKEND] Body:", JSON.stringify(req.body, null, 2));

    try {
      const {
        transaction_amount,
        token,
        description,
        installments,
        payment_method_id,
        payer,
        service_id,
        payment_type,
      } = req.body;

      console.log("🔍 [BACKEND] Validating payment fields...");
      // Basic validation
      if (!transaction_amount || !payment_method_id || !payer?.email) {
        console.error(
          "❌ [BACKEND] Validation Failed: Missing required fields",
        );
        res
          .status(400)
          .json({ success: false, message: "Missing required payment fields" });
        return;
      }

      // Enforce service_id for consistency
      if (!service_id) {
        console.error("❌ [BACKEND] Validation Failed: Missing service_id");
        res.status(400).json({
          success: false,
          message: "service_id is required to link payment to a mission",
        });
        return;
      }

      // 🔒 [SECURITY] Validate Service and Enforce Price
      const serviceRepo = new ServiceRepository();
      const service = await serviceRepo.findById(service_id);

      if (!service) {
        console.error("❌ [BACKEND] Service not found:", service_id);
        res.status(404).json({ success: false, message: "Service not found" });
        return;
      }

      // Determine the correct amount to charge
      let realAmount = 0;

      if (payment_type === 'remaining') {
        // Calculate remaining amount: Total - Upfront
        // Assuming price_estimated is the total agreed price
        realAmount = Number(service.price_estimated) - Number(service.price_upfront);

        // Safety check
        if (realAmount < 0) realAmount = 0;

        console.log(`Checking Remaining Payment: Total(${service.price_estimated}) - Upfront(${service.price_upfront}) = ${realAmount}`);
      } else {
        // Default: Charge Upfront (Deposit) or Full Price if no upfront
        realAmount =
          Number(service.price_upfront) > 0
            ? Number(service.price_upfront)
            : Number(service.price_estimated);
      }

      if (realAmount <= 0) {
        console.error("❌ [BACKEND] Invalid service price:", realAmount);
        res
          .status(400)
          .json({ success: false, message: "Service has invalid price or remaining amount is zero" });
        return;
      }

      // Check if client tried to manipulate price (allow small epsilon for float diffs)
      if (Math.abs(Number(transaction_amount) - realAmount) > 0.05) {
        console.warn(
          `⚠️ [SECURITY] Price manipulation attempt detected! Client sent: ${transaction_amount}, Real: ${realAmount}`,
        );
        // We overwrite the amount with the real one to prevent fraud
      }

      console.log(`🔒 [SECURITY] Enforcing server-side price: ${realAmount}`);

      // Create Payment Request Body
      const notificationUrl =
        process.env.NOTIFICATION_URL ||
        "https://cardapyia.com/api/payment/webhook";
      console.log("🔗 [BACKEND] Notification URL:", notificationUrl);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentBody: any = {
        transaction_amount: realAmount, // <--- FORCED SERVER SIDE PRICE
        description: description || `Payment for Service ${service.profession}`,
        payment_method_id: payment_method_id,
        notification_url: notificationUrl,
        payer: {
          email: payer.email,
          first_name: payer.first_name || "Client",
          last_name: payer.last_name || "",
          identification: payer.identification, // { type, number }
        },
        metadata: {
          service_id: service_id || null,
          user_id: (req as AuthRequest).user?.id,
        },
        external_reference: service_id
          ? `SERVICE-${service_id}`
          : `REF-${uuidv4()}`,
      };

      // If Credit Card, add token and installments
      if (payment_method_id !== "pix") {
        if (!token) {
          console.error("❌ [BACKEND] Token missing for card payment");
          res
            .status(400)
            .json({
              success: false,
              message: "Token is required for card payments",
            });
          return;
        }
        console.log("💳 [BACKEND] Processing Card Payment with Token:", token);
        paymentBody.token = token;
        paymentBody.installments = Number(installments || 1);
      } else {
        console.log("💠 [BACKEND] Processing Pix Payment");
      }

      console.log(
        "🛠️ [BACKEND] Payment Body Prepared:",
        JSON.stringify(paymentBody, null, 2),
      );
      console.log("🚀 [BACKEND] Sending request to Mercado Pago...");

      let result;

      // ---------------------------------------------------------
      // 🧪 FAKE PIX IMPLEMENTATION
      // ---------------------------------------------------------
      const enableFakePix = process.env.ENABLE_FAKE_PIX === 'true';

      if (payment_method_id === "pix" && enableFakePix) {
        console.log("🧪 [DEMO] Generating FAKE PIX...");

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const fakeId = Math.floor(Math.random() * 1000000000);
        result = {
          id: fakeId,
          status: "pending",
          status_detail: "pending_waiting_transfer",
          date_created: new Date().toISOString(),
          date_approved: null,
          payment_method_id: "pix",
          currency_id: "BRL",
          transaction_amount: realAmount,
          point_of_interaction: {
            transaction_data: {
              qr_code: "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-4266141740005204000053039865802BR5913FAKE PIX6008Brasilia62070503***6304E2CA",
              // Base64 de um pixel preto válido para evitar crash no frontend
              qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
              ticket_url: "https://www.mercadopago.com.br/sandbox/payments/123456789/ticket",
            },
          },
          card: {},
        };

        console.log("🧪 [DEV] Fake Pix Created:", result.id);
      } else {
        // ---------------------------------------------------------
        // 🌍 REAL MERCADO PAGO REQUEST
        // ---------------------------------------------------------
        try {
          result = await payment.create({ body: paymentBody });
          console.log(
            "✅ [BACKEND] Mercado Pago Payment Created:",
            result.id,
            result.status,
          );
          console.log(
            "📄 [BACKEND] Full MP Response:",
            JSON.stringify(result, null, 2),
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (mpError: any) {
          console.error(
            "❌ [BACKEND] Mercado Pago API Error:",
            JSON.stringify(mpError, null, 2),
          );
          res.status(502).json({
            success: false,
            error: {
              code: "MP_ERROR",
              message: "Payment rejected by payment gateway",
              details: mpError.cause || mpError.message,
            },
          });
          return;
        }
      }

      // Save to database
      const userId = (req as AuthRequest).user?.id || 0;
      console.log("💾 [BACKEND] Saving to Database for User ID:", userId);

      // Extract additional details
      const statusDetail = result.status_detail;
      const cardLastFour =
        result.card?.last_four_digits ||
          result.point_of_interaction?.transaction_data?.ticket_url
          ? "PIX"
          : null; // Simple fallback

      if (service_id) {
        try {
          await pool.query(
            `INSERT INTO payments 
                        (mission_id, user_id, amount, status, status_detail, mp_payment_id, payment_method_id, installments, card_last_four, payer_email, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              service_id,
              userId,
              transaction_amount,
              result.status,
              statusDetail,
              result.id,
              payment_method_id,
              installments || 1,
              cardLastFour,
              payer.email,
            ],
          );
          console.log("✅ [BACKEND] Saved to DB successfully");

          // SIMULATION: Auto-approve Pix after 5 seconds
          // const enableFakePix = await FirebaseService.getConfig("ENABLE_FAKE_PIX", false);
          // const isFakePix = cardLastFour === "PIX" && (process.env.NODE_ENV !== "production" || enableFakePix);

          // ONLY AUTO APPROVE IF FAKE PIX IS ENABLED
          const enableFakePix = process.env.ENABLE_FAKE_PIX === 'true';
          if ((cardLastFour === "PIX" || payment_method_id === "pix") && enableFakePix) {
            console.log("🧪 [DEMO] Scheduling Mock Pix Approval for", result.id);
            setTimeout(async () => {
              try {
                console.log("🧪 [DEMO] Auto-approving Pix", result.id);
                // Manually trigger the "approved" logic (Simulating Webhook)
                const serviceRepo = new ServiceRepository();
                const providerDispatcher = (await import("../services/providerDispatcher")).providerDispatcher;

                // Update Payment Status
                await pool.query(
                  "UPDATE payments SET status = ?, status_detail = ? WHERE mp_payment_id = ?",
                  ["approved", "accredited", result.id],
                );

                // Activate Service
                console.log(
                  `🚀 [BACKEND] Activating service ${service_id} due to Mock Pix Approval`,
                );
                await serviceRepo.updateStatus(service_id, "pending");

                // Notify Client via Socket
                const room = `user:${userId}`;
                const io = (await import("../platform")).io;
                io.to(room).emit("payment_update", {
                  paymentId: result.id,
                  status: "approved",
                  serviceId: service_id
                });

                const service = await serviceRepo.findById(service_id);
                if (service) {
                  console.log(
                    `📢 [BACKEND] Starting Dispatch for service ${service_id}`,
                  );
                  providerDispatcher.startDispatch(service_id);
                }
              } catch (e) {
                console.error("🧪 [DEMO] Auto-approve failed", e);
              }
            }, 3000); // 3 seconds delay for DEMO
          }

          // Emit socket event if approved (Immediate feedback for local dev/realtime)
          if (result.status === "approved") {
            console.log(
              `🚀 [BACKEND] Immediate activation for service ${service_id}`,
            );
            const serviceRepo = new ServiceRepository();
            // Ensure status is pending (visible)
            await serviceRepo.updateStatus(service_id, "pending");

            const service = await serviceRepo.findById(service_id);
            if (service) {
              console.log(
                `📢 [BACKEND] Starting Dispatch for service ${service_id}`,
              );
              providerDispatcher.startDispatch(service_id);
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (dbError: any) {
          console.error("❌ [BACKEND] Error saving payment to DB:", dbError);
          // Return success for payment but warn about DB failure
          res.status(200).json({
            success: true,
            payment: {
              id: result.id,
              status: result.status,
              status_detail: result.status_detail,
              qr_code: result.point_of_interaction?.transaction_data?.qr_code,
              qr_code_base64:
                result.point_of_interaction?.transaction_data?.qr_code_base64,
              ticket_url:
                result.point_of_interaction?.transaction_data?.ticket_url,
            },
            warning: "Payment processed but failed to save record locally",
            error: {
              code: "DB_ERROR",
              message: "Failed to save payment record",
              details: dbError.message,
            },
          });
          return;
        }
      } else {
        console.log(
          "ℹ️ [BACKEND] No service_id provided, skipping DB save (or handle generic payment)",
        );
      }

      console.log("📤 [BACKEND] Sending Response to Client");
      res.status(201).json({
        success: true,
        payment: {
          id: result.id,
          status: result.status,
          status_detail: result.status_detail,
          transaction_amount: result.transaction_amount,
          qr_code: result.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64:
            result.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("❌ [BACKEND] General Error processing payment:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Internal server error",
          details: error.cause || error,
        },
      });
    }
  }

  static async webhook(req: Request, res: Response) {
    console.log(
      "----------------------------------------------------------------",
    );
    console.log(
      "🔔 [BACKEND] Webhook Request Received:",
      new Date().toISOString(),
    );
    console.log(
      "📥 [BACKEND] Webhook Body:",
      JSON.stringify(req.body, null, 2),
    );
    console.log(
      "📥 [BACKEND] Webhook Query:",
      JSON.stringify(req.query, null, 2),
    );

    try {
      // Support for Webhook (JSON body)
      let type = req.body?.type;
      let id = req.body?.data?.id;

      // Support for IPN (Query Params)
      if (!type && req.query.topic) {
        type = req.query.topic;
        id = req.query.id;
      }

      // Handle only payment notifications
      if (type === "payment" && id) {
        console.log("💸 [BACKEND] Notification is for Payment ID:", id);

        // Fetch latest status from Mercado Pago
        console.log(
          "🚀 [BACKEND] Fetching payment status from Mercado Pago...",
        );
        const paymentInfo = await payment.get({ id: String(id) });
        console.log(
          "📄 [BACKEND] Payment Info from MP:",
          JSON.stringify(paymentInfo, null, 2),
        );

        if (paymentInfo) {
          const status = paymentInfo.status;
          const mpPaymentId = paymentInfo.id;

          // Update database
          console.log(
            `🔄 [BACKEND] Updating DB for payment ${mpPaymentId} to status: ${status}`,
          );
          await pool.query(
            `UPDATE payments SET status = ?, updated_at = NOW() WHERE mp_payment_id = ?`,
            [status, mpPaymentId],
          );

          console.log(
            `✅ [BACKEND] Payment ${mpPaymentId} updated successfully.`,
          );

          // If approved, activate service
          if (status === "approved") {
            // Get service_id from payment
            const [rows] = (await pool.query(
              "SELECT mission_id FROM payments WHERE mp_payment_id = ?",
              [mpPaymentId],
            )) as [RowDataPacket[], FieldPacket[]];
            if (rows.length > 0 && rows[0].mission_id) {
              const serviceId = rows[0].mission_id;

              const serviceRepo = new ServiceRepository();
              const service = await serviceRepo.findById(serviceId);

              // 🔒 [SECURITY] Double check amount before activating
              if (service) {
                const realAmount =
                  Number(service.price_upfront) > 0
                    ? Number(service.price_upfront)
                    : Number(service.price_estimated);
                const paidAmount = Number(paymentInfo.transaction_amount);

                if (Math.abs(paidAmount - realAmount) > 0.05) {
                  console.error(
                    `🚨 [FRAUD PREVENTED] Payment ${mpPaymentId} amount (${paidAmount}) does not match service price (${realAmount}). Service ${serviceId} will NOT be activated.`,
                  );
                  // Optionally mark payment as 'suspicious' in DB
                  return;
                }

                console.log(
                  `🚀 [BACKEND] Activating service ${serviceId} due to approved payment`,
                );
                await serviceRepo.updateStatus(serviceId, "pending");

                // Emit status update to everyone watching this service
                io.to(`service:${serviceId}`).emit("service.status", { id: serviceId, status: "pending" });

                // Fetch full details for notification
                // const service = await serviceRepo.findById(serviceId); // Already fetched above
                console.log(
                  `📢 [BACKEND] Starting Dispatch for service ${serviceId}`,
                );
                providerDispatcher.startDispatch(serviceId);
                logger.service("service.activated", {
                  id: serviceId,
                  payment_id: mpPaymentId,
                });

                // Notify Client: Payment Approved
                (async () => {
                  const tmpl = TEMPLATES.PAYMENT_APPROVED();
                  await notificationManager.send(
                    Number(service.client_id),
                    "payment_approved",
                    String(service.id),
                    tmpl.title,
                    tmpl.body,
                    { service_id: service.id },
                  );
                })().catch((err) =>
                  console.error("Error notifying payment approved:", err),
                );

                // Notify Nearby Providers: New Service Available
                (async () => {
                  try {
                    // 1. Find profession ID
                    const userRepo = new UserRepository(); // Import needed at top or use inline
                    const prof = await userRepo.findProfessionByName(
                      service.profession,
                    );

                    if (prof) {
                      const tmpl = TEMPLATES.NEW_SERVICE(service.profession);

                      // Find nearby providers using ServiceRepository (GeoSpatial Search)
                      // service.category_id is available from the service object
                      const nearbyProviderIds = await serviceRepo.findProvidersByDistance(
                        Number(service.latitude),
                        Number(service.longitude),
                        service.category_id,
                        prof.id
                      );

                      if (nearbyProviderIds.length > 0) {
                        console.log(
                          `[Notification] Found ${nearbyProviderIds.length} NEARBY providers for ${service.profession}`,
                        );

                        for (const providerId of nearbyProviderIds) {
                          // Avoid notifying the client if they are also a provider (unlikely but possible)
                          if (providerId !== service.client_id) {
                            notificationManager
                              .send(
                                providerId,
                                "new_service",
                                String(service.id),
                                tmpl.title,
                                tmpl.body,
                                { service_id: service.id },
                              )
                              .catch((e) =>
                                console.error(
                                  `Failed to notify provider ${providerId}`,
                                  e,
                                ),
                              );
                          }
                        }
                      } else {
                        console.log(`[Notification] No nearby providers found for ${service.profession}.`);
                      }
                    }
                  } catch (err) {
                    console.error("Error notifying providers:", err);
                  }
                })();
              }
            }
          }
        }
      } else {
        console.log(
          "ℹ️ [BACKEND] Notification ignored (not a payment notification or missing ID). Type:",
          type,
          "ID:",
          id,
        );
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("❌ [BACKEND] Webhook Error:", error);
      // Always return 200 to avoid MP retries if it's an internal logic error
      res.sendStatus(200);
    }
  }
}
