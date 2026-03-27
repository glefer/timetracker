/** Fiche de pointage */
export type Timesheet = {
  id: number;
  name: string;
  /** ISO date "YYYY-MM-DD" — déduit du MIN des lignes de pointage */
  period_from: string | null;
  /** ISO date "YYYY-MM-DD" — déduit du MAX des lignes de pointage */
  period_to: string | null;
  created_at: string;
};

export type TimesheetInput = Pick<Timesheet, "name">;

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
