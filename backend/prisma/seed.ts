import {
  PrismaClient,
  Role,
  BatchStatus,
  SampleType,
  Priority,
  SampleStatus,
  TestCategory,
  TestStatus,
  ResultStatus,
  InstrumentStatus,
  LaboratoryType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding City Pharma LIMS database...');

  // Clean existing tables in proper order
  await prisma.auditLog.deleteMany();
  await prisma.auditTrail.deleteMany();
  await prisma.sampleSubmission.deleteMany();
  await prisma.certificateOfAnalysis.deleteMany();
  await prisma.oosIncident.deleteMany();
  await prisma.sampleTest.deleteMany();
  await prisma.sample.deleteMany();
  await prisma.laboratory.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.calibrationLog.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.testSpecification.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned existing records.');

  // 1. Create Users
  const passwordSalt = await bcrypt.genSalt(10);
  
  // Read Initial Administrator credentials from environment variables per cGMP/security guidelines
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@citypharma.com').toLowerCase().trim();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@1234';
  const adminFullName = process.env.INITIAL_ADMIN_NAME || 'Dr. Tariq Mahmood';
  const adminEmpId = (process.env.INITIAL_ADMIN_EMP_ID || 'EMP-001').toUpperCase().trim();
  const staffDefaultPassword = process.env.INITIAL_STAFF_PASSWORD || adminPassword;

  const adminPasswordHash = await bcrypt.hash(adminPassword, passwordSalt);
  const staffPasswordHash = await bcrypt.hash(staffDefaultPassword, passwordSalt);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      username: 'admin',
      passwordHash: adminPasswordHash,
      fullName: adminFullName,
      employeeId: adminEmpId,
      department: 'QC & Regulatory Affairs',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const qaManager = await prisma.user.create({
    data: {
      email: 'qa.manager@citypharma.com',
      username: 'qa.manager',
      passwordHash: staffPasswordHash,
      fullName: 'Fatima Noor',
      employeeId: 'EMP-014',
      department: 'Quality Assurance',
      role: Role.QA_MANAGER,
      isActive: true,
    },
  });

  const qcAnalyst = await prisma.user.create({
    data: {
      email: 'qc.analyst@citypharma.com',
      username: 'qc.analyst',
      passwordHash: staffPasswordHash,
      fullName: 'Zaid Siddiqui',
      employeeId: 'EMP-088',
      department: 'Quality Control',
      role: Role.QC_ANALYST,
      isActive: true,
    },
  });

  const labTech = await prisma.user.create({
    data: {
      email: 'lab.tech@citypharma.com',
      username: 'lab.tech',
      passwordHash: staffPasswordHash,
      fullName: 'Bilal Raza',
      employeeId: 'EMP-105',
      department: 'Analytical Instrumentation',
      role: Role.LAB_TECHNICIAN,
      isActive: true,
    },
  });

  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@citypharma.com',
      username: 'auditor',
      passwordHash: staffPasswordHash,
      fullName: 'Ayesha Farooq',
      employeeId: 'EMP-200',
      department: 'Internal Quality Audit',
      role: Role.AUDITOR,
      isActive: true,
    },
  });

  console.log('Created Users: Admin, QA Manager, QC Analyst, Lab Technician, Auditor.');

  // 1.5 Create Laboratories per specification
  const safLab = await prisma.laboratory.create({
    data: {
      name: 'SAF Lab',
      code: 'SAF',
      isActive: true,
    },
  });

  const penLab = await prisma.laboratory.create({
    data: {
      name: 'Penicillin Lab',
      code: 'PEN',
      isActive: true,
    },
  });

  const genLab = await prisma.laboratory.create({
    data: {
      name: 'General Lab',
      code: 'GEN',
      isActive: true,
    },
  });

  console.log('Created Laboratories: SAF Lab, Penicillin Lab, General Lab.');

  // 2. Create Master Test Specifications
  const specAssay = await prisma.testSpecification.create({
    data: {
      testCode: 'SPEC-ASSAY-HPLC',
      name: 'Assay by HPLC (Active Ingredient Content)',
      category: TestCategory.CHROMATOGRAPHY,
      pharmacopeiaMethod: 'USP <621>',
      defaultMinLimit: 98.0,
      defaultMaxLimit: 102.0,
      defaultTarget: 100.0,
      unit: '%',
      procedureOverview: 'Reverse-phase isocratic HPLC with C18 stationary phase, UV detection at 243 nm, flow rate 1.0 mL/min.',
      requiresInstrument: true,
    },
  });

  const specDissolution = await prisma.testSpecification.create({
    data: {
      testCode: 'SPEC-DISSOLUTION-USP2',
      name: 'Dissolution Rate (USP Apparatus II Paddle)',
      category: TestCategory.PHYSICAL,
      pharmacopeiaMethod: 'USP <711>',
      defaultMinLimit: 80.0,
      defaultMaxLimit: 100.0,
      defaultTarget: 95.0,
      unit: '% Q',
      procedureOverview: '50 RPM, 900 mL 0.1 N HCl medium, 37.0 ± 0.5°C, 45 minutes pull.',
      requiresInstrument: true,
    },
  });

  const specImpurityA = await prisma.testSpecification.create({
    data: {
      testCode: 'SPEC-IMPURITY-4AP',
      name: 'Related Substances: 4-Aminophenol Impurity',
      category: TestCategory.CHROMATOGRAPHY,
      pharmacopeiaMethod: 'BP 2024 Appendix III',
      defaultMinLimit: 0.0,
      defaultMaxLimit: 0.05,
      defaultTarget: 0.01,
      unit: '%',
      procedureOverview: 'Gradient HPLC with ion-pair reagent, UV detection at 272 nm. Limit: not more than 0.05%.',
      requiresInstrument: true,
    },
  });

  const specPH = await prisma.testSpecification.create({
    data: {
      testCode: 'SPEC-PH-ELECTROMETRIC',
      name: 'pH Potentiometric Determination',
      category: TestCategory.CHEMICAL,
      pharmacopeiaMethod: 'USP <791>',
      defaultMinLimit: 4.5,
      defaultMaxLimit: 5.5,
      defaultTarget: 5.0,
      unit: 'pH',
      procedureOverview: 'Standardized two-point glass electrode calibration at pH 4.01 and 7.00.',
      requiresInstrument: true,
    },
  });

  const specLOD = await prisma.testSpecification.create({
    data: {
      testCode: 'SPEC-LOSS-ON-DRYING',
      name: 'Loss on Drying (LOD)',
      category: TestCategory.PHYSICAL,
      pharmacopeiaMethod: 'USP <731>',
      defaultMinLimit: 0.0,
      defaultMaxLimit: 0.5,
      defaultTarget: 0.2,
      unit: '% w/w',
      procedureOverview: 'Dry 1.000 g sample at 105°C for 3 hours in convection oven until constant mass.',
      requiresInstrument: true,
    },
  });

  const specEndotoxin = await prisma.testSpecification.create({
    data: {
      testCode: 'SPEC-ENDOTOXIN-LAL',
      name: 'Bacterial Endotoxins (Kinetic Chromogenic LAL)',
      category: TestCategory.MICROBIOLOGICAL,
      pharmacopeiaMethod: 'USP <85>',
      defaultMinLimit: 0.0,
      defaultMaxLimit: 0.25,
      defaultTarget: 0.02,
      unit: 'EU/mL',
      procedureOverview: 'Kinetic chromogenic LAL microplate reader assay at 37°C.',
      requiresInstrument: true,
    },
  });

  console.log('Created Test Specifications.');

  // 3. Create Analytical Instruments
  const now = new Date();
  const calDueSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
  const calDueLater = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000); // 75 days from now
  const calOverdue = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // 4 days overdue

  const hplc01 = await prisma.instrument.create({
    data: {
      equipmentCode: 'HPLC-01',
      name: 'Agilent 1260 Infinity II HPLC System',
      model: '1260 Infinity II Quaternary',
      serialNumber: 'DEBA402911',
      manufacturer: 'Agilent Technologies',
      laboratoryRoom: 'Chromatography Lab 304',
      status: InstrumentStatus.QUALIFIED,
      calibrationFrequencyDays: 90,
      lastCalibrationDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      nextCalibrationDue: calDueLater,
      remarks: 'Fitted with G7115A DAD detector and G7116A column compartment.',
    },
  });

  const hplc02 = await prisma.instrument.create({
    data: {
      equipmentCode: 'HPLC-02',
      name: 'Waters Alliance e2695 HPLC System',
      model: 'e2695 Separations Module',
      serialNumber: 'WTR-88120',
      manufacturer: 'Waters Corporation',
      laboratoryRoom: 'Chromatography Lab 304',
      status: InstrumentStatus.QUALIFIED,
      calibrationFrequencyDays: 90,
      lastCalibrationDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      nextCalibrationDue: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      remarks: 'Equipped with 2998 PDA detector and Empower 3 software.',
    },
  });

  const uv01 = await prisma.instrument.create({
    data: {
      equipmentCode: 'UV-01',
      name: 'Shimadzu UV-2600i Double-Beam Spectrophotometer',
      model: 'UV-2600i',
      serialNumber: 'SHM-55019',
      manufacturer: 'Shimadzu Scientific',
      laboratoryRoom: 'Spectroscopy Lab 302',
      status: InstrumentStatus.CALIBRATION_DUE,
      calibrationFrequencyDays: 90,
      lastCalibrationDate: new Date(now.getTime() - 87 * 24 * 60 * 60 * 1000),
      nextCalibrationDue: calDueSoon,
      remarks: 'Holmium oxide and deuterium wavelength check required within 72 hours.',
    },
  });

  const bal01 = await prisma.instrument.create({
    data: {
      equipmentCode: 'BAL-01',
      name: 'Mettler Toledo XPE205 Micro-Analytical Balance',
      model: 'XPE205 (5 Decimals)',
      serialNumber: 'MT-99412',
      manufacturer: 'Mettler Toledo',
      laboratoryRoom: 'Weighing Center 301',
      status: InstrumentStatus.QUALIFIED,
      calibrationFrequencyDays: 30,
      lastCalibrationDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      nextCalibrationDue: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      remarks: 'Daily span check verified against E2 certified weights.',
    },
  });

  const dis01 = await prisma.instrument.create({
    data: {
      equipmentCode: 'DIS-01',
      name: 'Distek 2500 Dissolution System (8-Position)',
      model: 'Distek 2500 Bathless',
      serialNumber: 'DST-7714',
      manufacturer: 'Distek Inc',
      laboratoryRoom: 'Physical Testing Lab 305',
      status: InstrumentStatus.QUALIFIED,
      calibrationFrequencyDays: 180,
      lastCalibrationDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      nextCalibrationDue: new Date(now.getTime() + 140 * 24 * 60 * 60 * 1000),
      remarks: 'Equipped with automated dosage delivery unit and autosampler.',
    },
  });

  const phm01 = await prisma.instrument.create({
    data: {
      equipmentCode: 'PHM-01',
      name: 'Metrohm 913 pH/Conductivity Meter',
      model: '913 Laboratory Meter',
      serialNumber: 'MTR-2204',
      manufacturer: 'Metrohm AG',
      laboratoryRoom: 'Wet Chemistry Lab 303',
      status: InstrumentStatus.QUALIFIED,
      calibrationFrequencyDays: 30,
      lastCalibrationDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      nextCalibrationDue: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      remarks: 'Electrode slope: 99.4%, response time < 10 seconds.',
    },
  });

  // Calibration Log for HPLC-01
  await prisma.calibrationLog.create({
    data: {
      instrumentId: hplc01.id,
      calibrationDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      calibratedById: labTech.id,
      certificateNumber: 'CAL-2026-0418',
      standardUsed: 'Agilent PQ Test Standard Kit (Part #5190-0487)',
      passed: true,
      nextDue: calDueLater,
      remarks: 'Flow rate precision RSD = 0.08%, gradient composition accuracy passed.',
    },
  });

  console.log('Created Instruments and Calibration Logs.');

  // 4. Create Production Batches
  const batch1 = await prisma.batch.create({
    data: {
      batchNumber: 'CP-2026-B892',
      drugProduct: 'Paracetamol 500mg Film-Coated Tablets',
      dosageForm: 'Solid Oral Tablet',
      batchSize: '500,000 Tablets',
      manufacturingDate: new Date('2026-10-10'),
      expiryDate: new Date('2029-10-09'),
      status: BatchStatus.QUARANTINE,
      notes: 'Commercial release batch. Granulation and tableting completed under GMP SOP-MF-042.',
    },
  });

  const batch2 = await prisma.batch.create({
    data: {
      batchNumber: 'CP-2026-B891',
      drugProduct: 'Amoxicillin Trihydrate 250mg Capsules',
      dosageForm: 'Hard Gelatin Capsule',
      batchSize: '250,000 Capsules',
      manufacturingDate: new Date('2026-09-18'),
      expiryDate: new Date('2028-09-17'),
      status: BatchStatus.RELEASED,
      releaseDate: new Date('2026-09-28'),
      releasedBy: 'Fatima Noor (QA_MANAGER)',
      notes: 'Full compendial release testing completed. All parameters within USP specification. Approved for commercial distribution.',
    },
  });

  const batch3 = await prisma.batch.create({
    data: {
      batchNumber: 'CP-2026-B890',
      drugProduct: 'Ciprofloxacin HCl 0.3% w/v Eye Drops',
      dosageForm: 'Sterile Ophthalmic Solution',
      batchSize: '40,000 Vials (5 mL)',
      manufacturingDate: new Date('2026-09-01'),
      expiryDate: new Date('2028-09-01'),
      status: BatchStatus.RELEASED,
      releaseDate: new Date('2026-09-15'),
      releasedBy: 'Fatima Noor (QA_MANAGER)',
      notes: 'Sterility 14-day incubation passed with zero growth. Endotoxin < 0.02 EU/mL.',
    },
  });

  const batch4 = await prisma.batch.create({
    data: {
      batchNumber: 'CP-2026-B889',
      drugProduct: 'Metformin HCl 850mg Prolonged-Release Tablets',
      dosageForm: 'Extended Release Tablet',
      batchSize: '300,000 Tablets',
      manufacturingDate: new Date('2026-08-20'),
      expiryDate: new Date('2029-08-19'),
      status: BatchStatus.CONDITIONAL,
      notes: 'Stability retain sample currently undergoing accelerated testing at 40°C/75% RH.',
    },
  });

  console.log('Created Batches.');

  // Sample 1: Active Testing Paracetamol Finished Product (General Lab)
  const sample1 = await prisma.sample.create({
    data: {
      recordNumber: 'REC-2026-0001',
      sampleId: 'SMP-2026-0001',
      laboratoryId: genLab.id,
      nomenclature: 'Paracetamol 500mg Film-Coated Tablets (USP/BP)',
      stageType: 'FINISHED_PRODUCT',
      quantity: 300,
      quantityUnit: 'tablets',
      batchLotNumber: 'CP-2026-B892',
      manufacturingDate: new Date('2026-10-10'),
      expiryDate: new Date('2029-10-09'),
      submittedByUserId: labTech.id,
      receivedByUserId: qcAnalyst.id,
      sampledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: SampleStatus.TESTING_IN_PROGRESS,

      accessionNo: 'A-0001',
      sampleCode: 'SMP-2026-0001',
      barcode: 'CP-SMP-2026-0001',
      batchId: batch1.id,
      sampleType: SampleType.FINISHED_PRODUCT,
      materialName: 'Paracetamol 500mg Finished Tablets',
      lotNumber: 'CP-2026-B892',
      mfgDate: new Date('2026-10-10'),
      expDate: new Date('2029-10-09'),
      submittedBy: 'Bilal Raza (Packaging Line 2)',
      samplingLocation: 'Packaging Line 2, Unit 1',
      samplingDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      sampleQty: 300,
      unit: 'tablets',
      storageCondition: 'Controlled Room Temp 20-25°C',
      priority: Priority.ROUTINE,
      laboratoryType: LaboratoryType.GENERAL,
      chainOfCustody: `[${new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()}] Sample accessioned by Bilal Raza\n[${new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()}] Assigned to Zaid Siddiqui for QC testing`,
      accessionedById: labTech.id,
      assignedToId: qcAnalyst.id,
      remarks: 'Representative composite sample taken from beginning, middle, and end of blister packaging run.',
    },
  });

  // Tests for Sample 1
  const test1_1 = await prisma.sampleTest.create({
    data: {
      sampleId: sample1.id,
      testSpecificationId: specAssay.id,
      instrumentId: hplc01.id,
      analystId: qcAnalyst.id,
      status: TestStatus.IN_ANALYSIS,
      resultStatus: ResultStatus.NOT_TESTED,
      minLimit: 98.0,
      maxLimit: 102.0,
      targetValue: 100.0,
      unit: '%',
      comments: 'Calibration standard sequence completed. Injected sample solutions in duplicate.',
    },
  });

  const test1_2 = await prisma.sampleTest.create({
    data: {
      sampleId: sample1.id,
      testSpecificationId: specDissolution.id,
      instrumentId: dis01.id,
      analystId: qcAnalyst.id,
      status: TestStatus.COMPLETED,
      resultStatus: ResultStatus.WITHIN_SPEC,
      minLimit: 80.0,
      maxLimit: 100.0,
      targetValue: 95.0,
      unit: '% Q',
      numericResult: 94.6,
      completedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      rawDataReference: 'Distek Dissolution Log Sheet #DIS-2026-901; Vessel 1-6 mean: 94.6% (RSD 1.4%)',
      comments: 'Conforms to USP Stage 1 (S1) criteria (all 6 units >= 85%).',
    },
  });

  const test1_3 = await prisma.sampleTest.create({
    data: {
      sampleId: sample1.id,
      testSpecificationId: specLOD.id,
      instrumentId: bal01.id,
      analystId: qcAnalyst.id,
      status: TestStatus.COMPLETED,
      resultStatus: ResultStatus.WITHIN_SPEC,
      minLimit: 0.0,
      maxLimit: 2.0,
      targetValue: 1.0,
      unit: '% w/w',
      numericResult: 0.88,
      completedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      rawDataReference: 'Mettler Balance Weighing Printout #WT-0814',
      comments: 'Moisture content conforms to specifications.',
    },
  });

  // Sample 2: Released Amoxicillin Batch with CoA (Penicillin Lab)
  const sample2 = await prisma.sample.create({
    data: {
      recordNumber: 'REC-2026-0002',
      sampleId: 'SMP-2026-0002',
      laboratoryId: penLab.id,
      nomenclature: 'Amoxicillin Trihydrate 250mg Hard Gelatin Capsules (BP)',
      stageType: 'FINISHED_PRODUCT',
      quantity: 200,
      quantityUnit: 'capsules',
      batchLotNumber: 'CP-2026-B891',
      manufacturingDate: new Date('2026-09-18'),
      expiryDate: new Date('2028-09-17'),
      submittedByUserId: labTech.id,
      receivedByUserId: qcAnalyst.id,
      sampledAt: new Date('2026-09-20'),
      status: SampleStatus.APPROVED,

      accessionNo: 'A-0002',
      sampleCode: 'SMP-2026-0002',
      barcode: 'CP-SMP-2026-0002',
      batchId: batch2.id,
      sampleType: SampleType.FINISHED_PRODUCT,
      materialName: 'Amoxicillin Trihydrate 250mg Capsules',
      lotNumber: 'CP-2026-B891',
      mfgDate: new Date('2026-09-18'),
      expDate: new Date('2028-09-17'),
      submittedBy: 'Zahid Khan (Encapsulation Suite 4)',
      samplingLocation: 'Encapsulation Suite 4',
      samplingDate: new Date('2026-09-20'),
      sampleQty: 200,
      unit: 'capsules',
      storageCondition: 'Controlled Room Temp 20-25°C',
      priority: Priority.ROUTINE,
      laboratoryType: LaboratoryType.PENICILLIN,
      chainOfCustody: 'Full chain of custody verified and archived with QA lot record.',
      accessionedById: labTech.id,
      assignedToId: qcAnalyst.id,
      remarks: 'All quality release criteria met.',
    },
  });

  await prisma.sampleTest.create({
    data: {
      sampleId: sample2.id,
      testSpecificationId: specAssay.id,
      instrumentId: hplc02.id,
      analystId: qcAnalyst.id,
      status: TestStatus.VERIFIED,
      resultStatus: ResultStatus.WITHIN_SPEC,
      minLimit: 90.0,
      maxLimit: 120.0,
      targetValue: 100.0,
      unit: '%',
      numericResult: 101.2,
      testDate: new Date('2026-09-22'),
      completedAt: new Date('2026-09-22'),
      rawDataReference: 'Waters Empower Chromatogram Channel UV_VIS_1, Run ID #EM-8911',
    },
  });

  await prisma.sampleTest.create({
    data: {
      sampleId: sample2.id,
      testSpecificationId: specDissolution.id,
      instrumentId: dis01.id,
      analystId: qcAnalyst.id,
      status: TestStatus.VERIFIED,
      resultStatus: ResultStatus.WITHIN_SPEC,
      minLimit: 80.0,
      maxLimit: 100.0,
      targetValue: 90.0,
      unit: '% Q',
      numericResult: 89.4,
      testDate: new Date('2026-09-23'),
      completedAt: new Date('2026-09-23'),
      rawDataReference: 'Distek Dissolution Bath Run #2026-09-23-A',
    },
  });

  // Certificate of Analysis for Batch 2
  const coaPayload = `COA-2026-0001|CP-2026-B891|Amoxicillin Trihydrate 250mg Capsules|EMP-014|2026-09-28`;
  const signatureHash = crypto.createHash('sha256').update(coaPayload).digest('hex');

  await prisma.certificateOfAnalysis.create({
    data: {
      certificateNumber: 'COA-2026-0001',
      batchId: batch2.id,
      sampleId: sample2.id,
      issuedDate: new Date('2026-09-28'),
      authorizedById: qaManager.id,
      status: 'ISSUED',
      remarks: 'Certified that the above mentioned production batch was manufactured, packaged, and tested in accordance with current Good Manufacturing Practices (cGMP) and meets all USP pharmacopeial specifications.',
      signatureHash,
    },
  });

  // Sample 3: Raw Material API with Out-Of-Specification (OOS) Flag! (General Lab)
  const sample3 = await prisma.sample.create({
    data: {
      recordNumber: 'REC-2026-0003',
      sampleId: 'SMP-2026-0003',
      laboratoryId: genLab.id,
      nomenclature: 'Paracetamol BP Active Substance / Micronized Powder API',
      stageType: 'RAW_MATERIAL',
      quantity: 500,
      quantityUnit: 'g',
      batchLotNumber: 'HAP-2026-9041',
      manufacturingDate: new Date('2026-08-15'),
      expiryDate: new Date('2030-08-14'),
      submittedByUserId: labTech.id,
      receivedByUserId: qcAnalyst.id,
      sampledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      status: SampleStatus.REVIEW_PENDING,

      accessionNo: 'A-0003',
      sampleCode: 'SMP-2026-0003',
      barcode: 'CP-SMP-2026-0003',
      sampleType: SampleType.RAW_MATERIAL,
      materialName: 'Paracetamol BP Raw Material (Powder API)',
      lotNumber: 'HAP-2026-9041',
      mfgDate: new Date('2026-08-15'),
      expDate: new Date('2030-08-14'),
      submittedBy: 'Tariq Mehmood (Warehouse Receiving Dock)',
      sourceSupplier: 'Hapharm Chemical Intermediates Ltd',
      samplingLocation: 'Warehouse Sampling Booth Room 102',
      samplingDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      sampleQty: 500,
      unit: 'g',
      storageCondition: 'Controlled Room Temp 20-25°C',
      priority: Priority.URGENT,
      laboratoryType: LaboratoryType.GENERAL,
      chainOfCustody: 'Sample drawn in Class D air-lock sampling booth under HEPA filtration.',
      accessionedById: labTech.id,
      assignedToId: qcAnalyst.id,
      remarks: 'Raw material intake lot #HAP-2026-9041. Container quarantined pending QC testing.',
    },
  });

  const test3_1 = await prisma.sampleTest.create({
    data: {
      sampleId: sample3.id,
      testSpecificationId: specAssay.id,
      instrumentId: hplc01.id,
      analystId: qcAnalyst.id,
      status: TestStatus.COMPLETED,
      resultStatus: ResultStatus.OUT_OF_SPEC,
      minLimit: 98.0,
      maxLimit: 102.0,
      targetValue: 100.0,
      unit: '%',
      numericResult: 96.2,
      completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      rawDataReference: 'Agilent Chromatogram Run #2026-RM-044; Duplicate assay injections: 96.18%, 96.22%',
      comments: 'ASSAY RESULT 96.2% OUT OF SPECIFICATION (USP Spec: 98.0 - 102.0%). Out of Specification investigation initiated immediately.',
    },
  });

  const test3_2 = await prisma.sampleTest.create({
    data: {
      sampleId: sample3.id,
      testSpecificationId: specLOD.id,
      instrumentId: bal01.id,
      analystId: qcAnalyst.id,
      status: TestStatus.COMPLETED,
      resultStatus: ResultStatus.WITHIN_SPEC,
      minLimit: 0.0,
      maxLimit: 0.5,
      targetValue: 0.2,
      unit: '% w/w',
      numericResult: 0.31,
      completedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      rawDataReference: 'Analytical Balance #BAL-01 printout #WT-0919',
    },
  });

  // OOS Incident Record for Test 3_1
  await prisma.oosIncident.create({
    data: {
      incidentNumber: 'OOS-2026-0001',
      sampleTestId: test3_1.id,
      sampleId: sample3.id,
      reportedById: qcAnalyst.id,
      phaseOneStatus: 'INVESTIGATING',
      labErrorConfirmed: false,
      rootCauseCategory: 'UNDER_INVESTIGATION',
      phaseTwoRequired: true,
      capaDescription: 'Phase 1 Lab Investigation checklist in progress: Analyst verified weighing balance calibration, HPLC column backpressure (142 bar, normal), mobile phase preparation date (freshly prepared 2026-10-16). Re-injection of standard solution passed system suitability. Sample re-test by second independent analyst authorized.',
      qaApprovalStatus: 'PENDING',
    },
  });

  // Sample 4: Purified Water Loop (SAF Lab)
  const sample4 = await prisma.sample.create({
    data: {
      recordNumber: 'REC-2026-0004',
      sampleId: 'SMP-2026-0004',
      laboratoryId: safLab.id,
      nomenclature: 'Purified Water Generation & Distribution Loop 1 (USP Monograph)',
      stageType: 'WATER_PURIFIED',
      quantity: 1000,
      quantityUnit: 'mL',
      batchLotNumber: 'W-04-20261017',
      manufacturingDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      submittedByUserId: labTech.id,
      receivedByUserId: qcAnalyst.id,
      sampledAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      status: SampleStatus.APPROVED,

      accessionNo: 'A-0004',
      sampleCode: 'SMP-2026-0004',
      barcode: 'CP-SMP-2026-0004',
      sampleType: SampleType.WATER_PURIFIED,
      materialName: 'Purified Water Generation Loop 1 (Return Point W-04)',
      lotNumber: 'W-04-20261017',
      mfgDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      expDate: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      submittedBy: 'Imran Shah (Water Plant Operator)',
      samplingLocation: 'Water Treatment Plant Room 008',
      samplingDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      sampleQty: 1000,
      unit: 'mL',
      storageCondition: 'Cold Storage 2-8°C',
      priority: Priority.STAT,
      laboratoryType: LaboratoryType.SAF,
      chainOfCustody: 'Collected in sterile pyrogen-free borosilicate container with sodium thiosulfate.',
      accessionedById: labTech.id,
      assignedToId: qcAnalyst.id,
      remarks: 'Daily monitoring of USP Purified Water distribution loop.',
    },
  });

  await prisma.sampleTest.create({
    data: {
      sampleId: sample4.id,
      testSpecificationId: specPH.id,
      instrumentId: phm01.id,
      analystId: qcAnalyst.id,
      status: TestStatus.VERIFIED,
      resultStatus: ResultStatus.WITHIN_SPEC,
      minLimit: 5.0,
      maxLimit: 7.0,
      targetValue: 6.0,
      unit: 'pH',
      numericResult: 5.82,
      completedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      rawDataReference: 'Metrohm 913 Meter Log ID #PH-4911',
    },
  });

  await prisma.sampleTest.create({
    data: {
      sampleId: sample4.id,
      testSpecificationId: specEndotoxin.id,
      analystId: qcAnalyst.id,
      status: TestStatus.VERIFIED,
      resultStatus: ResultStatus.WITHIN_SPEC,
      minLimit: 0.0,
      maxLimit: 0.25,
      targetValue: 0.02,
      unit: 'EU/mL',
      numericResult: 0.012,
      completedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      rawDataReference: 'BioTek ELx808 Reader Plate ID #END-904',
    },
  });

  // Sample 5: Stability Study (General Lab)
  await prisma.sample.create({
    data: {
      recordNumber: 'REC-2026-0005',
      sampleId: 'SMP-2026-0005',
      laboratoryId: genLab.id,
      nomenclature: 'Metformin HCl 850mg Prolonged Release Tablets (ICH Q1A)',
      stageType: 'STABILITY',
      quantity: 100,
      quantityUnit: 'tablets',
      batchLotNumber: 'CP-2026-B889',
      manufacturingDate: new Date('2026-08-20'),
      expiryDate: new Date('2029-08-19'),
      submittedByUserId: labTech.id,
      receivedByUserId: qcAnalyst.id,
      sampledAt: now,
      status: SampleStatus.ASSIGNED,

      accessionNo: 'A-0005',
      sampleCode: 'SMP-2026-0005',
      barcode: 'CP-SMP-2026-0005',
      batchId: batch4.id,
      sampleType: SampleType.STABILITY,
      materialName: 'Metformin HCl 850mg Prolonged Release Tablets (6-Month Accelerated)',
      lotNumber: 'CP-2026-B889',
      mfgDate: new Date('2026-08-20'),
      expDate: new Date('2029-08-19'),
      submittedBy: 'Noman Bashir (Stability Chamber In-charge)',
      samplingLocation: 'Stability Chamber SC-02 (40°C ± 2°C / 75% RH ± 5% RH)',
      samplingDate: now,
      sampleQty: 100,
      unit: 'tablets',
      storageCondition: 'Zone IVb Chamber SC-02',
      priority: Priority.ROUTINE,
      laboratoryType: LaboratoryType.GENERAL,
      chainOfCustody: 'Pulled from stability chamber SC-02 shelf 4 on scheduled 6-month timepoint.',
      accessionedById: labTech.id,
      assignedToId: qcAnalyst.id,
      remarks: 'ICH Q1A(R2) stability protocol execution.',
    },
  });

  // Sample 6: Penicillin Lab - Ampicillin Sodium Sterile Powder
  const sample6 = await prisma.sample.create({
    data: {
      recordNumber: 'REC-2026-0006',
      sampleId: 'SMP-2026-0006',
      laboratoryId: penLab.id,
      nomenclature: 'Ampicillin Sodium Sterile Powder for Injection USP (Beta-Lactam)',
      stageType: 'RAW_MATERIAL',
      quantity: 250,
      quantityUnit: 'g',
      batchLotNumber: 'SIN-PEN-4019',
      manufacturingDate: new Date('2026-09-05'),
      expiryDate: new Date('2028-09-04'),
      submittedByUserId: labTech.id,
      receivedByUserId: qcAnalyst.id,
      sampledAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      status: SampleStatus.TESTING_IN_PROGRESS,

      accessionNo: 'A-0006',
      sampleCode: 'SMP-2026-0006',
      barcode: 'CP-SMP-2026-0006',
      sampleType: SampleType.RAW_MATERIAL,
      materialName: 'Ampicillin Sodium Sterile Powder USP',
      lotNumber: 'SIN-PEN-4019',
      mfgDate: new Date('2026-09-05'),
      expDate: new Date('2028-09-04'),
      submittedBy: 'Kashif Ali (Beta-Lactam Air-Lock Booth)',
      sourceSupplier: 'Sinochem Penicillin Active Co.',
      samplingLocation: 'Beta-Lactam Air-Lock Suite B1',
      samplingDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      sampleQty: 250,
      unit: 'g',
      storageCondition: 'Controlled Room Temp 15-25°C in Nitrogen purge container',
      priority: Priority.URGENT,
      laboratoryType: LaboratoryType.PENICILLIN,
      chainOfCustody: 'Dedicated Beta-Lactam negative pressure sampling containment. Accessioned by Bilal Raza.',
      accessionedById: labTech.id,
      assignedToId: qcAnalyst.id,
      remarks: 'Raw material intake for sterile injectable production line. Dedicated containment verification.',
    },
  });

  await prisma.sampleTest.create({
    data: {
      sampleId: sample6.id,
      testSpecificationId: specAssay.id,
      instrumentId: hplc02.id,
      analystId: qcAnalyst.id,
      status: TestStatus.IN_ANALYSIS,
      resultStatus: ResultStatus.NOT_TESTED,
      minLimit: 95.0,
      maxLimit: 102.0,
      targetValue: 99.0,
      unit: '%',
      comments: 'Beta-Lactam dedicated column chromatographic run in progress.',
    },
  });

  // Sample 7: SAF Lab - Ciprofloxacin Finished Ophthalmic Solution
  const sample7 = await prisma.sample.create({
    data: {
      recordNumber: 'REC-2026-0007',
      sampleId: 'SMP-2026-0007',
      laboratoryId: safLab.id,
      nomenclature: 'Ciprofloxacin HCl 0.3% w/v Sterile Ophthalmic Drops (USP)',
      stageType: 'FINISHED_PRODUCT',
      quantity: 40,
      quantityUnit: 'vials',
      batchLotNumber: 'CP-2026-B890',
      manufacturingDate: new Date('2026-09-01'),
      expiryDate: new Date('2028-09-01'),
      submittedByUserId: labTech.id,
      receivedByUserId: qcAnalyst.id,
      sampledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: SampleStatus.APPROVED,

      accessionNo: 'A-0007',
      sampleCode: 'SMP-2026-0007',
      barcode: 'CP-SMP-2026-0007',
      batchId: batch3.id,
      sampleType: SampleType.FINISHED_PRODUCT,
      materialName: 'Ciprofloxacin HCl 0.3% w/v Eye Drops',
      lotNumber: 'CP-2026-B890',
      mfgDate: new Date('2026-09-01'),
      expDate: new Date('2028-09-01'),
      submittedBy: 'Sadia Qureshi (Aseptic Filling Line 1)',
      samplingLocation: 'Aseptic Filling Line 1 - Cleanroom Grade A',
      samplingDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      sampleQty: 40,
      unit: 'vials',
      storageCondition: 'Store at 15-25°C Protect from Light',
      priority: Priority.ROUTINE,
      laboratoryType: LaboratoryType.SAF,
      chainOfCustody: 'Sterile transfer port pass-through. Accessioned by Bilal Raza.',
      accessionedById: labTech.id,
      assignedToId: qcAnalyst.id,
      remarks: 'Sterility 14-day incubation cleared. Endotoxin testing verified.',
    },
  });

  await prisma.sampleTest.create({
    data: {
      sampleId: sample7.id,
      testSpecificationId: specEndotoxin.id,
      analystId: qcAnalyst.id,
      status: TestStatus.VERIFIED,
      resultStatus: ResultStatus.WITHIN_SPEC,
      minLimit: 0.0,
      maxLimit: 0.25,
      targetValue: 0.02,
      unit: 'EU/mL',
      numericResult: 0.008,
      completedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      rawDataReference: 'BioTek ELx808 Plate Reader ID #END-918',
    },
  });

  console.log('Created Samples, Tests, and OOS Records.');

  // 5. Create Sample Workflow Submissions
  await prisma.sampleSubmission.create({
    data: {
      sampleId: sample1.id,
      destinationLaboratory: 'General Lab',
      destinationLabId: genLab.id,
      submittedByUserId: labTech.id,
      submittedByName: labTech.fullName,
      submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      remarks: 'Routing Paracetamol finished product sample for HPLC Assay and Dissolution testing',
    },
  });

  await prisma.sampleSubmission.create({
    data: {
      sampleId: sample3.id,
      destinationLaboratory: 'General Lab',
      destinationLabId: genLab.id,
      submittedByUserId: labTech.id,
      submittedByName: labTech.fullName,
      submittedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      status: 'SUBMITTED',
      remarks: 'Raw material intake submission for compendial identity and LOD assays',
    },
  });

  await prisma.sampleSubmission.create({
    data: {
      sampleId: sample4.id,
      destinationLaboratory: 'SAF Lab',
      destinationLabId: safLab.id,
      submittedByUserId: labTech.id,
      submittedByName: labTech.fullName,
      submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      status: 'COMPLETED',
      remarks: 'Purified water return loop testing at Special Analytical Facility (SAF)',
    },
  });

  await prisma.sampleSubmission.create({
    data: {
      sampleId: sample6.id,
      destinationLaboratory: 'Penicillin Lab',
      destinationLabId: penLab.id,
      submittedByUserId: labTech.id,
      submittedByName: labTech.fullName,
      submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      remarks: 'Dedicated Beta-Lactam testing submission with containment verification',
    },
  });

  console.log('Created Sample Submissions across SAF Lab, Penicillin Lab, and General Lab.');

  // 6. Create Normalized Audit Logs (AuditLog model)
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      entityId: 'SYS-INIT',
      newValues: { message: 'City Pharma LIMS enterprise database seeded with master laboratories, users, and monographs' },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: labTech.id,
      action: 'SAMPLE_CREATED',
      entityType: 'Sample',
      entityId: sample1.id,
      newValues: {
        recordNumber: sample1.recordNumber,
        sampleId: sample1.sampleId,
        nomenclature: sample1.nomenclature,
        laboratory: 'General Lab',
        quantity: sample1.quantity,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: labTech.id,
      action: 'SAMPLE_SUBMITTED',
      entityType: 'SampleSubmission',
      entityId: sample1.id,
      newValues: {
        destinationLaboratory: 'General Lab',
        status: 'IN_PROGRESS',
      },
    },
  });

  // 7. Create Initial Audit Trails (21 CFR Part 11)
  await prisma.auditTrail.create({
    data: {
      entityName: 'System',
      entityId: 'SYS-INIT',
      action: 'SYSTEM_INITIALIZATION',
      performedById: admin.id,
      performedByName: admin.fullName,
      role: admin.role,
      reasonForChange: 'City Pharma LIMS enterprise database seeded with master monographs, qualified instruments, and production lots.',
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.auditTrail.create({
    data: {
      entityName: 'Batch',
      entityId: batch2.id,
      action: 'BATCH_RELEASED',
      performedById: qaManager.id,
      performedByName: qaManager.fullName,
      role: qaManager.role,
      reasonForChange: 'All physical, chemical, and microbiological parameters meet USP specifications. Certificate of Analysis COA-2026-0001 generated.',
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.auditTrail.create({
    data: {
      entityName: 'SampleTest',
      entityId: test3_1.id,
      action: 'OOS_TRIGGERED',
      performedById: qcAnalyst.id,
      performedByName: qcAnalyst.fullName,
      role: qcAnalyst.role,
      reasonForChange: 'Analytical result 96.2% fell below minimum specification limit of 98.0%. Incident OOS-2026-0001 logged automatically.',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('Seeded 21 CFR Part 11 Audit Trail & Normalized AuditLog.');
  console.log('City Pharma LIMS seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
