# Kit d'évaluation avant / après : thème « Donner un feedback efficace »

Une mini-évaluation de 4 minutes, passée **avant** puis **après** une séquence de formation, pour susciter la curiosité (approche ARCS), mesurer la progression et garder une trace. Aucun compte ni application pour les participants : ils scannent un QR code avec leur téléphone.

```
Participant ── QR « Avant » / « Après » ──► index.html (GitHub Pages)
                                                │ envoi des réponses
                                                ▼
                                   Google Apps Script ──► Google Sheet (une feuille par thème)
                                                ▲
Animateur ── animateur.html ────────────────────┘ lecture protégée par une clé
```

## Ce que voient les participants
- **Avant** : 13 questions, une par écran, sans note. Ils obtiennent un « point de départ » (pratiques, confiance). Les connaissances restent **verrouillées** : la curiosité est entretenue jusqu'à la fin.
- **Après** : les mêmes questions (les pratiques deviennent des intentions), plus un bilan et un premier pas concret. Ils découvrent leur **progression**, les bonnes réponses expliquées et téléchargent leur **fiche personnelle en PDF**.
- Leurs réponses « avant » restent **sur leur appareil** : la fiche avant/après se construit sans lire le Google Sheet. Ils doivent donc répondre « après » avec le même appareil et le même navigateur.

## Ce que voit l'animateur (animateur.html)
| Onglet | Contenu |
|---|---|
| **Accès** | Deux QR codes (avant, après), projetables en plein écran, avec nom de groupe |
| **En direct** | Compteurs, profil collectif des pratiques et de la confiance, réponses aux situations avec **bouton « Révéler les bonnes réponses »** |
| **Avant → Après** | Moyennes, participants en progression, bonnes réponses par situation, premiers pas annoncés |
| **Participants** | Détail individuel, suppression de participants ou d'un groupe (déplacés vers une feuille « Corbeille ») |

Exports : **synthèse PDF** (traçabilité du groupe) et **CSV**. Un lien **« démonstration »** affiche le tableau de bord avec 14 participants fictifs, sans rien configurer : utile pour répéter.

## Mise en place (environ 15 minutes)

### 1. Créer le Google Sheet et coller le script
1. Créez un Google Sheet (par exemple « Évaluation avant-après »), puis **Extensions > Apps Script**.
2. Remplacez le contenu de l'éditeur par `apps-script/Code.gs`.
3. **Changez la clé** : `const CLE_ANIMATEUR = 'CHANGEZ-MOI';` (c'est le mot de passe de l'espace animateur).
4. Sélectionnez la fonction `initialiser`, cliquez sur **Exécuter** et acceptez les autorisations.

### 2. Déployer le script
**Déployer > Nouveau déploiement > Application Web** · *Exécuter en tant que* : **Moi** · *Qui a accès* : **Tout le monde**. Copiez l'URL (elle se termine par `/exec`).

> Après toute modification du script : **Déployer > Gérer les déploiements > crayon > Nouvelle version**.

### 3. Renseigner l'adresse
Dans `config.js`, remplacez `COLLER_ICI_L_URL_DU_SCRIPT_GOOGLE` par l'URL copiée.

### 4. Publier sur GitHub Pages
Créez un dépôt public, déposez **tous les fichiers et dossiers** du kit à la racine, puis **Settings > Pages** : *Deploy from a branch*, branche `main`, dossier `/ (root)`. Le site est en ligne au bout d'une minute : `https://VOTRE-COMPTE.github.io/NOM-DU-DEPOT/`.

### 5. Tester
1. Ouvrez `.../animateur.html`, saisissez la clé, onglet **Accès**, nom de groupe, puis projetez le QR code.
2. Répondez « avant » depuis votre téléphone, puis « après » : vérifiez la fiche PDF, la ligne dans le Google Sheet et le tableau de bord.
3. Dans l'onglet **Participants**, utilisez **Réinitialiser ce groupe** pour repartir de zéro avant la vraie séance.

## Déroulé conseillé pour la démonstration « vitrine puis coulisses »
1. **Avant** (4 min) : QR « Avant ». Projetez l'onglet **En direct** : le profil collectif surprend. Laissez les bonnes réponses masquées.
2. **Séquence express** (10 à 15 min) sur les quatre messages que mesurent les questions : faits plutôt que jugements ; Situation – Comportement – Impact ; moment et cadre (rapidement, en tête-à-tête) ; dialogue et suite. Les questions ne mesurent la progression que si elles portent sur ce que vous enseignez réellement.
3. **Après** (4 min) : QR « Après ». Chacun télécharge sa fiche.
4. **Débrief** : onglet **Avant → Après**, puis « Révéler les bonnes réponses » dans **En direct**. Enchaînez sur les coulisses : l'alignement évaluation / contenu, la grille ARCS, la construction d'un thème.

## Créer un autre thème
Tout le contenu se trouve dans **un seul fichier** : `themes/feedback.js` (questions, options, bonne réponse, explication, échelles, textes). Pour un autre sujet : copiez-le sous un nouveau nom (par exemple `themes/onboarding.js`), changez `id`, les textes et les questions, puis utilisez `?t=onboarding` dans les adresses (ou mettez le nom dans `THEME` de `config.js`). Le moteur, le script Google et les exports ne changent pas : une feuille « Réponses_onboarding » est créée automatiquement.

Types de questions disponibles : `echelle` (4 niveaux), `qcm` (une bonne réponse), `vraifaux` (plutôt vrai / plutôt faux / je ne sais pas), `texte` (réponse libre).

## Bon à savoir
- **Données personnelles** : seuls le prénom, le groupe et les réponses sont collectés. Pour un usage en entreprise, vérifiez l'hébergement avec le DPO : les données sont dans le compte Google de l'animateur.
- **Qui peut répondre** : toute personne connaissant l'adresse. La lecture des résultats exige la clé animateur, à ne jamais mettre dans `config.js`.
- **Mode test** : tant que `config.js` ne contient pas l'URL du script, le questionnaire fonctionne mais n'envoie rien (bandeau « Mode test »).
- **Suppression** : les lignes supprimées sont copiées dans la feuille « Corbeille_<thème> » du Google Sheet ; elles restent récupérables.
- **Navigation privée / changement d'appareil** : la fiche avant/après n'est alors pas reconstituable (la fiche « après » seule reste disponible).

## En cas de problème
| Symptôme | Piste |
|---|---|
| « Accès refusé ou script injoignable » | Vérifier l'URL (fin en `/exec`), le déploiement « Tout le monde » et la clé |
| Les réponses n'arrivent pas dans le Sheet | Redéployer une **nouvelle version** après toute modification du script |
| Le QR code mène à une page introuvable (404) | Vérifier que `index.html` est à la racine du dépôt et que Pages est activé |
| « Test avant non retrouvé sur cet appareil » | Le participant a changé d'appareil ou de navigateur entre l'avant et l'après |
