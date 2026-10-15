-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('FIXED_TIME', 'TOKEN');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('FREE', 'AT_CLINIC', 'DEPOSIT', 'PREPAY');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ROOM', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "OverrideKind" AS ENUM ('ADD', 'REPLACE', 'BLOCK');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('WEB', 'DESK', 'WALK_IN', 'API', 'WIDGET');

-- CreateEnum
CREATE TYPE "ReservationKind" AS ENUM ('HOLD', 'APPOINTMENT', 'BLOCK');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "limits" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameUr" TEXT,
    "logoUrl" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#0f766e',
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "status" "ClinicStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "planId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "clinicId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "branchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "branchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameUr" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "address" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameUr" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "membershipId" TEXT,
    "displayName" TEXT NOT NULL,
    "displayNameUr" TEXT,
    "title" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'UNDISCLOSED',
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "qualifications" TEXT,
    "photoUrl" TEXT,
    "defaultFee" INTEGER NOT NULL DEFAULT 0,
    "overbookAllowance" INTEGER NOT NULL DEFAULT 0,
    "bookingMode" "BookingMode" NOT NULL DEFAULT 'FIXED_TIME',
    "avgConsultMin" INTEGER NOT NULL DEFAULT 15,
    "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderBranch" (
    "clinicId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,

    CONSTRAINT "ProviderBranch_pkey" PRIMARY KEY ("providerId","branchId")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameUr" TEXT,
    "description" TEXT,
    "durationMin" INTEGER NOT NULL,
    "bufferBeforeMin" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMin" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 0,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'AT_CLINIC',
    "depositAmount" INTEGER,
    "isVideo" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "requiredResourceTypes" "ResourceType"[] DEFAULT ARRAY[]::"ResourceType"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderService" (
    "clinicId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "priceOverride" INTEGER,
    "durationOverride" INTEGER,

    CONSTRAINT "ProviderService_pkey" PRIMARY KEY ("providerId","serviceId")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityOverride" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "branchId" TEXT,
    "date" DATE NOT NULL,
    "kind" "OverrideKind" NOT NULL,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "reason" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "branchId" TEXT,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "nameUr" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT,
    "guardianPatientId" TEXT,
    "mrNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "dateOfBirth" DATE,
    "gender" "Gender" NOT NULL DEFAULT 'UNDISCLOSED',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bookedByUserId" TEXT,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "source" "AppointmentSource" NOT NULL DEFAULT 'WEB',
    "isVideo" BOOLEAN NOT NULL DEFAULT false,
    "tokenNumber" INTEGER,
    "manageTokenHash" TEXT,
    "notesEnc" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentStatusHistory" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "byUserId" TEXT,
    "reason" TEXT,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "kind" "ReservationKind" NOT NULL,
    "occupiedStart" TIMESTAMPTZ(3) NOT NULL,
    "occupiedEnd" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "appointmentId" TEXT,
    "isOverbook" BOOLEAN NOT NULL DEFAULT false,
    "holdOwner" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceReservation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "occupiedStart" TIMESTAMPTZ(3) NOT NULL,
    "occupiedEnd" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ResourceReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "patientId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevOutboxMessage" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevOutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "failedVerificationCount" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProviderToSpecialty" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProviderToSpecialty_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_slug_key" ON "Clinic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_clinicId_key" ON "FeatureFlag"("key", "clinicId");

-- CreateIndex
CREATE INDEX "Membership_clinicId_role_idx" ON "Membership"("clinicId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_clinicId_key" ON "Membership"("userId", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_tokenHash_key" ON "StaffInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffInvite_clinicId_email_idx" ON "StaffInvite"("clinicId", "email");

-- CreateIndex
CREATE INDEX "Branch_clinicId_idx" ON "Branch"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_id_clinicId_key" ON "Branch"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_slug_key" ON "Specialty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_membershipId_key" ON "Provider"("membershipId");

-- CreateIndex
CREATE INDEX "Provider_clinicId_status_idx" ON "Provider"("clinicId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_id_clinicId_key" ON "Provider"("id", "clinicId");

-- CreateIndex
CREATE INDEX "ProviderBranch_clinicId_branchId_idx" ON "ProviderBranch"("clinicId", "branchId");

-- CreateIndex
CREATE INDEX "Service_clinicId_isActive_idx" ON "Service"("clinicId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Service_id_clinicId_key" ON "Service"("id", "clinicId");

-- CreateIndex
CREATE INDEX "ProviderService_clinicId_serviceId_idx" ON "ProviderService"("clinicId", "serviceId");

-- CreateIndex
CREATE INDEX "Resource_clinicId_branchId_type_idx" ON "Resource"("clinicId", "branchId", "type");

-- CreateIndex
CREATE INDEX "AvailabilityRule_clinicId_providerId_branchId_idx" ON "AvailabilityRule"("clinicId", "providerId", "branchId");

-- CreateIndex
CREATE INDEX "AvailabilityOverride_clinicId_providerId_date_idx" ON "AvailabilityOverride"("clinicId", "providerId", "date");

-- CreateIndex
CREATE INDEX "Holiday_clinicId_date_idx" ON "Holiday"("clinicId", "date");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "Patient_clinicId_phone_idx" ON "Patient"("clinicId", "phone");

-- CreateIndex
CREATE INDEX "Patient_clinicId_name_idx" ON "Patient"("clinicId", "name");

-- CreateIndex
CREATE INDEX "Patient_userId_idx" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_id_clinicId_key" ON "Patient"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_clinicId_mrNumber_key" ON "Patient"("clinicId", "mrNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_manageTokenHash_key" ON "Appointment"("manageTokenHash");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_providerId_startAt_idx" ON "Appointment"("clinicId", "providerId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_branchId_startAt_idx" ON "Appointment"("clinicId", "branchId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_patientId_startAt_idx" ON "Appointment"("clinicId", "patientId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_status_startAt_idx" ON "Appointment"("clinicId", "status", "startAt");

-- CreateIndex
CREATE INDEX "AppointmentStatusHistory_clinicId_appointmentId_at_idx" ON "AppointmentStatusHistory"("clinicId", "appointmentId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_appointmentId_key" ON "Reservation"("appointmentId");

-- CreateIndex
CREATE INDEX "Reservation_clinicId_providerId_occupiedStart_idx" ON "Reservation"("clinicId", "providerId", "occupiedStart");

-- CreateIndex
CREATE INDEX "Reservation_kind_expiresAt_idx" ON "Reservation"("kind", "expiresAt");

-- CreateIndex
CREATE INDEX "ResourceReservation_clinicId_resourceId_occupiedStart_idx" ON "ResourceReservation"("clinicId", "resourceId", "occupiedStart");

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_at_idx" ON "AuditLog"("clinicId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_patientId_at_idx" ON "AuditLog"("clinicId", "patientId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_at_idx" ON "AuditLog"("actorUserId", "at");

-- CreateIndex
CREATE INDEX "DevOutboxMessage_createdAt_idx" ON "DevOutboxMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor"("secret");

-- CreateIndex
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor"("userId");

-- CreateIndex
CREATE INDEX "_ProviderToSpecialty_B_index" ON "_ProviderToSpecialty"("B");

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureFlag" ADD CONSTRAINT "FeatureFlag_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBranch" ADD CONSTRAINT "ProviderBranch_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBranch" ADD CONSTRAINT "ProviderBranch_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBranch" ADD CONSTRAINT "ProviderBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityOverride" ADD CONSTRAINT "AvailabilityOverride_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_guardianPatientId_fkey" FOREIGN KEY ("guardianPatientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_clinicId_fkey" FOREIGN KEY ("branchId", "clinicId") REFERENCES "Branch"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_providerId_clinicId_fkey" FOREIGN KEY ("providerId", "clinicId") REFERENCES "Provider"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_clinicId_fkey" FOREIGN KEY ("serviceId", "clinicId") REFERENCES "Service"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_providerId_clinicId_fkey" FOREIGN KEY ("providerId", "clinicId") REFERENCES "Provider"("id", "clinicId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderToSpecialty" ADD CONSTRAINT "_ProviderToSpecialty_A_fkey" FOREIGN KEY ("A") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderToSpecialty" ADD CONSTRAINT "_ProviderToSpecialty_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================================
-- Hand-written constraints (Prisma can't express these in schema.prisma)
-- ============================================================================

-- btree_gist lets one exclusion constraint combine "=" on ids with "&&" on time ranges.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Double-booking guarantee: no two non-overbook reservations (holds, appointments,
-- staff blocks) for the same provider may overlap. Half-open ranges, so back-to-back
-- slots (10:00-10:15 and 10:15-10:30) don't conflict.
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_no_overlap"
  EXCLUDE USING gist (
    "providerId" WITH =,
    tstzrange("occupiedStart", "occupiedEnd", '[)') WITH &&
  ) WHERE (NOT "isOverbook");

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_valid_range" CHECK ("occupiedEnd" > "occupiedStart"),
  ADD CONSTRAINT "Reservation_hold_expiry" CHECK (("kind" = 'HOLD') = ("expiresAt" IS NOT NULL)),
  ADD CONSTRAINT "Reservation_appointment_link" CHECK (("kind" = 'APPOINTMENT') = ("appointmentId" IS NOT NULL));

-- Same guarantee for rooms and equipment.
ALTER TABLE "ResourceReservation"
  ADD CONSTRAINT "ResourceReservation_no_overlap"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("occupiedStart", "occupiedEnd", '[)') WITH &&
  );

ALTER TABLE "ResourceReservation"
  ADD CONSTRAINT "ResourceReservation_valid_range" CHECK ("occupiedEnd" > "occupiedStart");

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_valid_range" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "Appointment_price_nonneg" CHECK ("price" >= 0);

ALTER TABLE "AvailabilityRule"
  ADD CONSTRAINT "AvailabilityRule_weekday" CHECK ("weekday" BETWEEN 1 AND 7),
  ADD CONSTRAINT "AvailabilityRule_minutes" CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute"),
  ADD CONSTRAINT "AvailabilityRule_effective" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");

ALTER TABLE "AvailabilityOverride"
  ADD CONSTRAINT "AvailabilityOverride_minutes" CHECK (
    ("startMinute" IS NULL AND "endMinute" IS NULL AND "kind" = 'BLOCK')
    OR ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute")
  );

ALTER TABLE "Service"
  ADD CONSTRAINT "Service_duration" CHECK ("durationMin" > 0),
  ADD CONSTRAINT "Service_buffers" CHECK ("bufferBeforeMin" >= 0 AND "bufferAfterMin" >= 0),
  ADD CONSTRAINT "Service_capacity" CHECK ("capacity" >= 1),
  ADD CONSTRAINT "Service_price" CHECK ("price" >= 0);

ALTER TABLE "Provider"
  ADD CONSTRAINT "Provider_overbook" CHECK ("overbookAllowance" >= 0),
  ADD CONSTRAINT "Provider_fee" CHECK ("defaultFee" >= 0);

-- Audit log is append-only.
CREATE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog rows are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_no_update" BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
