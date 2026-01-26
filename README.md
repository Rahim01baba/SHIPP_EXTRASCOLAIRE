# SHIPP Éducation

Plateforme de coordination transport et activités extrascolaires le samedi.

## Vue d'ensemble

SHIPP Éducation est une plateforme transactionnelle qui organise le transport extrascolaire le samedi et l'accès à des activités proposées par des centres partenaires. La plateforme gère les paiements centralisés, la facturation transparente et le pilotage financier complet.

**Note importante** : SHIPP Éducation n'est pas un centre éducatif. Les cours sont dispensés par des centres partenaires indépendants. SHIPP Éducation coordonne, tarifie, encaisse et organise le transport.

## Fonctionnalités principales

### Pour les Parents
- Création et gestion de compte
- Gestion de plusieurs profils d'enfants
- Inscription aux activités des centres partenaires
- Paiement unique mensuel (cours + transport)
- Téléchargement de factures détaillées
- Suivi des inscriptions et paiements
- Notifications pour les lignes de transport

### Pour les Centres Partenaires
- Compte sécurisé dédié
- Gestion de la fiche centre (informations, horaires, capacités)
- Consultation des enfants inscrits
- Visualisation des montants qui leur reviennent
- Téléchargement des relevés mensuels

### Pour l'Administration SHIPP
- Gestion des centres partenaires
- Gestion des activités et tarification
- Pilotage financier complet
- Gestion des lignes de transport du samedi
- Tableau de bord avec métriques clés

## Structure de la base de données

### Tables principales
- **profiles** : Profils utilisateurs avec rôles (parent, center, admin)
- **zones** : Zones géographiques desservies
- **centers** : Centres partenaires offrant les activités
- **children** : Profils des enfants gérés par les parents
- **activities** : Activités offertes par les centres (samedi uniquement)
- **enrollments** : Inscriptions des enfants aux activités
- **payments** : Enregistrement des paiements
- **invoices** : Factures générées automatiquement
- **financial_distributions** : Répartition financière (centre, transport, marge)
- **transport_routes** : Lignes de transport par zone
- **route_assignments** : Assignation des enfants aux lignes
- **notifications** : Notifications système
- **pricing_history** : Historique des modifications tarifaires

## Tarification

Le système de tarification est entièrement géré par l'administration :

- **Tarif du cours** : Défini par SHIPP pour chaque activité
- **Tarif du transport** : Défini par SHIPP pour chaque activité
- **Tarif total** : Calcul automatique (cours + transport)

Les parents voient le détail complet :
- Prix du cours
- Prix du transport
- Total à payer

## Facturation

Chaque paiement génère automatiquement une facture PDF avec :
- Nom du parent et de l'enfant
- Activité et centre partenaire
- Détail des tarifs (cours + transport)
- Total payé

**Mention légale obligatoire** :
"Les cours sont dispensés par un centre partenaire indépendant. SHIPP Éducation assure la coordination et le transport."

## Répartition financière

Pour chaque paiement, le système calcule automatiquement :
- **Part Centre** : Revenus du centre pour le cours
- **Part Transport** : Revenus SHIPP Transport
- **Marge SHIPP Éducation** : Marge de coordination

Tout est tracé et archivé pour audit.

## Transport

Système de gestion des lignes de transport le samedi :
- Regroupement des enfants par zone
- Création de lignes extrascolaires
- Capacité véhicules (10 ou 15 places)
- Seuil minimum d'enfants par ligne
- Annulation automatique si seuil non atteint
- Notifications aux parents

## Données de démonstration

Le système inclut des données de démonstration :

### Centres partenaires
1. **Centre Musical Kinshasa** (Musique)
   - Cours de Piano : 50$ + 15$ transport
   - Cours de Guitare : 45$ + 15$ transport

2. **Club Sportif Excellence** (Sport)
   - Football Juniors : 40$ + 15$ transport
   - Basketball Formation : 40$ + 15$ transport

3. **Atelier Robotique Avenir** (Robotique)
   - Robotique Débutant : 60$ + 15$ transport
   - Programmation Scratch : 55$ + 15$ transport

4. **École des Arts Visuels** (Arts)
   - Peinture à l'Huile : 50$ + 15$ transport
   - Dessin et Croquis : 45$ + 15$ transport

### Zones desservies
- Zone Nord
- Zone Sud
- Zone Est
- Zone Ouest
- Zone Centre

## Sécurité

### Row Level Security (RLS)
Toutes les tables ont des politiques RLS actives :
- Les parents ne voient que leurs données
- Les centres ne voient que leurs inscriptions
- Les admins ont accès complet

### Authentification
- Système d'authentification Supabase
- Gestion des rôles (parent, center, admin)
- Vérification des permissions à chaque requête

## Technologies utilisées

- **Frontend** : React + TypeScript + Vite
- **Styling** : Tailwind CSS
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth
- **Icons** : Lucide React

## Installation et développement

1. Les dépendances sont déjà installées
2. La base de données est configurée avec Supabase
3. Le schéma est créé avec toutes les tables et politiques RLS
4. Les données de démonstration sont insérées

## Prochaines étapes suggérées

### Phase 2 : Système de paiement complet
- Intégration Mobile Money
- Génération automatique de factures PDF
- Historique des paiements

### Phase 3 : Module transport avancé
- Algorithme d'optimisation des routes
- Suivi GPS en temps réel
- Notifications SMS aux parents

### Phase 4 : Reporting financier
- Tableaux de bord avancés
- Export comptable
- Rapports de rentabilité par ligne

### Phase 5 : Fonctionnalités avancées
- Système de notation des centres
- Chat parent-centre
- Application mobile native

## Architecture

```
src/
├── lib/
│   ├── supabase.ts          # Client Supabase
│   └── database.types.ts    # Types TypeScript
├── contexts/
│   └── AuthContext.tsx      # Context d'authentification
├── components/
│   └── auth/                # Composants d'authentification
│       ├── Login.tsx
│       └── Register.tsx
├── pages/
│   ├── public/              # Pages publiques
│   │   └── LandingPage.tsx
│   ├── parent/              # Dashboard parent
│   │   └── ParentDashboard.tsx
│   ├── center/              # Dashboard centre
│   │   └── CenterDashboard.tsx
│   └── admin/               # Dashboard admin
│       └── AdminDashboard.tsx
└── App.tsx                  # Point d'entrée avec routing
```

## Notes importantes

1. **Données utilisateur** : Toutes les données sont protégées par RLS
2. **Paiements** : Le système est prêt pour l'intégration Mobile Money
3. **Facturation** : Structure prête pour génération PDF automatique
4. **Transport** : Base de données prête pour gestion complète des routes
5. **Notifications** : Infrastructure en place pour envoi d'alertes

## Support

Pour toute question ou suggestion, contactez l'équipe SHIPP Éducation.

---

**SHIPP Éducation** - Coordination transport et activités extrascolaires
