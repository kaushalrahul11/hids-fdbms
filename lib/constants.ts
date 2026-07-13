export const DESIGNATIONS = [
  "Tutor",
  "Lecturer",
  "Reader",
  "Professor",
  "Professor & Head",
  "Principal",
] as const;

export const HISTORY_POSITIONS = [
  "Tutor",
  "Lecturer",
  "Reader",
  "Professor",
  "Professor & Head",
  "Principal",
] as const;

export const GENDERS = ["Male", "Female", "Other"] as const;

export const SOCIAL_CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman & Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export const QUALIFICATION_TYPES = ["BDS/UG", "MDS/PG", "Other"] as const;

export const PUBLICATION_TYPES = [
  "Original Research Article",
  "Case Report",
  "Review Article",
  "Case Series",
  "Short Communication",
  "Letter to Editor",
  "Book Chapter",
  "Other",
] as const;

export const AUTHOR_POSITIONS = [
  "1st Author",
  "2nd Author",
  "3rd Author",
  "4th Author",
  "Corresponding Author",
  "Co-Author",
] as const;

export const STATUSES = ["active", "resigned", "relieved", "on_hold", "inactive"] as const;

export const DOCUMENT_TYPES = [
  "PAN Card Copy",
  "Aadhaar Card Copy",
  "Photograph",
  "SDC Registration Certificate",
  "BDS/UG Degree Certificate",
  "MDS/PG Degree Certificate",
  "10th Certificate",
  "Last College Appointment Letter",
  "Last College Relieving Letter",
] as const;

export const PUBLICATION_CATEGORIES = ["Category I", "Category II", "Category III", "Category IV", "Category V"] as const;

export const HIDS_PRINCIPAL_NAME = "Dr. Rajan Gupta";

// Fields faculty can submit an edit request for (subject to admin approval).
// Designation, department, appointment/employment history, and qualifications
// stay admin-only since they affect promotion eligibility and official records.
export const FACULTY_EDITABLE_FIELDS = [
  "full_name", "father_name", "husband_name", "date_of_birth", "gender", "social_category",
  "present_address_line1", "present_address_line2", "present_state", "present_district", "present_pincode",
  "permanent_address_line1", "permanent_address_line2", "permanent_state", "permanent_district", "permanent_pincode",
  "mobile_no", "pan_no", "aadhaar_no",
  "sdc_reg_no", "sdc_valid_upto", "dci_bio_reg_no", "state_dental_council",
  "bank_name", "bank_account_holder_name", "bank_account_number", "bank_ifsc_code", "bank_branch_name",
] as const;

export const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name", father_name: "Father's Name", husband_name: "Husband's Name",
  date_of_birth: "Date of Birth", gender: "Gender", social_category: "Social Category",
  present_address_line1: "Present Address Line 1", present_address_line2: "Present Address Line 2",
  present_state: "Present State", present_district: "Present District", present_pincode: "Present PIN Code",
  permanent_address_line1: "Permanent Address Line 1", permanent_address_line2: "Permanent Address Line 2",
  permanent_state: "Permanent State", permanent_district: "Permanent District", permanent_pincode: "Permanent PIN Code",
  mobile_no: "Mobile Number", pan_no: "PAN Number", aadhaar_no: "Aadhaar Number",
  sdc_reg_no: "SDC Registration No.", sdc_valid_upto: "SDC Valid Upto", dci_bio_reg_no: "DCI Bio-metric Reg No.",
  state_dental_council: "State Dental Council",
  bank_name: "Bank Name", bank_account_holder_name: "Account Holder Name", bank_account_number: "Account Number",
  bank_ifsc_code: "IFSC Code", bank_branch_name: "Branch Name",
};

export const OTHER = "Other (specify)";
