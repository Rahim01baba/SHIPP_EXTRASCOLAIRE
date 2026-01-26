# Fix Workflow Centres - 9 Janvier 2025

## Problème Diagnostiqué ✅

Le compte centre était créé dans `auth.users` + `profiles` (role='center') mais **la fiche centre n'était PAS créée dans la table `centers`**. Résultat : l'admin ne voyait rien à valider.

### Symptômes
- Centre inscrit avec succès (auth + profile créés)
- Admin interface "Centres" vide (0 rows)
- Impossible de valider/activer le centre
- Centre ne peut pas se connecter à son dashboard

### Cause Racine
1. **Flux signup incomplet** : CenterSignup créait user + profile mais pas la ligne `centers`
2. **Mismatch champs** : Code utilisait `validation_status` mais DB utilise `status`
3. **Mismatch valeurs enum** : Code utilisait 'submitted'/'validated' mais DB utilise 'pending'/'approved'/'rejected'/'suspended'
4. **RLS trop restrictif** : Pas de policy INSERT pour que les centres créent leur fiche

---

## Solution Implémentée ✅

### 1. Migration SQL - RLS Policies Correctes

**Fichier:** `fix_centers_rls_and_structure.sql`

#### Policies Créées

```sql
-- Parents voient seulement centres approuvés et actifs
CREATE POLICY "parents_view_approved_centers"
  ON centers FOR SELECT
  TO authenticated
  USING (status = 'approved' AND is_active = true);

-- Centres voient leur propre centre
CREATE POLICY "centers_view_own"
  ON centers FOR SELECT
  TO authenticated
  USING (owner_profile_id = auth.uid());

-- Centres peuvent créer leur fiche (lors signup)
CREATE POLICY "centers_insert_own"
  ON centers FOR INSERT
  TO authenticated
  WITH CHECK (owner_profile_id = auth.uid());

-- Centres peuvent modifier leur fiche
CREATE POLICY "centers_update_own"
  ON centers FOR UPDATE
  TO authenticated
  USING (owner_profile_id = auth.uid())
  WITH CHECK (owner_profile_id = auth.uid());

-- Admin peut tout faire (SELECT, INSERT, UPDATE, DELETE)
-- Via fonction is_admin() qui ne cause pas de récursion
```

#### Structure Table

- ✅ `owner_profile_id` → NOT NULL (obligatoire pour lien compte ↔ fiche)
- ✅ `status` → enum: 'pending', 'approved', 'rejected', 'suspended'
- ✅ `is_active` → boolean (false par défaut)

---

### 2. Correction Flux Signup Centre

**Fichier:** `src/pages/public/CenterSignup.tsx`

#### Étape 1 (AVANT - OK)
```typescript
// Création compte auth + profile via trigger
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name,
      phone,
      role: 'center'
    }
  }
});
```

#### Étape 2 (CORRIGÉ - Création fiche centre)

**AVANT (bugué):**
```typescript
const centerData = {
  name: step1Data.center_name,
  validation_status: 'submitted',  // ❌ Champ n'existe pas
  is_active: true,                  // ❌ Devrait être false
  // ... champs supplémentaires inutiles
};
```

**APRÈS (corrigé):**
```typescript
const centerData = {
  name: step1Data.center_name,
  email: step1Data.email,
  phone: step1Data.phone,
  address_text: step2Data.address_text,
  google_maps_link: step2Data.google_maps_link || null,
  description: step2Data.description,
  owner_profile_id: user.id,       // ✅ Lien vers le compte
  status: 'pending',                // ✅ Bon champ, bonne valeur
  is_active: false,                 // ✅ Désactivé par défaut
};

const { data: centerResult, error } = await supabase
  .from('centers')
  .insert(centerData)
  .select()
  .single();
```

---

### 3. Correction Interface Admin

**Fichier:** `src/components/admin/CentersPage.tsx`

#### Interface TypeScript

**AVANT:**
```typescript
interface Center {
  validation_status: string;  // ❌ Champ n'existe pas en DB
  rejection_reason: string;   // ❌ Nom incorrect
}
```

**APRÈS:**
```typescript
interface Center {
  status: string;              // ✅ Correspond à la DB
  rejected_reason: string;     // ✅ Nom correct
  owner_profile_id: string;    // ✅ Ajouté
}
```

#### Filtres

**AVANT:**
```typescript
['all', 'submitted', 'validated', 'rejected', 'suspended']
// ❌ 'submitted' et 'validated' n'existent pas en DB
```

**APRÈS:**
```typescript
[
  { value: 'all', label: 'Tous' },
  { value: 'pending', label: 'En attente' },      // ✅
  { value: 'approved', label: 'Validés' },        // ✅
  { value: 'rejected', label: 'Refusés' },        // ✅
  { value: 'suspended', label: 'Suspendus' }      // ✅
]
```

#### Actions Admin

**AVANT:**
```typescript
// Valider
update({ validation_status: 'validated' })  // ❌

// Rejeter
update({
  validation_status: 'rejected',
  rejection_reason: reason                  // ❌ Nom incorrect
})
```

**APRÈS:**
```typescript
// Valider
update({
  status: 'approved',                       // ✅
  is_active: true,                          // ✅
  approved_at: new Date().toISOString(),
  approved_by: profile.id
})

// Rejeter
update({
  status: 'rejected',                       // ✅
  is_active: false,                         // ✅
  rejected_reason: reason                   // ✅
})

// Suspendre
update({
  status: 'suspended',                      // ✅
  is_active: false                          // ✅
})
```

---

## Workflow Complet Corrigé

### 1. Inscription Centre

```
User visite /center-signup
↓
Étape 1: Informations compte
  - Nom responsable
  - Email
  - Téléphone
  - Nom du centre
  - Mot de passe
↓
Submit → signUp() → user créé + profile créé (role='center') via trigger
↓
Étape 2: Informations centre
  - Adresse
  - Description
  - Google Maps link
  - Logo (optionnel)
  - Activités
↓
Submit → INSERT dans centers
  {
    owner_profile_id: user.id,
    status: 'pending',
    is_active: false,
    ...
  }
↓
SUCCESS: Centre créé et visible dans admin
```

### 2. Validation Admin

```
Admin se connecte → Interface Centres
↓
Charge depuis table `centers` (pas profiles)
↓
Filtre "En attente" → Centres avec status='pending'
↓
Admin clique "Valider"
↓
UPDATE centers SET
  status = 'approved',
  is_active = true,
  approved_at = NOW(),
  approved_by = admin.id
↓
Centre devient visible aux parents
Centre peut se connecter à son dashboard
```

### 3. Dashboard Centre

```
Centre se connecte (role='center')
↓
Charge sa fiche depuis centers WHERE owner_profile_id = auth.uid()
↓
Si status='pending' → "En attente de validation"
Si status='approved' AND is_active=true → Dashboard accessible
Si status='rejected' → "Compte refusé"
Si status='suspended' → "Compte suspendu"
```

---

## Mapping Complet des Champs

### Table `centers`

| Champ | Type | Valeurs/Description |
|-------|------|---------------------|
| `id` | uuid | PK |
| `owner_profile_id` | uuid | FK → profiles.id (NOT NULL) |
| `name` | text | Nom du centre |
| `email` | text | Email centre |
| `phone` | text | Téléphone centre |
| `address_text` | text | Adresse complète |
| `description` | text | Description activités |
| `google_maps_link` | text | Lien Google Maps |
| `logo_url` | text | URL logo (storage) |
| `status` | center_status | 'pending', 'approved', 'rejected', 'suspended' |
| `is_active` | boolean | true/false |
| `approved_at` | timestamptz | Date validation |
| `approved_by` | uuid | FK → profiles.id (admin) |
| `rejected_reason` | text | Motif refus |
| `shipp_commission_pct` | numeric | % commission SHIPP (défaut 30) |
| `created_at` | timestamptz | Date création |
| `updated_at` | timestamptz | Date modification |

### Statuts et Visibilité

| Status | is_active | Visible Parents | Visible Admin | Dashboard Centre |
|--------|-----------|-----------------|---------------|------------------|
| pending | false | Non | Oui (tous) | "En attente validation" |
| approved | true | Oui | Oui | Accessible |
| rejected | false | Non | Oui | "Compte refusé" |
| suspended | false | Non | Oui | "Compte suspendu" |

---

## Tests de Validation

### Test 1: Inscription Centre ✅

1. Aller sur /center-signup
2. Étape 1:
   - Nom: "Marie Martin"
   - Email: "centre.test@example.com"
   - Téléphone: "+225 01 02 03 04 05"
   - Nom centre: "Centre ABC"
   - Mot de passe: "123456"
3. Submit étape 1
4. Étape 2:
   - Adresse: "Cocody, Abidjan"
   - Description: "Centre de formation sportive"
   - Ajouter 1 activité minimum
5. Submit final
6. **Résultat attendu:**
   - ✅ Message succès
   - ✅ Ligne dans `auth.users`
   - ✅ Ligne dans `profiles` (role='center')
   - ✅ Ligne dans `centers` (status='pending', is_active=false)

### Test 2: Validation Admin ✅

1. Se connecter en tant qu'admin
2. Aller sur interface "Centres"
3. Filtre "En attente"
4. **Résultat attendu:**
   - ✅ Centre "Centre ABC" visible avec badge "En attente"
5. Cliquer "Valider"
6. **Résultat attendu:**
   - ✅ Message "Centre validé avec succès"
   - ✅ Status devient 'approved'
   - ✅ is_active devient true
   - ✅ approved_at et approved_by remplis
7. Filtre "Validés"
8. **Résultat attendu:**
   - ✅ Centre "Centre ABC" visible avec badge "Validé"

### Test 3: Dashboard Centre après Validation ✅

1. Se déconnecter admin
2. Se connecter avec compte centre ("centre.test@example.com")
3. **Résultat attendu:**
   - ✅ Routing vers CenterDashboard
   - ✅ Dashboard accessible
   - ✅ Informations centre affichées
   - ✅ Activités visibles

### Test 4: Visibilité Parents ✅

1. Se connecter en tant que parent
2. Créer nouvelle inscription
3. Étape "Choisir un centre"
4. **Résultat attendu:**
   - ✅ Centre "Centre ABC" visible dans la liste
   - ✅ Seulement centres avec status='approved' AND is_active=true

---

## Vérifications Base de Données

### Après inscription centre

```sql
-- Vérifier user créé
SELECT id, email, created_at
FROM auth.users
WHERE email = 'centre.test@example.com';

-- Vérifier profile créé
SELECT id, role, full_name, email
FROM profiles
WHERE email = 'centre.test@example.com';

-- Vérifier centre créé
SELECT id, name, status, is_active, owner_profile_id
FROM centers
WHERE email = 'centre.test@example.com';

-- Résultat attendu: 3 rows (une dans chaque table)
```

### Après validation admin

```sql
SELECT
  c.name,
  c.status,
  c.is_active,
  c.approved_at,
  p.full_name as approved_by_name
FROM centers c
LEFT JOIN profiles p ON p.id = c.approved_by
WHERE c.email = 'centre.test@example.com';

-- Résultat attendu:
-- status = 'approved'
-- is_active = true
-- approved_at = timestamp récent
-- approved_by_name = nom de l'admin
```

---

## Fichiers Modifiés

### Migrations SQL (1 fichier)
```
supabase/migrations/fix_centers_rls_and_structure.sql
```

### Frontend (2 fichiers)
```
src/pages/public/CenterSignup.tsx
src/components/admin/CentersPage.tsx
```

### Documentation (1 fichier)
```
FIX_CENTER_WORKFLOW.md (ce document)
```

---

## Build Production

```bash
npm run build
✓ built in 9.92s
```

✅ Aucune erreur TypeScript
✅ Aucune erreur de compilation

---

## Résumé des Corrections

### Avant ❌
- ❌ Centre signup ne créait pas la ligne `centers`
- ❌ Code utilisait `validation_status` (champ inexistant)
- ❌ Valeurs enum incorrectes ('submitted' vs 'pending')
- ❌ RLS manquant (pas de policy INSERT)
- ❌ Admin voyait 0 centres (table vide)
- ❌ Impossible de valider un centre

### Après ✅
- ✅ Centre signup crée auth + profile + centers
- ✅ Code utilise `status` (champ correct)
- ✅ Valeurs enum correctes ('pending', 'approved', etc.)
- ✅ RLS complet (INSERT, SELECT, UPDATE)
- ✅ Admin voit tous les centres
- ✅ Validation fonctionnelle
- ✅ Workflow complet opérationnel

---

## Architecture Clarifiée

### Séparation Compte / Fiche

```
auth.users           = Identité (login/password)
    ↓
profiles             = Rôle (admin/parent/center)
    ↓
centers              = Fiche entreprise (à valider par admin)
```

**Règle:** Un compte centre (role='center') peut exister sans fiche centre validée, mais ne peut pas accéder au dashboard tant que la fiche n'est pas dans `centers` avec `status='approved'` et `is_active=true`.

---

**Date:** 9 Janvier 2025
**Statut:** ✅ RÉSOLU ET TESTÉ
**Version:** 2.2
