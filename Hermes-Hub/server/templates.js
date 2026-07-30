/**
 * The 6 standard project files. Kept byte-for-byte in step with the ones
 * Nouveau-Projet.ps1 writes, so a project created from the Hub and a project
 * created from the desktop shortcut are indistinguishable.
 */

export function projectFiles(name, objective) {
  const obj = objective || '(a preciser avec Hermes)'

  return {
    '.hermes.md': `# ${name}

## Identite
${obj}

## PREMIERE ACTION OBLIGATOIRE (a effacer apres validation du plan)
Des le premier message de l'utilisateur (peu importe ce qu'il dit: bonjour, salut, j'ai un projet, etc.):
1. Si BRIEF.md existe et a deja ete rempli : lire le brief, saluer l'utilisateur par son prenom si present, et continuer directement sans reposer la question du plan.
2. Sinon, repondre: "Bienvenue dans ton projet ${name}."
3. Si l'utilisateur n'a pas encore parle d'idee ou de plan, poser: "As-tu deja une idee ou un plan ? Veux-tu qu'on le construise ensemble ?"
4. Si pas d'idee: questions guidees (stack, pourquoi, comment, pour qui)
5. Si idee existe: la peaufiner ensemble
6. Demander si profil isole souhaite (memoire separee)
7. Proposer des exemples si demande
8. Une fois valide, ecrire dans plan.md
9. EFFACER cette section du .hermes.md (pour ne plus reposer la question)
10. Seulement APRES, commencer a coder

## Regles
- Tester avant de dire fini
- Review visuelle + code par jalon
- REPRISE.md apres chaque jalon
- ADM.md pour les decisions (cumulatif, jamais effacer)
`,

    'BRIEF.md': `# ${name} - BRIEF

## Description
${obj}

## Phase actuelle
Demarrage

## Voir aussi
- REPRISE.md pour l'avancement
- plan.md pour le plan complet
- ADM.md pour les decisions
`,

    'plan.md': `# ${name} - Plan

## Phases
(a definir avec Hermes au demarrage)
`,

    'REPRISE.md': `# ${name} - REPRISE

## Dernier jalon
(a remplir apres le premier jalon)

## Prochaine etape
-
`,

    'done.md': `# ${name} - Done

## Historique
(a remplir au fur et a mesure)
`,

    'ADM.md': `# ${name} - ADM

## Decisions (cumulatif, ne jamais effacer)

### Demarrage
- Creation du projet: ${obj}
`,
  }
}

const NOTE_TYPES = {
  Lessons: 'lesson',
  Skills: 'skill',
  Decisions: 'decision',
  Bugs: 'bug',
  Projets: 'project',
  Changelog: 'changelog',
}

const NOTE_BODIES = {
  lesson: '## Description\n\n## Solution\n\n## Erreur(s) faite(s)\n\n## Liens\n- \n',
  skill: "## Competence acquise\n\n## Comment on l'a apprise\n\n## Exemple d'utilisation\n\n## Liens\n- \n",
  decision: '## Contexte\n\n## Decision prise\n\n## Raison\n\n## Alternatives envisagees\n\n## Liens\n- \n',
  bug: '## Description du bug\n\n## Cause racine\n\n## Solution appliquee\n\n## Prevention\n\n## Liens\n- \n',
  project: '## Objectif\n\n## Stack technique\n\n## Phases / jalons\n- [ ] Phase 1: \n\n## Liens\n- \n',
  changelog: '## Obsolete\n-\n\n## Nouveau\n-\n\n## A verifier\n-\n',
}

/** Vault note with the same YAML front matter as the installer's templates. */
export function vaultNote(folder, title, body) {
  const type = NOTE_TYPES[folder] || 'note'
  const date = new Date().toISOString().slice(0, 10)
  const front = [
    '---',
    `type: ${type}`,
    `date: ${date}`,
    'project: ',
    'tags: []',
    'status: active',
    'source: hermes-hub',
    'obsolescence: none',
    `verified_date: ${date}`,
    '---',
    '',
  ].join('\n')

  return `${front}# ${title}\n\n${body || NOTE_BODIES[type] || ''}`
}
