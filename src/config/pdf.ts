// ──────────────────────────────────────────────────────────────────────────────
// Configuration du positionnement dans le PDF template
//
// Toutes les valeurs sont en points PDF (1 pt = 1/72 inch).
// Origine : bas-gauche de la page (convention pdf-lib).
//
// Pour adapter ces constantes à votre template :
//   1. Ouvrez le PDF template dans un viewer qui affiche les coordonnées (ex: Adobe Acrobat)
//   2. Positionnez-vous sur la première ligne du tableau et notez le Y
//   3. Positionnez-vous sur la dernière ligne autorisée et notez le Y_MIN
//   4. Notez la position X de chaque colonne (bord gauche du texte)
// ──────────────────────────────────────────────────────────────────────────────

export const PDF_CONFIG = {
  // ── Tableau ────────────────────────────────────────────────────────────────
  /** Y (en points) de la PREMIÈRE ligne de données du tableau, depuis le bas */
  TABLE_TOP_Y: 601.5,
  /** Y (en points) en dessous duquel on ne doit plus écrire (bas du tableau) */
  TABLE_BOTTOM_Y: 90,
  /** Espacement vertical entre deux lignes (en points) */
  ROW_HEIGHT: 15,

  // ── Colonnes (position X depuis le bord gauche de la page) ────────────────
  COLUMNS: {
    date:     { x:  45, label: "Date" },
    from:     { x: 108, label: "Départ" },
    to:       { x: 221, label: "Arrivée" },
    // Motifs de déplacement (colonnes à cocher dans le template)
    domicile_travail:    { x: 355, label: "Domicile / travail > 20kms" },
    cours_prestation:    { x: 407, label: "Au cours de la prestation" },
    entre_prestations:   { x: 459, label: "Entre deux prestations" },
    distance: { x: 500, label: "Nb de kms à indemniser" },
    note:     { x: 560, label: "Note" },
  },

  // ── Typographie ───────────────────────────────────────────────────────────
  FONT_SIZE: 8,

  // ── Numéro de page ────────────────────────────────────────────────────────
  /** Position X du coin gauche de la zone "numéro de page" (bas à droite du template) */
  PAGE_NUMBER_X: 530,
  /** Position Y (bas) de la zone numéro de page */
  PAGE_NUMBER_Y: 15,
  PAGE_NUMBER_FONT_SIZE: 9,
  /** Largeur de la zone blanche à effacer avant réécriture */
  PAGE_NUMBER_ERASE_W: 55,
  /** Hauteur de la zone blanche à effacer */
  PAGE_NUMBER_ERASE_H: 20,

  // ── Signature PNG (dernière page, bas-gauche) ────────────────────────────
  /** Position X (bord gauche) de la signature */
  SIGNATURE_X: 42,
  /** Position Y (bas) de la signature */
  SIGNATURE_Y: 46,
  /** Largeur maximale de la signature (en points) */
  SIGNATURE_MAX_W: 80,
  /** Hauteur maximale de la signature (en points) */
  SIGNATURE_MAX_H: 30,

  // ── En-tête du template (Nom prénom + Mois/Année) ────────────────────────
  /** Position X où écrire le nom/prénom du salarié (après les pointillés) */
  HEADER_NAME_X: 279,
  /** Position Y de la ligne "Nom / prénom du salarié" */
  HEADER_NAME_Y: 778,
  /** Position X où écrire le mois et l'année */
  HEADER_MONTH_X: 259,
  /** Position Y de la ligne "MOIS / ANNEE" */
  HEADER_MONTH_Y: 760,
  /** Taille de police pour l'en-tête */
  HEADER_FONT_SIZE: 11,
  /** Largeur de la zone blanche pour effacer les pointillés avant écriture */
  HEADER_ERASE_W: 240,
  /** Hauteur de la zone blanche */
  HEADER_ERASE_H: 14,
} as const;
