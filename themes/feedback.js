/* ==========================================================================
   THÈME : Donner un feedback efficace
   Un thème = un fichier de contenu. Le moteur (index.html, animateur.html)
   ne change jamais : on remplace seulement ce fichier pour un autre sujet.
   ========================================================================== */
window.THEMES = window.THEMES || {};
window.THEMES.feedback = {
  id: 'feedback',
  titre: 'Donner un feedback efficace',
  duree: '4 min',

  /* Échelles de réponse (valeurs stockées : 1 à 4) */
  echelles: {
    frequence: ['Rarement', 'Parfois', 'Souvent', 'Presque toujours'],
    accord:    ['Pas du tout', 'Plutôt pas', 'Plutôt oui', 'Tout à fait'],
    intention: ['Pas prévu', 'Peut-être', 'Probablement', 'Oui, c’est prévu']
  },

  /* Textes d'accueil et de résultat, par phase */
  phases: {
    avant: {
      badge: 'Avant la séquence',
      titre: 'Donner un feedback : où en êtes-vous vraiment ?',
      texte: 'Treize questions rapides pour faire le point sur vos réflexes. Pas de note, pas de classement : l’objectif est de rendre visible ce que vous faites déjà, et ce qui vous intrigue.',
      merci: 'Voici votre point de départ.'
    },
    apres: {
      badge: 'Après la séquence',
      titre: 'Qu’est-ce qui a bougé ?',
      texte: 'Les mêmes questions, une dernière fois, pour mesurer votre progression. Vous repartirez avec votre fiche personnelle.',
      merci: 'Voici votre progression.'
    }
  },

  /* Blocs de questions, dans l'ordre */
  blocs: [
    { id: 'pratiques',   titre: 'Mes pratiques',
      intro:      'Pensez à vos dernières semaines : à quelle fréquence cela vous arrive-t-il ?',
      introApres: 'Projetez-vous maintenant : que comptez-vous faire dans les deux semaines qui viennent ?' },
    { id: 'situations',  titre: 'Situations',
      intro:      'Choisissez la réponse qui vous paraît la plus utile. Il n’y a pas de piège : c’est votre intuition qui nous intéresse.',
      introApres: 'Mêmes situations. Votre regard a-t-il changé ?' },
    { id: 'idees',       titre: 'Idées reçues',
      intro:      'Plutôt vrai, plutôt faux, ou « je ne sais pas » : tous les choix sont légitimes.',
      introApres: 'Mêmes affirmations : qu’en pensez-vous maintenant ?' },
    { id: 'confiance',   titre: 'Ma confiance',
      intro:      'Dernières questions : comment vous sentez-vous face à ces situations ?',
      introApres: 'Dernières questions : comment vous sentez-vous maintenant ?' }
  ],

  /* Questions (les identifiants servent à apparier l'avant et l'après) */
  questions: [
    /* --- Pratiques : fréquence avant, intention après --- */
    { id: 'p1', bloc: 'pratiques', dim: 'pratiques', type: 'echelle', echelle: 'frequence', echelleApres: 'intention',
      court: 'Retour rapide',
      texte: 'Je donne un retour dans les 24 heures qui suivent une situation que j’ai observée.',
      texteApres: 'Dans les deux prochaines semaines, je donnerai un retour dans les 24 heures qui suivent une situation observée.' },
    { id: 'p2', bloc: 'pratiques', dim: 'pratiques', type: 'echelle', echelle: 'frequence', echelleApres: 'intention',
      court: 'Appui sur des faits',
      texte: 'Mon retour s’appuie sur des faits observés (ce que j’ai vu ou entendu), pas sur mon interprétation.',
      texteApres: 'Dans les deux prochaines semaines, mon retour s’appuiera sur des faits observés, pas sur mon interprétation.' },
    { id: 'p3', bloc: 'pratiques', dim: 'pratiques', type: 'echelle', echelle: 'frequence', echelleApres: 'intention',
      court: 'Valoriser ce qui marche',
      texte: 'Je souligne précisément ce qui a bien fonctionné, pas seulement ce qui est à corriger.',
      texteApres: 'Dans les deux prochaines semaines, je soulignerai précisément ce qui a bien fonctionné, pas seulement ce qui est à corriger.' },
    { id: 'p4', bloc: 'pratiques', dim: 'pratiques', type: 'echelle', echelle: 'frequence', echelleApres: 'intention',
      court: 'Dialogue et suite',
      texte: 'Après mon retour, j’invite la personne à donner son point de vue et nous convenons d’une suite.',
      texteApres: 'Dans les deux prochaines semaines, j’inviterai la personne à donner son point de vue et nous conviendrons d’une suite.' },

    /* --- Situations : une bonne réponse, explication dévoilée à la fin --- */
    { id: 's1', bloc: 'situations', dim: 'connaissances', type: 'qcm', court: 'Faits ou jugement',
      contexte: 'Un collaborateur est arrivé en retard à trois réunions d’équipe de suite. Vous souhaitez lui en parler.',
      texte: 'Quelle formulation est la plus utile pour démarrer ?',
      options: [
        { id: 'a', texte: '« Tu n’es vraiment pas fiable. »' },
        { id: 'b', texte: '« Tu as l’air de te moquer de l’équipe. »' },
        { id: 'c', texte: '« Lors des trois dernières réunions, tu es arrivé entre 10 et 15 minutes après le début. »' },
        { id: 'd', texte: '« Il faudrait que tu fasses un effort sur la ponctualité. »' }
      ],
      bonne: 'c',
      explication: 'Un fait observable ne se discute pas : la personne peut y réagir sans se défendre. Un jugement (« pas fiable ») ou une intention supposée (« se moquer ») attaque la personne, et une formule vague (« faire un effort ») ne dit pas quoi changer.' },

    { id: 's2', bloc: 'situations', dim: 'connaissances', type: 'qcm', court: 'Situation, comportement, impact',
      contexte: 'Hier, un animateur a présenté une consigne de sécurité à son équipe. Vous avez observé la scène.',
      texte: 'Quelle phrase contient à la fois la situation, le comportement observé et son impact ?',
      options: [
        { id: 'a', texte: '« Ta présentation était brouillonne : il faut être plus clair. »' },
        { id: 'b', texte: '« Hier, pendant la consigne de sécurité, tu as lu tes diapositives sans regarder l’équipe ; plusieurs personnes ont décroché et je crains que le message ne passe pas. »' },
        { id: 'c', texte: '« Tu devrais travailler ta posture, c’est important pour ta crédibilité. »' },
        { id: 'd', texte: '« Plusieurs personnes m’ont dit que ce n’était pas terrible. »' }
      ],
      bonne: 'b',
      explication: 'Le trio Situation – Comportement – Impact dit quand, quoi, et avec quel effet. Les autres phrases restent sur un jugement, un conseil général ou un ouï-dire.' },

    { id: 's3', bloc: 'situations', dim: 'connaissances', type: 'qcm', court: 'Le bon moment',
      contexte: 'Un opérateur a mal appliqué une procédure hier, devant plusieurs collègues. Il n’y a plus de danger immédiat.',
      texte: 'Comment faire un retour correctif ?',
      options: [
        { id: 'a', texte: 'Sur le moment, devant tout le monde, pour que cela serve d’exemple.' },
        { id: 'b', texte: 'Attendre l’entretien annuel pour regrouper tous les points.' },
        { id: 'c', texte: 'Par message écrit, sans en parler de vive voix.' },
        { id: 'd', texte: 'Peu après, en tête-à-tête, dans un moment calme.' }
      ],
      bonne: 'd',
      explication: 'Un retour proche de la situation reste précis, et en tête-à-tête la personne peut l’entendre sans perdre la face. Attendre trop longtemps le rend flou, l’écrit seul prive du dialogue. (En cas de danger immédiat, on intervient tout de suite.)' },

    { id: 's4', bloc: 'situations', dim: 'connaissances', type: 'qcm', court: 'Un compliment utile',
      contexte: 'Une collègue vient de très bien gérer un client mécontent. Vous voulez qu’elle reproduise cette façon de faire.',
      texte: 'Quel retour l’y aidera le mieux ?',
      options: [
        { id: 'a', texte: '« Tu as reformulé la demande du client avant de répondre, et il s’est calmé : continue comme ça. »' },
        { id: 'b', texte: '« Bravo, super boulot ! »' },
        { id: 'c', texte: '« Tu es une pro, ça se voit. »' },
        { id: 'd', texte: '« Pas mal, mais tu peux encore mieux faire. »' }
      ],
      bonne: 'a',
      explication: 'Un compliment précis dit ce qui a marché et pourquoi : la personne sait quoi reproduire. « Bravo » fait plaisir mais n’apprend rien, « tu es une pro » parle de la personne plutôt que du geste, et la dernière phrase retire ce qu’elle vient d’offrir.' },

    { id: 's5', bloc: 'situations', dim: 'connaissances', type: 'qcm', court: 'Quand la personne réagit',
      contexte: 'Vous venez de donner votre retour. La personne répond, agacée : « Ce n’est pas du tout comme ça que ça s’est passé ! »',
      texte: 'Quelle est la meilleure réaction ?',
      options: [
        { id: 'a', texte: 'Répéter votre version en insistant, pour qu’elle comprenne.' },
        { id: 'b', texte: 'Retirer votre retour pour éviter le conflit.' },
        { id: 'c', texte: 'Écouter sa version avec une question ouverte, puis revenir aux faits observés et convenir d’une suite.' },
        { id: 'd', texte: 'Clore l’échange et en parler à sa hiérarchie.' }
      ],
      bonne: 'c',
      explication: 'Un feedback est un dialogue, pas un verdict. En écoutant, vous apprenez ce que vous ne voyiez pas ; en revenant aux faits, vous gardez votre message. Insister ferme l’échange, renoncer perd le message, escalader abîme la confiance.' },

    /* --- Idées reçues : plutôt vrai / plutôt faux / je ne sais pas --- */
    { id: 'i1', bloc: 'idees', dim: 'connaissances', type: 'vraifaux', court: 'Le « sandwich »',
      texte: 'Pour bien faire passer une critique, il faut toujours l’encadrer par deux compliments.',
      options: [ { id: 'v', texte: 'Plutôt vrai' }, { id: 'f', texte: 'Plutôt faux' }, { id: 'n', texte: 'Je ne sais pas' } ],
      bonne: 'f',
      explication: 'Plutôt faux. Appliqué mécaniquement, le « sandwich » brouille le message : on se méfie des compliments et l’on retient mal la critique. Mieux vaut un retour clair, précis et sincère, qu’il soit positif ou correctif.' },

    { id: 'i2', bloc: 'idees', dim: 'connaissances', type: 'vraifaux', court: 'Entre collègues',
      texte: 'On peut donner un retour utile sans être le supérieur hiérarchique de la personne.',
      options: [ { id: 'v', texte: 'Plutôt vrai' }, { id: 'f', texte: 'Plutôt faux' }, { id: 'n', texte: 'Je ne sais pas' } ],
      bonne: 'v',
      explication: 'Plutôt vrai. Un retour entre pairs, ou venu d’un autre service, est précieux dès qu’il s’appuie sur des faits observés et qu’il est proposé comme un éclairage, pas comme un ordre.' },

    /* --- Confiance --- */
    { id: 'c1', bloc: 'confiance', dim: 'confiance', type: 'echelle', echelle: 'accord', court: 'Retour difficile',
      texte: 'Je me sens capable de formuler un retour difficile sans mettre la personne sur la défensive.' },
    { id: 'c2', bloc: 'confiance', dim: 'confiance', type: 'echelle', echelle: 'accord', court: 'Compliment précis',
      texte: 'Je me sens capable de formuler un compliment précis qui donne envie de recommencer.' }
  ],

  /* Questions supplémentaires, uniquement après la séquence */
  extras: [
    { id: 'x1', bloc: 'bilan', dim: 'satisfaction', type: 'echelle', echelle: 'accord', court: 'Utilité',
      texte: 'Cette séquence m’a été utile.' },
    { id: 'x2', bloc: 'bilan', dim: 'satisfaction', type: 'echelle', echelle: 'accord', court: 'Applicable',
      texte: 'Je peux appliquer ce que j’ai vu dès cette semaine.' },
    { id: 'x3', bloc: 'bilan', dim: 'engagement', type: 'texte', court: 'Premier pas', facultatif: true,
      texte: 'Mon premier pas concret, d’ici deux semaines (facultatif)',
      placeholder: 'Par exemple : donner un retour précis à un collègue dès lundi.' }
  ],
  blocBilan: { id: 'bilan', titre: 'Mon bilan', intro: 'Pour finir, deux questions sur la séquence et un engagement.' }
};
