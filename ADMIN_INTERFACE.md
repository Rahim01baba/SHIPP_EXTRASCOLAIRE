# Interface d'Administration SHIPP

## Vue d'ensemble

L'interface d'administration SHIPP est une console complète de pilotage de la plateforme éducative. Elle permet de gérer tous les aspects du système depuis un tableau de bord centralisé.

## Accès à l'interface

### Méthode 1 : Connexion classique
- Email : `admin@shipp.com`
- Mot de passe : `Baba1234`
- URL : Page d'accueil de l'application

### Méthode 2 : Lien d'accès direct (sans connexion)
- Token unique : `63aee7c559743f1605eac8f5f103c0291c54123d4aab5bbf444504263730b478`
- Lien complet : `http://localhost:5173/?token=63aee7c559743f1605eac8f5f103c0291c54123d4aab5bbf444504263730b478`
- Validité : Jusqu'au 7 février 2026
- Avantage : Accès instantané sans saisir les identifiants

## Fonctionnalités principales

### 1. Dashboard (Tableau de bord)
Vue d'ensemble avec indicateurs clés :
- Nombre de centres validés, en attente et rejetés
- Inscriptions actives en temps réel
- Paiements du mois en FCFA
- Alertes et notifications importantes
- Activité récente de la plateforme

### 2. Gestion des Centres
- Validation des demandes de partenariat
- Visualisation des profils de centres
- Gestion du statut (pending/validated/rejected)
- Suivi des documents et informations

### 3. Types d'activités
- Création de nouvelles catégories d'activités
- Définition des tarifs de base
- Gestion des descriptions et caractéristiques
- Organisation par thématiques

### 4. Activités
- Catalogue complet des activités proposées
- Association aux centres partenaires
- Gestion des plannings et capacités
- Modification des tarifs et disponibilités

### 5. Gestion des Parents
- Base de données complète des parents inscrits
- Historique des inscriptions par famille
- Suivi des paiements et factures
- Coordonnées et informations de contact

### 6. Gestion des Enfants
- Profils détaillés des enfants inscrits
- Âge, école et informations personnelles
- Historique des activités suivies
- Besoins spécifiques et allergies

### 7. Inscriptions
- Suivi de toutes les inscriptions
- Statuts : pending, confirmed, cancelled
- Détails des activités choisies
- Calcul automatique des tarifs

### 8. Paiements
- Historique complet des transactions
- Méthodes : mobile money, espèces, virement
- Statuts : pending, completed, failed
- Tracking des montants et dates

### 9. Factures
- Génération automatique des factures
- Numérotation unique et horodatage
- Export et impression
- Historique par parent/centre

### 10. Répartitions
- Calcul automatique des commissions
- Part de SHIPP (30%) et part des centres (70%)
- Suivi des versements aux partenaires
- Rapports financiers détaillés

## Design et ergonomie

- **Couleur principale** : Jaune (marque SHIPP)
- **Navigation** : Menu latéral fixe avec icônes
- **Responsive** : Adapté à tous les écrans
- **Temps réel** : Actualisation automatique des données
- **Interface intuitive** : Actions rapides et accessibles

## Sécurité

- Authentification requise (sauf accès par token)
- Permissions basées sur le rôle (admin uniquement)
- Row Level Security (RLS) activée sur toutes les tables
- Tokens d'accès avec expiration
- Historique des actions effectuées

## Support technique

Pour toute question ou assistance :
- Email : admin@shipp.com
- Interface : Console admin > Section Support (à venir)
