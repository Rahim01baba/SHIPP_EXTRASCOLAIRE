# Fix Enrollment Status - Removal of 'pending'

## 🎯 Objectif
Supprimer complètement l'utilisation du statut `'pending'` pour les enrollments et utiliser uniquement `'pending_admin_validation'`.

## 📋 Problème identifié
Les inscriptions utilisaient deux statuts différents pour représenter "en attente de validation admin":
- `'pending'` (ancien/obsolète)
- `'pending_admin_validation'` (nouveau standard)

Cela créait:
- Des incohérences dans les filtres
- Des erreurs 400 Supabase potentielles
- De la confusion dans le code

## ✅ Corrections effectuées

### 1. **src/lib/enrollmentStatus.ts**

**Type EnrollmentStatus:**
```typescript
// AVANT
export type EnrollmentStatus =
  | 'pending_admin_validation'
  | 'active'
  | 'rejected'
  | 'cancelled'
  | 'pending'    // ❌ RETIRÉ
  | 'confirmed';

// APRÈS
export type EnrollmentStatus =
  | 'pending_admin_validation'
  | 'active'
  | 'rejected'
  | 'cancelled'
  | 'confirmed';
```

**Constantes ENROLLMENT_STATUS:**
```typescript
// AVANT
export const ENROLLMENT_STATUS = {
  PENDING_ADMIN_VALIDATION: 'pending_admin_validation' as const,
  ACTIVE: 'active' as const,
  REJECTED: 'rejected' as const,
  CANCELLED: 'cancelled' as const,
  // 'pending' n'existait pas dans les constantes
};

// APRÈS
export const ENROLLMENT_STATUS = {
  PENDING_ADMIN_VALIDATION: 'pending_admin_validation' as const,
  ACTIVE: 'active' as const,
  REJECTED: 'rejected' as const,
  CANCELLED: 'cancelled' as const,
  CONFIRMED: 'confirmed' as const,  // ✅ AJOUTÉ pour cohérence
};
```

**Fonctions mises à jour:**
- `getEnrollmentStatusLabel()` - Retiré le case `'pending'`
- `getEnrollmentStatusColor()` - Retiré le case `'pending'`
- `getEnrollmentStatusBadgeVariant()` - Retiré le case `'pending'`
- `normalizeEnrollmentStatus()` - Retiré la conversion `'pending'` → `'pending_admin_validation'`
- `isPendingValidation()` - Ne vérifie plus `'pending'`, seulement `'pending_admin_validation'`

### 2. **src/components/admin/EnrollmentsPage.tsx**

**Filtre de requête:**
```typescript
// AVANT
if (activeTab === 'pending') {
  query = query.in('status', ['pending_admin_validation', 'pending']);
}

// APRÈS
if (activeTab === 'pending') {
  query = query.eq('status', 'pending_admin_validation');
}
```

**Comptage des onglets:**
```typescript
// AVANT
if (tab === 'pending') {
  return enrollments.filter(e =>
    e.status === 'pending_admin_validation' || e.status === 'pending'
  ).length;
}

// APRÈS
if (tab === 'pending') {
  return enrollments.filter(e =>
    e.status === 'pending_admin_validation'
  ).length;
}
```

**Détection des enrollments pending:**
```typescript
// AVANT
const isPending = enrollment.status === 'pending_admin_validation'
  || enrollment.status === 'pending';

// APRÈS
const isPending = enrollment.status === 'pending_admin_validation';
```

### 3. **src/components/admin/DashboardPage.tsx**

**Comptage des inscriptions en attente de validation:**
```typescript
// AVANT
const pendingValidationCount = filteredEnrollments.filter(e =>
  e.status === 'pending_admin_validation' || e.status === 'pending'
).length;

// APRÈS
const pendingValidationCount = filteredEnrollments.filter(e =>
  e.status === 'pending_admin_validation'
).length;
```

### 4. **Migration de données**

**Fichier:** `supabase/migrations/migrate_pending_to_pending_admin_validation.sql`

```sql
-- Convertit tous les enrollments avec status 'pending'
-- en 'pending_admin_validation'
UPDATE enrollments
SET status = 'pending_admin_validation'
WHERE status = 'pending';
```

Résultat: Aucun enrollment avec status `'pending'` n'existait dans la base de données.

## 📊 Statuts d'enrollment valides

Après cette correction, les seuls statuts valides sont:

| Statut | Description | Usage |
|--------|-------------|-------|
| `pending_admin_validation` | En attente validation SHIPP | Nouvelles inscriptions |
| `active` | Inscription validée et active | Validée par admin |
| `confirmed` | Inscription confirmée (legacy) | Anciennes inscriptions |
| `rejected` | Inscription refusée | Rejetée par admin |
| `cancelled` | Inscription annulée | Annulée par parent |

## ⚠️ Notes importantes

1. **Payment Status vs Enrollment Status**
   - `payment_status: 'pending'` ✅ GARDE (c'est différent!)
   - `status: 'pending'` ❌ SUPPRIMÉ (enrollments uniquement)

2. **Center Status**
   - `center.status: 'pending'` ✅ GARDE (c'est différent!)
   - Les centres utilisent leur propre enum de statuts

3. **Compatibilité**
   - La migration convertit automatiquement les anciens enrollments
   - Les fonctions ne supportent plus `'pending'` pour les enrollments
   - TypeScript générera une erreur si on essaie d'utiliser `'pending'`

## 🎯 Résultat final

- ✅ Un seul statut pour "en attente de validation": `pending_admin_validation`
- ✅ Plus d'ambiguïté dans le code
- ✅ Filtres Supabase cohérents
- ✅ TypeScript empêche l'utilisation de `'pending'` pour enrollments
- ✅ Logs de debug ajoutés pour faciliter le diagnostic
- ✅ Build réussi sans erreurs

## 🧪 Test recommandé

1. Se connecter en tant que parent
2. Créer une nouvelle inscription
3. Vérifier dans la console que le statut est `pending_admin_validation`
4. Se connecter en tant qu'admin
5. Ouvrir F12 et observer les logs `[ADMIN ENROLLMENTS]`
6. Vérifier que l'inscription apparaît dans l'onglet "À valider"
7. Vérifier qu'aucune erreur 400 n'apparaît
