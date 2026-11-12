export const departments = {
  science: ['ENG','MTH','PHY','CHM','BIO','GEO','AGR','ECO','ICT'],
  commercial: ['ENG','MTH','ECO','COM','ACC','GOV','GEO','ICT'],
  arts: ['ENG','MTH','LIT','GOV','CRS','IRS','HIS','FRE','YOR','IGB','HAU','ECO','GEO'],
} as const;
export type Department=keyof typeof departments;
export type StudyJourney={examBody:string;department:Department;subjects:string[]};
export const subjectNames:Record<string,string>={ENG:'Use of English',MTH:'Mathematics',PHY:'Physics',CHM:'Chemistry',BIO:'Biology',GEO:'Geography',AGR:'Agricultural Science',ECO:'Economics',COM:'Commerce',ACC:'Accounting',GOV:'Government',LIT:'Literature',CRS:'Christian Religious Studies',IRS:'Islamic Religious Studies',HIS:'History',FRE:'French',YOR:'Yoruba',IGB:'Igbo',HAU:'Hausa',ICT:'Computer Studies'};
