/** Fiche de pointage */
export type Timesheet = {
  id: number;
  name: string;
  /** ISO date "YYYY-MM-DD" */
  period_from: string;
  /** ISO date "YYYY-MM-DD" */
  period_to: string;
  created_at: string;
};

export type TimesheetInput = Omit<Timesheet, "id" | "created_at">;

/** Ligne de pointage rattachée à une fiche */
export type TimesheetEntry = {
  id: number;
  timesheet_id: number;
  /** ISO date "YYYY-MM-DD" */
  date: string;
  from_address_id: number;
  to_address_id: number;
  /** Distance in kilometres */
  distance_km: number;
  note: string;
  /**
   * Motifs de déplacement cochés.
   * Valeurs possibles : "domicile_travail" | "cours_prestation" | "entre_prestations"
   * Stocké en BDD comme JSON array, ex: '["domicile_travail"]'
   */
  motifs: string[];
};

export type TimesheetEntryInput = Omit<TimesheetEntry, "id">;
