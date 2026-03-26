export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nouvelle fonctionnalité (MINOR)
        'fix',      // Correction de bug (PATCH)
        'perf',     // Amélioration de performance (PATCH)
        'revert',   // Annulation d'un commit (PATCH)
        'docs',     // Documentation uniquement
        'style',    // Formatage, lint
        'refactor', // Refactoring sans changement fonctionnel
        'test',     // Ajout/modification de tests
        'build',    // Build system, dépendances
        'ci',       // Configuration CI/CD
        'chore',    // Tâches diverses
      ],
    ],
  },
};
