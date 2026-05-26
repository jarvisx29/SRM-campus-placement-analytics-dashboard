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
  mentorId: string;
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
  students: StudentRow[];
}
