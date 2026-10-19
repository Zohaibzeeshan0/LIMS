-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'QA_MANAGER', 'QC_ANALYST', 'LAB_TECHNICIAN', 'AUDITOR');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('QUARANTINE', 'RELEASED', 'REJECTED', 'CONDITIONAL');

-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('RAW_MATERIAL', 'IN_PROCESS', 'FINISHED_PRODUCT', 'STABILITY', 'WATER_PURIFIED', 'ENVIRONMENTAL_SWAB');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('ROUTINE', 'URGENT', 'STAT');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('RECEIVED', 'LOGGED', 'ASSIGNED', 'TESTING_IN_PROGRESS', 'REVIEW_PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestCategory" AS ENUM ('CHEMICAL', 'PHYSICAL', 'MICROBIOLOGICAL', 'CHROMATOGRAPHY', 'STABILITY');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('PENDING', 'IN_ANALYSIS', 'COMPLETED', 'VERIFIED', 'RETEST_REQUIRED');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('NOT_TESTED', 'WITHIN_SPEC', 'OUT_OF_SPEC', 'OUT_OF_TREND');

-- CreateEnum
CREATE TYPE "InstrumentStatus" AS ENUM ('QUALIFIED', 'CALIBRATION_DUE', 'OUT_OF_SERVICE', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'QC_ANALYST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "drugProduct" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "batchSize" TEXT NOT NULL,
    "manufacturingDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'QUARANTINE',
    "releaseDate" TIMESTAMP(3),
    "releasedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "samples" (
    "id" TEXT NOT NULL,
    "sampleCode" TEXT NOT NULL,
    "batchId" TEXT,
    "sampleType" "SampleType" NOT NULL DEFAULT 'FINISHED_PRODUCT',
    "materialName" TEXT NOT NULL,
    "sourceSupplier" TEXT,
    "samplingLocation" TEXT,
    "samplingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleQty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'units',
    "storageCondition" TEXT NOT NULL DEFAULT 'Controlled Room Temp 20-25┬░C',
    "priority" "Priority" NOT NULL DEFAULT 'ROUTINE',
    "status" "SampleStatus" NOT NULL DEFAULT 'RECEIVED',
    "chainOfCustody" TEXT,
    "barcode" TEXT,
    "accessionedById" TEXT,
    "assignedToId" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_specifications" (
    "id" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TestCategory" NOT NULL DEFAULT 'CHEMICAL',
    "pharmacopeiaMethod" TEXT NOT NULL DEFAULT 'USP',
    "defaultMinLimit" DOUBLE PRECISION,
    "defaultMaxLimit" DOUBLE PRECISION,
    "defaultTarget" DOUBLE PRECISION,
    "unit" TEXT,
    "procedureOverview" TEXT,
    "requiresInstrument" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_specifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_tests" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "testSpecificationId" TEXT NOT NULL,
    "instrumentId" TEXT,
    "analystId" TEXT,
    "status" "TestStatus" NOT NULL DEFAULT 'PENDING',
    "minLimit" DOUBLE PRECISION,
    "maxLimit" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION,
    "unit" TEXT,
    "numericResult" DOUBLE PRECISION,
    "textResult" TEXT,
    "resultStatus" "ResultStatus" NOT NULL DEFAULT 'NOT_TESTED',
    "testDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rawDataReference" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instruments" (
    "id" TEXT NOT NULL,
    "equipmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "laboratoryRoom" TEXT NOT NULL,
    "status" "InstrumentStatus" NOT NULL DEFAULT 'QUALIFIED',
    "lastCalibrationDate" TIMESTAMP(3),
    "nextCalibrationDue" TIMESTAMP(3) NOT NULL,
    "calibrationFrequencyDays" INTEGER NOT NULL DEFAULT 90,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_logs" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "calibrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calibratedById" TEXT,
    "certificateNumber" TEXT NOT NULL,
    "standardUsed" TEXT,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "nextDue" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oos_incidents" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL,
    "sampleTestId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "phaseOneStatus" TEXT NOT NULL DEFAULT 'INVESTIGATING',
    "labErrorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "rootCauseCategory" TEXT,
    "phaseTwoRequired" BOOLEAN NOT NULL DEFAULT false,
    "capaDescription" TEXT,
    "qaApprovalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "qaManagerId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oos_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates_of_analysis" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sampleId" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorizedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "remarks" TEXT,
    "signatureHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_of_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trails" (
    "id" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedById" TEXT,
    "performedByName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "reasonForChange" TEXT,
    "diffPayload" TEXT,

    CONSTRAINT "audit_trails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchNumber_key" ON "batches"("batchNumber");

-- CreateIndex
CREATE INDEX "batches_batchNumber_idx" ON "batches"("batchNumber");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "samples_sampleCode_key" ON "samples"("sampleCode");

-- CreateIndex
CREATE INDEX "samples_sampleCode_idx" ON "samples"("sampleCode");

-- CreateIndex
CREATE INDEX "samples_status_idx" ON "samples"("status");

-- CreateIndex
CREATE INDEX "samples_priority_idx" ON "samples"("priority");

-- CreateIndex
CREATE INDEX "samples_sampleType_idx" ON "samples"("sampleType");

-- CreateIndex
CREATE UNIQUE INDEX "test_specifications_testCode_key" ON "test_specifications"("testCode");

-- CreateIndex
CREATE INDEX "test_specifications_testCode_idx" ON "test_specifications"("testCode");

-- CreateIndex
CREATE INDEX "test_specifications_category_idx" ON "test_specifications"("category");

-- CreateIndex
CREATE INDEX "sample_tests_sampleId_idx" ON "sample_tests"("sampleId");

-- CreateIndex
CREATE INDEX "sample_tests_status_idx" ON "sample_tests"("status");

-- CreateIndex
CREATE INDEX "sample_tests_resultStatus_idx" ON "sample_tests"("resultStatus");

-- CreateIndex
CREATE UNIQUE INDEX "instruments_equipmentCode_key" ON "instruments"("equipmentCode");

-- CreateIndex
CREATE INDEX "instruments_equipmentCode_idx" ON "instruments"("equipmentCode");

-- CreateIndex
CREATE INDEX "instruments_status_idx" ON "instruments"("status");

-- CreateIndex
CREATE INDEX "calibration_logs_instrumentId_idx" ON "calibration_logs"("instrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "oos_incidents_incidentNumber_key" ON "oos_incidents"("incidentNumber");

-- CreateIndex
CREATE INDEX "oos_incidents_incidentNumber_idx" ON "oos_incidents"("incidentNumber");

-- CreateIndex
CREATE INDEX "oos_incidents_qaApprovalStatus_idx" ON "oos_incidents"("qaApprovalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_of_analysis_certificateNumber_key" ON "certificates_of_analysis"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_of_analysis_batchId_key" ON "certificates_of_analysis"("batchId");

-- CreateIndex
CREATE INDEX "certificates_of_analysis_certificateNumber_idx" ON "certificates_of_analysis"("certificateNumber");

-- CreateIndex
CREATE INDEX "audit_trails_entityName_entityId_idx" ON "audit_trails"("entityName", "entityId");

-- CreateIndex
CREATE INDEX "audit_trails_action_idx" ON "audit_trails"("action");

-- CreateIndex
CREATE INDEX "audit_trails_timestamp_idx" ON "audit_trails"("timestamp");

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_accessionedById_fkey" FOREIGN KEY ("accessionedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_tests" ADD CONSTRAINT "sample_tests_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_tests" ADD CONSTRAINT "sample_tests_testSpecificationId_fkey" FOREIGN KEY ("testSpecificationId") REFERENCES "test_specifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_tests" ADD CONSTRAINT "sample_tests_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_tests" ADD CONSTRAINT "sample_tests_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_logs" ADD CONSTRAINT "calibration_logs_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_logs" ADD CONSTRAINT "calibration_logs_calibratedById_fkey" FOREIGN KEY ("calibratedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oos_incidents" ADD CONSTRAINT "oos_incidents_sampleTestId_fkey" FOREIGN KEY ("sampleTestId") REFERENCES "sample_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oos_incidents" ADD CONSTRAINT "oos_incidents_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oos_incidents" ADD CONSTRAINT "oos_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oos_incidents" ADD CONSTRAINT "oos_incidents_qaManagerId_fkey" FOREIGN KEY ("qaManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_of_analysis" ADD CONSTRAINT "certificates_of_analysis_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_of_analysis" ADD CONSTRAINT "certificates_of_analysis_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates_of_analysis" ADD CONSTRAINT "certificates_of_analysis_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_trails" ADD CONSTRAINT "audit_trails_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

