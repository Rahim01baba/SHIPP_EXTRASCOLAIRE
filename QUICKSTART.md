# Guide de démarrage rapide - SHIPP

## Présentation

**SHIPP** organise le transport du samedi et facilite l'accès aux activités extrascolaires proposées par des centres partenaires indépendants.

**Important** : SHIPP n'est PAS un centre éducatif. Les cours sont dispensés par des centres partenaires indépendants. SHIPP coordonne, encaisse et organise le transport.

## Compte administrateur SHIPP

### Compte admin pré-créé
Le compte administrateur est déjà créé et prêt à utiliser :
   - **Email** : admin@shipp.com
   - **Mot de passe** : Baba1234
   - Nom complet : Administrateur SHIPP
   - Téléphone : +225 01 01 72 36 87
   - Rôle : admin

### Accès admin
- Dashboard complet avec statistiques
- Validation des centres partenaires
- Exports CSV de toutes les données
- Gestion future des activités et tarifs

## Fonctionnalités implémentées

### 1. Système de types d'activités (Admin-Managed)

**Liste complète des types d'activités** :

**🎨 Arts & Création**
- Peinture, Dessin, Sculpture, Arts plastiques, Calligraphie, Design graphique

**🎵 Musique & Arts de la scène**
- Piano, Guitare, Batterie, Violon, Chant, Danse, Théâtre

**⚽ Sports**
- Football, Basketball, Natation, Athlétisme, Arts martiaux, Gymnastique, Tennis, Fitness enfants

**🤖 Sciences & Technologie**
- Robotique, Programmation, Codage, Électronique, STEM, Impression 3D

**✈️ Aviation & Technique**
- Pilotage d'avion (initiation), Simulation de vol, Drones, Aéromodélisme

**🌍 Langues & Culture**
- Anglais, Français, Chinois, Espagnol, Culture générale

**🧠 Développement personnel**
- Échecs, Lecture guidée, Leadership junior, Prise de parole

**Règles importantes** :
- Seul l'admin peut ajouter/modifier/désactiver des types d'activités
- Les centres sélectionnent parmi la liste validée (multi-sélection)
- Les centres ne peuvent PAS créer de nouveaux types

### 2. Validation des centres (Workflow complet)

**Dashboard Admin - Onglet "Centres"** :
- Liste tous les centres avec filtres par statut
- Boutons d'action selon le statut :
  - **Soumis** → Valider / Refuser (avec motif)
  - **Validé** → Suspendre
- Historique de validation (date, admin, motif)

**Statuts** :
- `submitted` : Centre nouvellement inscrit (non visible publiquement)
- `validated` : Approuvé par admin SHIPP (visible publiquement)
- `rejected` : Refusé avec motif
- `suspended` : Temporairement désactivé

**Alerte visuelle** :
- Badge jaune en haut du dashboard si centres en attente
- Nombre de centres pending affiché

### 3. Localisation Google Maps

**Nouveaux champs centres** :
- `google_maps_url` : Lien Google Maps
- `latitude` : Coordonnées GPS
- `longitude` : Coordonnées GPS

**Utilisation** :
- Permet à SHIPP de localiser précisément les centres
- Facilite l'organisation du transport
- Remplace les adresses textuelles imprécises

### 4. Exports CSV (Complet)

**Dashboard Admin - Onglet "Exports CSV"** :

Boutons d'export pour :
- **Parents** : Liste complète des parents inscrits
- **Enfants** : Tous les enfants avec info parent
- **Inscriptions** : Détail complet (enfant, activité, tarifs, statut)
- **Paiements** : Historique avec références et statuts
- **Factures** : Toutes les factures émises

**Format des exports** :
- Encodage UTF-8 avec BOM
- En-têtes en français
- Dates au format ISO (YYYY-MM-DD)
- Montants en format numérique
- Nom de fichier : `shipp_<type>_<YYYYMMDD>_<HHMM>.csv`

**Filtres respectés** :
- Les exports reflètent les filtres actifs
- Exemple : Si filtre "centres soumis", le CSV contient uniquement les centres soumis

### 5. Interface utilisateur

**Palette de couleurs** :
- **Jaune** (#FCD34D) : Tous les boutons principaux, onglets actifs
- **Noir** : Titres, textes importants
- **Gris** : Fonds, séparateurs, textes secondaires
- **Blanc** : Cards, contenus

**Branding** :
- "SHIPP" (sans "Éducation")
- Logo jaune partout
- Design cohérent sur toutes les pages

## Structure de la base de données

### Nouvelles tables

**activity_types** :
- Gérée exclusivement par l'admin
- 42 types d'activités pré-chargés
- Catégorisés en 7 groupes

**Colonnes ajoutées à `centers`** :
- `activity_type_ids` : Array d'IDs de types d'activités
- `google_maps_url` : Lien Google Maps
- `latitude`, `longitude` : Coordonnées GPS
- `validation_status` : submitted/validated/rejected/suspended
- `validated_at` : Date de validation
- `validated_by` : ID de l'admin validateur
- `rejection_reason` : Motif de refus

### Politiques RLS

- Public voit uniquement centres **validated** ET **is_active**
- Centres voient leur propre statut
- Admins ont accès complet à tout
- Parents accèdent uniquement à leurs données
- Exports CSV réservés aux admins

## Utilisation de la plateforme

### Pour l'admin SHIPP

1. **Connexion**
   - Email : admin@shipp.com
   - Mot de passe : Baba1234

2. **Dashboard**
   - Vue d'ensemble : statistiques clés + alertes
   - Centres : validation et gestion
   - Exports CSV : téléchargement des données

3. **Valider un centre**
   - Aller dans "Centres"
   - Filtrer par "Soumis"
   - Cliquer "Valider" ou "Refuser" (avec motif)
   - Le centre devient visible/invisible selon la décision

4. **Exporter des données**
   - Aller dans "Exports CSV"
   - Cliquer sur le type de données voulu
   - Le fichier CSV se télécharge automatiquement

### Pour les centres partenaires

1. **Inscription** (À implémenter)
   - Formulaire complet avec multi-sélection activités
   - Upload logo (optionnel)
   - Lien Google Maps obligatoire
   - Statut automatique : "submitted"

2. **En attente de validation**
   - Le centre ne peut pas se connecter tant que non validé
   - Notification par email (à implémenter)

3. **Une fois validé**
   - Accès au dashboard centre
   - Visible sur la plateforme publique
   - Peut recevoir des inscriptions

### Pour les parents

1. **Inscription**
   - Formulaire simplifié
   - Sélection zone (optionnel)
   - Compte actif immédiatement

2. **Voir les activités**
   - Uniquement centres validés visibles
   - Carrousel de logos en bas de page d'accueil

## Contact et assistance

**Coordonnées SHIPP** :
- **Adresse** : Abidjan, Cocody Vallon, Rue J79
- **WhatsApp** : +225 01 01 72 36 87
- **Email** : infos@shipp-group.com

**Message pré-rempli WhatsApp** :
"Bonjour SHIPP, je souhaite des informations sur le transport et les activités du samedi."

Tous les liens "Assistance" et "Besoin d'aide" redirigent vers WhatsApp.

## Prochaines étapes de développement

### Priorité 1 : Formulaire inscription centre
- Interface complète d'inscription autonome
- Multi-sélection types d'activités
- Intégration Google Maps (autocomplete + sélection sur carte)
- Upload de logo
- Validation du formulaire
- Statut automatique "submitted"

### Priorité 2 : Gestion des types d'activités (Admin)
- CRUD complet dans le dashboard admin
- Ajouter/modifier/désactiver des types
- Réorganiser l'ordre d'affichage
- Voir quels centres utilisent chaque type

### Priorité 3 : Dashboard centre amélioré
- Voir les types d'activités sélectionnés
- Statistiques d'inscriptions
- Revenus estimés
- Liste des enfants inscrits

### Priorité 4 : Système de notifications
- Email automatique à la validation/refus centre
- Notifications push pour les parents
- Rappels pour les paiements

### Priorité 5 : Parent - Fonctionnalités complètes
- Ajout/modification enfants
- Inscription aux activités
- Paiement Mobile Money
- Téléchargement factures PDF

### Priorité 6 : Reporting financier avancé
- Distribution automatique (centre/transport/marge)
- Graphiques d'évolution
- Exports comptables avancés

## Tests recommandés

### Tests admin
1. Se connecter avec admin@shipp.com / Baba1234
2. Accéder au dashboard admin
3. Vérifier les statistiques dans l'onglet "Vue d'ensemble"
4. Aller dans l'onglet "Centres" et filtrer par statut
5. Tester validation/refus d'un centre
6. Aller dans l'onglet "Exports CSV"
7. Exporter chaque type de CSV et vérifier le format/contenu

### Tests public
1. Voir la page d'accueil
2. Vérifier que seuls centres validés apparaissent
3. Tester le carrousel de logos
4. Cliquer sur "Devenir centre partenaire"
5. Vérifier les liens WhatsApp
6. Tester responsive mobile

### Tests parent
1. Créer un compte parent
2. Se connecter
3. Explorer le dashboard
4. (Futures fonctionnalités à tester)

## Données de démonstration

**Zones** : 5 zones (Nord, Sud, Est, Ouest, Centre)

**Centres** : 4 centres (tous validés)
- Centre Musical Kinshasa (Musique)
- Club Sportif Excellence (Sport)
- Atelier Robotique Avenir (Robotique)
- École des Arts Visuels (Peinture)

**Types d'activités** : 42 types répartis en 7 catégories

**Activités** : 8 activités (2 par centre)

## Commandes utiles

```bash
# Build du projet
npm run build

# Lancer le serveur de dev (fait automatiquement)
npm run dev

# Vérifier les types TypeScript
npm run typecheck
```

## Résolution de problèmes

### Le compte admin ne fonctionne pas
- Le compte est pré-créé : admin@shipp.com / Baba1234
- Si problème de connexion, vérifier dans Supabase que l'email est confirmé
- Vérifier que le rôle dans la table profiles est bien "admin"

### Les centres ne s'affichent pas
- Vérifier leur statut : seuls les "validated" sont visibles publiquement
- L'admin doit d'abord valider les centres

### Export CSV vide
- S'assurer qu'il y a des données dans la base
- Vérifier les permissions RLS

### Google Maps ne fonctionne pas
- L'intégration complète sera dans la prochaine phase
- Pour l'instant, les champs sont prêts dans la base de données

## Architecture technique

```
Base de données
├── activity_types (42 types pré-chargés)
├── centers (avec activity_type_ids[], google_maps_url, lat/lng, validation_status)
├── profiles (avec rôle admin)
└── Autres tables existantes

Frontend
├── LandingPage (palette jaune/noir/gris)
├── Login & Register (palette jaune)
├── AdminDashboard (validation + exports CSV)
├── ParentDashboard (à compléter)
└── CenterDashboard (à compléter)

Utilitaires
├── csvExport.ts (exports avec UTF-8 BOM)
└── database.types.ts (types à jour)
```

## Mention légale obligatoire

Sur toutes les factures PDF (à implémenter) :
"Les cours sont dispensés par un centre partenaire indépendant. SHIPP assure la coordination et le transport."

---

**SHIPP** - Coordination transport et activités du samedi
Abidjan, Cocody Vallon, Rue J79
WhatsApp: +225 01 01 72 36 87
Email: infos@shipp-group.com
