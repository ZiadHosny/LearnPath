-- CreateTable
CREATE TABLE "login_attempts" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_email_attempted_at_idx" ON "login_attempts"("email", "attempted_at");
