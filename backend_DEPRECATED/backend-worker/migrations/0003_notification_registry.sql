-- CreateTable
CREATE TABLE "notification_registry" (
    "user_id" BIGINT NOT NULL PRIMARY KEY,
    "fcm_token" TEXT NOT NULL,
    "professions" TEXT,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_registry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateIndex
CREATE INDEX "notification_registry_is_online_idx" ON "notification_registry"("is_online");
CREATE INDEX "notification_registry_professions_idx" ON "notification_registry"("professions");
