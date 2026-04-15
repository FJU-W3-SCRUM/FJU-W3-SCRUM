export type ImportCsvRow = {
  student_no: string;
  name: string;
};

export type ImportValidationError = {
  line: number;
  error: string;
};

export type DuplicateDetail = {
  row: number;
  student_no: string;
};

export type AccountInsert = {
  student_no: string;
  name: string;
  email: string;
  password_hash: string;
  role: "student";
  status: "active";
  class_id: number;
};

export type ExistingAccountRow = {
  student_no: string;
};
