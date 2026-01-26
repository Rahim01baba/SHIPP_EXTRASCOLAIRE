# Guide d'implémentation SHIPP Éducation

Ce document détaille l'état actuel de l'implémentation et les prochaines étapes pour compléter la plateforme.

## État actuel

### ✅ Complété

#### 1. Base de données (100%)
- Schéma complet avec 13 tables
- Types énumérés pour tous les statuts
- Politiques RLS complètes et sécurisées
- Index de performance
- Triggers pour mise à jour automatique des capacités
- Fonctions de calcul automatique
- Données de démonstration (4 centres, 8 activités, 5 zones)

#### 2. Authentification (100%)
- Context d'authentification React
- Supabase Auth intégré
- Gestion des rôles (parent, center, admin)
- Composants Login et Register
- Protection des routes par rôle

#### 3. Interface utilisateur de base (100%)
- Page d'accueil publique complète
- Dashboard parent avec vue d'ensemble
- Dashboard centre avec statistiques
- Dashboard admin avec métriques
- Navigation par onglets pour chaque rôle
- Design responsive avec Tailwind CSS

#### 4. Architecture (100%)
- Structure de fichiers organisée
- Séparation des responsabilités
- Types TypeScript pour toutes les tables
- Client Supabase configuré

### 🚧 À implémenter

#### Phase 1 : Compléter les dashboards (Haute priorité)

##### Parent Dashboard
- **Gestion des enfants**
  - Formulaire d'ajout d'enfant complet
  - Modification des profils enfants
  - Suppression avec confirmation
  - Calcul automatique de l'âge

- **Inscription aux activités**
  - Liste des activités disponibles avec filtres (zone, type, âge)
  - Vérification de compatibilité (âge, capacité, zone)
  - Sélection enfant + activité + mois
  - Calcul automatique du total
  - Création de l'inscription

- **Paiements**
  - Interface de paiement Mobile Money
  - Génération de référence unique
  - Confirmation de paiement
  - Historique des paiements avec filtres

- **Factures**
  - Liste des factures avec téléchargement
  - Génération PDF automatique
  - Archive des factures

- **Notifications**
  - Liste des notifications non lues
  - Marquage comme lu
  - Filtres par type

##### Center Dashboard
- **Gestion du centre**
  - Modification des informations du centre
  - Upload d'images et logo
  - Mise à jour des horaires et capacités

- **Liste des inscrits**
  - Voir tous les enfants inscrits aux activités
  - Filtres par activité et mois
  - Informations de contact des parents

- **Finances**
  - Vue des revenus par activité
  - Historique des paiements reçus
  - Téléchargement des relevés mensuels

##### Admin Dashboard
- **Gestion des centres**
  - CRUD complet des centres
  - Activation/désactivation
  - Assignation de comptes utilisateurs aux centres

- **Gestion des activités**
  - CRUD complet des activités
  - **Tarification** (fonctionnalité critique)
    - Modification du tarif cours
    - Modification du tarif transport
    - Historique des modifications avec raison
    - Gel tarifaire par mois
  - Gestion de la capacité

- **Gestion des inscriptions**
  - Vue de toutes les inscriptions
  - Changement de statut (pending → confirmed)
  - Annulation avec remboursement

- **Pilotage financier** (fonctionnalité critique)
  - Tableau de bord avec KPIs
    - CA total, CA cours, CA transport
    - Marge par activité
    - Marge par centre
    - Rentabilité par ligne de transport
  - Graphiques d'évolution
  - Export Excel pour comptabilité
  - Alertes sous-rentabilité

- **Module transport** (fonctionnalité critique)
  - Création de lignes de transport
    - Sélection zone et date
    - Définition capacité véhicule
    - Seuil minimum d'enfants
  - Assignation automatique des enfants par zone
  - Calcul heures de passage
  - Confirmation/annulation des lignes
  - Notifications automatiques aux parents

#### Phase 2 : Système de paiement (Haute priorité)

**Intégration Mobile Money**
```typescript
// Structure suggérée
interface PaymentRequest {
  amount: number;
  phone: string;
  reference: string;
  provider: 'orange' | 'vodacom' | 'airtel';
}

// API à implémenter
async function initiateMobileMoneyPayment(request: PaymentRequest) {
  // Appel API Mobile Money
  // Création du paiement en statut 'pending'
  // Retour de l'ID de transaction
}

async function verifyPaymentStatus(transactionId: string) {
  // Vérification du statut
  // Mise à jour en 'completed' ou 'failed'
  // Génération de la facture si succès
  // Création de la distribution financière
  // Envoi de notifications
}
```

**Génération de factures PDF**
```typescript
// Utiliser une bibliothèque comme jspdf ou pdfmake
import { jsPDF } from 'jspdf';

async function generateInvoicePDF(invoiceId: string) {
  // Récupérer les données de la facture
  // Créer le PDF avec logo SHIPP
  // Inclure tous les détails (parent, enfant, activité, tarifs)
  // Ajouter la mention légale obligatoire
  // Upload vers Supabase Storage
  // Mettre à jour invoice.pdf_url
}
```

#### Phase 3 : Notifications (Priorité moyenne)

**Système de notifications**
- Créer une fonction pour envoyer des notifications
- Types de notifications :
  - Confirmation d'inscription
  - Paiement reçu
  - Ligne de transport confirmée
  - Ligne de transport annulée
  - Rappel veille du samedi
  - Alerte capacité bientôt atteinte

**Implémentation suggérée**
```typescript
async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string
) {
  // Insertion dans table notifications
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    related_id: relatedId
  });

  // Optionnel : envoi email/SMS
  // await sendEmail(userEmail, title, message);
  // await sendSMS(userPhone, message);
}
```

#### Phase 4 : Module transport complet (Priorité moyenne)

**Algorithme d'assignation**
```typescript
async function createTransportRoute(zoneId: string, date: string) {
  // 1. Récupérer tous les enfants inscrits dans la zone pour cette date
  // 2. Vérifier le nombre d'enfants
  // 3. Si >= seuil minimum, créer la ligne
  // 4. Assigner les enfants à la ligne
  // 5. Calculer les horaires de passage
  // 6. Envoyer notifications aux parents

  // Si < seuil minimum, marquer comme annulée et notifier
}

async function optimizeRoutes() {
  // Algorithme d'optimisation des trajets
  // Calcul du chemin le plus court
  // Estimation des heures de passage
}
```

#### Phase 5 : Reporting avancé (Priorité basse)

**Exports comptables**
- Export Excel des distributions financières
- Export des paiements par période
- Rapport de rentabilité par centre
- Rapport de rentabilité par ligne de transport

**Tableaux de bord avancés**
- Graphiques d'évolution du CA
- Graphiques de répartition par type d'activité
- Carte des zones avec densité d'enfants
- Prévisions de revenus

## Recommandations techniques

### 1. Structure des composants
Séparer les composants en petits fichiers réutilisables :
```
components/
├── common/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── Table.tsx
├── forms/
│   ├── ChildForm.tsx
│   ├── ActivityForm.tsx
│   └── CenterForm.tsx
├── lists/
│   ├── ActivityList.tsx
│   ├── EnrollmentList.tsx
│   └── PaymentList.tsx
└── charts/
    ├── RevenueChart.tsx
    └── CapacityChart.tsx
```

### 2. Gestion d'état
Pour les états complexes, considérer :
- Context API pour l'état global
- React Query pour le cache des données
- Zustand pour gestion d'état simple

### 3. Validation
Utiliser une bibliothèque de validation comme Zod :
```typescript
import { z } from 'zod';

const childSchema = z.object({
  full_name: z.string().min(2),
  date_of_birth: z.string().refine((date) => {
    const age = calculateAge(date);
    return age >= 5 && age <= 18;
  }, "L'enfant doit avoir entre 5 et 18 ans"),
  zone_id: z.string().uuid()
});
```

### 4. Gestion des erreurs
Implémenter un système centralisé :
```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
  }
}

function handleError(error: unknown) {
  if (error instanceof AppError) {
    // Afficher message utilisateur
    toast.error(error.message);
  } else {
    // Erreur inconnue
    toast.error('Une erreur est survenue');
    console.error(error);
  }
}
```

### 5. Tests
Ajouter des tests pour les fonctions critiques :
```typescript
describe('Financial Distribution', () => {
  it('should calculate correct distribution', () => {
    const payment = { amount: 65 }; // 50 cours + 15 transport
    const distribution = calculateDistribution(payment);

    expect(distribution.center_share).toBe(50);
    expect(distribution.transport_share).toBe(15);
    expect(distribution.shipp_margin).toBe(0); // À ajuster
  });
});
```

## Ordre de développement recommandé

1. **Semaine 1** : Compléter gestion des enfants (parent)
2. **Semaine 2** : Système d'inscription complet
3. **Semaine 3** : Interface de paiement Mobile Money
4. **Semaine 4** : Génération de factures PDF
5. **Semaine 5** : Tarification admin + historique
6. **Semaine 6** : Module transport de base
7. **Semaine 7** : Système de notifications
8. **Semaine 8** : Pilotage financier admin
9. **Semaine 9-10** : Tests, optimisations, corrections

## Points d'attention

### Sécurité
- Toujours valider les données côté serveur
- Ne jamais exposer de clés API
- Vérifier les permissions pour chaque action
- Logs d'audit pour actions sensibles

### Performance
- Implémenter la pagination pour grandes listes
- Optimiser les requêtes avec `select` précis
- Utiliser des index sur les colonnes fréquemment recherchées
- Cache pour données peu changeantes (zones, centres)

### UX
- Feedback immédiat pour toutes les actions
- Messages d'erreur clairs en français
- Loading states pour opérations longues
- Confirmation pour actions destructives

### Données
- Backup régulier de la base de données
- Archivage des anciennes données
- RGPD : possibilité de supprimer les données utilisateur
- Traçabilité complète pour audit

## Support et documentation

- Documenter chaque nouvelle fonctionnalité
- Maintenir ce guide à jour
- Créer des vidéos tutoriels pour les utilisateurs
- FAQ basée sur questions récurrentes

---

**Version** : 1.0 - État initial de la plateforme
**Dernière mise à jour** : Janvier 2026
