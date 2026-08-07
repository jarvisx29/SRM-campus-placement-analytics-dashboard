export interface StudentRow {
  registerNo: string;
  studentName: string;
  category: string;
  class: string;
  placed: string;
  offerType: string;
  offer1: string;
  offer2: string;
  offer3: string;
  offer4: string;
  offer5: string;
  offer6: string;
  mentor: string;
  tenth: string;
  twelfth: string;
  cgpa: string;
  backlogs: string;
  gender: string;
  dob: string;
  resumeLink: string;
  officialMail: string;
  personalMail: string;
  phone: string;
}

export interface HavlocRow {
  sno: string;
  name: string;
  rollNumber: string;
  branch: string;
  absentCount: string;
  appliedCount: string;
  eligibleJobCount: string;
  eligibleNotAppliedCount: string;
  screening: string;
  others: string;
  technicalInterview: string;
  groupDiscussion: string;
  technicalHrInterview: string;
  test: string;
  applicationScreening: string;
  prePlacementTalk: string;
  managerInterview1: string;
  hrInterview1: string;
  managerInterview2: string;
  hrInterview2: string;
}

export interface Summary {
  totalStudents: number;
  placed: number;
  higherStudies: number;
  placementCount: number;
  notPlaced: number;
  notEligible: number;
  rfPlacement: number;
  totalOffers: number;
}

export interface OfferTypeCounts {
  Dream: number;
  "Super Dream": number;
  Marquee: number;
  Normal: number;
}

export interface DashboardData {
  summary: Summary;
  offerTypeCounts: OfferTypeCounts;
  mentors: string[];
  categories: string[];
  departments: string[];
  students: StudentRow[];
}
