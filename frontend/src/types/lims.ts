export type Role = 'ADMIN' | 'QA_MANAGER' | 'QC_ANALYST' | 'LAB_TECHNICIAN' | 'AUDITOR';

export type SampleStatus =
  | 'RECEIVED'
  | 'LOGGED'
  | 'ASSIGNED'
  | 'TESTING_IN_PROGRESS'
  | 'REVIEW_PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export type Priority = 'ROUTINE' | 'URGENT' | 'STAT';

export type LaboratoryType = 'GENERAL';

export type LaboratoryAccess = 'GENERAL' | 'ALL';

export function getUserLabAccess(
  _user: { role?: string; department?: string; email?: string; username?: string } | null | undefined
): LaboratoryAccess {
  return 'GENERAL';
}

export const SEMI_BASICS_STAGES = [
  'Bulk / Blended Product',
  'Core Tablet',
  'Granulation / Blend',
  'In-Process Semi-Finished',
  'Raw Water',
  'Purified Water',
  'Distilled Water',
  'Cleaning Validation Sample',
  'Raw Material',
  'Other',
] as const;

export const SEMI_BASE_STAGES = SEMI_BASICS_STAGES;

export const FORMULATION_STAGES = [
  'Finished Product',
  'Coated Product',
  'Filled Product',
  'Finished Formulation',
  'Process Validation Sample',
  'Packaging Material',
  'Stability Sample',
  'Other',
] as const;

export const SAMPLE_STAGES = [
  'Bulk / Blended Product',
  'Core Tablet',
  'Filled Product',
  'Coated Product',
  'Finished Product',
  'Cleaning Validation Sample',
  'Process Validation Sample',
  'Raw Water',
  'Purified Water',
  'Distilled Water',
  'Other',
] as const;

export type SampleStage = typeof SAMPLE_STAGES[number];
export type SemiBasicsStage = typeof SEMI_BASICS_STAGES[number];
export type SemiBaseStage = SemiBasicsStage;
export type FormulationStage = typeof FORMULATION_STAGES[number];
export type LabSection = 'semi-base' | 'formulation';

export function getSampleSection(sample: {
  stageType?: string | null;
  sampleType?: string | null;
  remarks?: string | null;
}): LabSection {
  const stage = (sample.stageType || '').toLowerCase();
  const type = (sample.sampleType || '').toLowerCase();
  const remarks = (sample.remarks || '').toLowerCase();

  // Explicit tags
  if (
    stage.includes('[semi basics]') ||
    stage.includes('[semi basic]') ||
    stage.includes('[semi base]') ||
    type.includes('[semi basics]') ||
    type.includes('[semi basic]') ||
    type.includes('[semi base]') ||
    remarks.includes('[semi basics]') ||
    remarks.includes('[semi basic]') ||
    remarks.includes('[semi base]') ||
    stage.includes('semi basics') ||
    stage.includes('semi basic') ||
    stage.includes('semi base') ||
    stage.includes('semi-basics') ||
    stage.includes('semi-basic') ||
    stage.includes('semi-base')
  ) {
    return 'semi-base';
  }
  if (
    stage.includes('[formulation]') ||
    type.includes('[formulation]') ||
    remarks.includes('[formulation]') ||
    stage.includes('formulation')
  ) {
    return 'formulation';
  }

  // Semi Base classifications: Bulk, Core, Granulation, Blend, In-Process, Water, Cleaning
  if (
    stage.includes('bulk') ||
    stage.includes('core') ||
    stage.includes('blend') ||
    stage.includes('granul') ||
    stage.includes('in-process') ||
    stage.includes('water') ||
    stage.includes('cleaning') ||
    type.includes('in_process') ||
    type.includes('raw_material') ||
    type.includes('water') ||
    type.includes('environmental')
  ) {
    return 'semi-base';
  }

  // Formulation classifications: Finished, Coated, Filled, Packaging, Stability, Release
  if (
    stage.includes('finish') ||
    stage.includes('coat') ||
    stage.includes('fill') ||
    stage.includes('packag') ||
    stage.includes('stabilit') ||
    stage.includes('process validation') ||
    type.includes('finished_product') ||
    type.includes('stability')
  ) {
    return 'formulation';
  }

  // Default fallback
  return 'semi-base';
}

export type SampleType =
  | 'RAW_MATERIAL'
  | 'IN_PROCESS'
  | 'FINISHED_PRODUCT'
  | 'STABILITY'
  | 'WATER_PURIFIED'
  | 'ENVIRONMENTAL_SWAB'
  | string;

export type TestCategory =
  | 'CHEMICAL'
  | 'PHYSICAL'
  | 'MICROBIOLOGICAL'
  | 'CHROMATOGRAPHY'
  | 'STABILITY';

export type TestStatus =
  | 'PENDING'
  | 'IN_ANALYSIS'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'RETEST_REQUIRED';

export type ResultStatus =
  | 'NOT_TESTED'
  | 'WITHIN_SPEC'
  | 'OUT_OF_SPEC'
  | 'OUT_OF_TREND';

export type InstrumentStatus =
  | 'QUALIFIED'
  | 'CALIBRATION_DUE'
  | 'OUT_OF_SERVICE'
  | 'MAINTENANCE';

export type BatchStatus = 'QUARANTINE' | 'RELEASED' | 'REJECTED' | 'CONDITIONAL';

export interface User {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  employeeId: string;
  department: string;
  role: Role;
  isActive?: boolean;
}

export interface Sample {
  id: string;
  accessionNo?: string | null;
  sampleId?: string | null;
  sampleCode: string;
  barcode: string;
  materialName: string;
  nomenclature?: string | null;
  stageType?: string | null;
  sampleType: SampleType;
  batchId?: string | null;
  batch?: Batch | null;
  batchLotNumber?: string | null;
  lotNumber?: string | null;
  mfgDate?: string | null;
  expDate?: string | null;
  submittedBy?: string | null;
  sourceSupplier?: string | null;
  samplingLocation?: string | null;
  samplingDate: string;
  sampledAt?: string | null;
  sampleQty: number;
  quantity?: number | null;
  unit: string;
  quantityUnit?: string | null;
  storageCondition: string;
  priority: Priority;
  laboratory?: LaboratoryType;
  laboratoryType?: LaboratoryType | null;
  status: SampleStatus;
  chainOfCustody?: string | null;
  remarks?: string | null;
  accessionedById?: string | null;
  accessionedBy?: { id: string; fullName: string; employeeId: string; department?: string } | null;
  assignedToId?: string | null;
  assignedTo?: User | null;
  tests?: SampleTest[];
  oosIncidents?: any[];
  submissions?: SampleSubmission[];
  createdAt: string;
  updatedAt: string;
}

export type SubmissionDestination = 'MICROBIOLOGY' | 'CHEMICAL' | 'PHYSICAL';

export type SubmissionStatus =
  | 'DRAFT'
  | 'REGISTERED'
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface SampleSubmission {
  id: string;
  sampleId: string;
  sample?: Sample;
  destinationLab: SubmissionDestination;
  submittedById?: string | null;
  submittedBy?: User | null;
  submittedByName: string;
  submissionDate: string;
  status: SubmissionStatus;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TestSpecification {
  id: string;
  testCode: string;
  name: string;
  category: TestCategory;
  pharmacopeiaMethod: string;
  defaultMinLimit?: number | null;
  defaultMaxLimit?: number | null;
  defaultTarget?: number | null;
  unit?: string | null;
  procedureOverview?: string | null;
  requiresInstrument: boolean;
}

export interface SampleTest {
  id: string;
  sampleId: string;
  sample?: Sample;
  testSpecificationId: string;
  testSpecification: TestSpecification;
  instrumentId?: string | null;
  instrument?: Instrument | null;
  analystId?: string | null;
  analyst?: User | null;
  status: TestStatus;
  minLimit?: number | null;
  maxLimit?: number | null;
  targetValue?: number | null;
  unit?: string | null;
  numericResult?: number | null;
  textResult?: string | null;
  resultStatus: ResultStatus;
  testDate?: string | null;
  completedAt?: string | null;
  rawDataReference?: string | null;
  comments?: string | null;
  sampleCode?: string;
  materialName?: string;
  batchNumber?: string;
}

export interface Instrument {
  id: string;
  equipmentCode: string;
  name: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  laboratoryRoom: string;
  status: InstrumentStatus;
  lastCalibrationDate?: string | null;
  nextCalibrationDue: string;
  calibrationFrequencyDays: number;
  remarks?: string | null;
  isDueSoon?: boolean;
  isOverdue?: boolean;
  calibrationLogs?: CalibrationLog[];
  _count?: { sampleTests: number; calibrationLogs: number };
}

export interface CalibrationLog {
  id: string;
  instrumentId: string;
  calibrationDate: string;
  calibratedById?: string | null;
  calibratedBy?: User | null;
  certificateNumber: string;
  standardUsed?: string | null;
  passed: boolean;
  nextDue: string;
  remarks?: string | null;
}

export interface Batch {
  id: string;
  batchNumber: string;
  drugProduct: string;
  dosageForm: string;
  batchSize: string;
  manufacturingDate: string;
  expiryDate: string;
  status: BatchStatus;
  releaseDate?: string | null;
  releasedBy?: string | null;
  notes?: string | null;
  samples?: Sample[];
  coa?: CertificateOfAnalysis | null;
}

export interface CertificateOfAnalysis {
  id: string;
  certificateNumber: string;
  batchId: string;
  sampleId?: string | null;
  issuedDate: string;
  authorizedById: string;
  authorizedBy?: User | null;
  status: string;
  remarks?: string | null;
  signatureHash?: string | null;
}

export interface OosIncident {
  id: string;
  incidentNumber: string;
  sampleTestId: string;
  sampleTest?: SampleTest;
  sampleId: string;
  sample?: Sample;
  reportedById: string;
  reportedBy?: User;
  phaseOneStatus: string;
  labErrorConfirmed: boolean;
  rootCauseCategory?: string | null;
  phaseTwoRequired: boolean;
  capaDescription?: string | null;
  qaApprovalStatus: string;
  qaManagerId?: string | null;
  qaManager?: User | null;
  closedAt?: string | null;
  createdAt: string;
}

export interface AuditTrail {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  performedById?: string | null;
  performedByName: string;
  role: string;
  timestamp: string;
  ipAddress?: string | null;
  reasonForChange?: string | null;
  diffPayload?: string | null;
  performedBy?: User | null;
}
