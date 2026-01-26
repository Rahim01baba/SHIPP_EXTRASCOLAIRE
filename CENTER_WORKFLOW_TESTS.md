# Tests du Workflow Centres Corrigé - 9 Janvier 2025

## Fichiers Modifiés ✅

### Frontend (9 fichiers)
1. `src/pages/center/CenterDashboard.tsx` - **Interface `Center` corrigée + Fix loading infini**
2. `src/components/center/CenterProfilePage.tsx` - Badge statut + interface corrigée
3. `src/pages/public/CenterSignup.tsx` - Création fiche `centers` avec `status='pending'`
4. `src/components/admin/CentersPage.tsx` - Liste + validation centres
5. `src/components/admin/EditCenterModal.tsx` - Édition centre (statut + formulaire)
6. `src/components/admin/DashboardPage.tsx` - Chargement centres validés
7. `src/components/admin/DistributionsPage.tsx` - Répartitions centres actifs
8. `src/components/parent/NewEnrollmentModal.tsx` - Liste centres pour inscription
9. `src/pages/public/LandingPage.tsx` - Centres partenaires sur landing page

### Bugs Critiques Corrigés
- ✅ **Loading infini** - `loadCenter()` et `loadUnreadNotifications()` gèrent maintenant correctement `profile=null`
- ✅ **useEffect optimisés** - Séparés et ciblés sur les bonnes dépendances (`profile?.id`, `profile?.role`, `center?.id`)
- ✅ **Guard clauses** - Vérification `profile.role !== 'center'` pour empêcher accès non-autorisé

### Migrations SQL (1 fichier)
1. `supabase/migrations/fix_centers_rls_and_structure.sql` - RLS policies corrigées

---

## Corrections Appliquées

### 1. Alignement des Champs

**AVANT (bugué):**
```typescript
validation_status: 'submitted' | 'validated' | 'rejected' | 'suspended'
```

**APRÈS (corrigé):**
```typescript
status: 'pending' | 'approved' | 'rejected' | 'suspended'
```

### 2. Mapping Complet

| Code Avant | Code Après | Signification |
|------------|------------|---------------|
| `validation_status` | `status` | Nom du champ |
| `'submitted'` | `'pending'` | En attente de validation |
| `'validated'` | `'approved'` | Validé et actif |
| `'rejected'` | `'rejected'` | Refusé |
| `'suspended'` | `'suspended'` | Suspendu |

### 3. Corrections Spécifiques par Fichier

#### CenterSignup.tsx
```typescript
// AVANT
const centerData = {
  validation_status: 'submitted',
  is_active: true,  // ❌ Ne devrait pas être actif par défaut
};

// APRÈS
const centerData = {
  owner_profile_id: user.id,  // ✅ Lien vers le compte
  status: 'pending',          // ✅ En attente
  is_active: false,           // ✅ Désactivé par défaut
};
```

#### CentersPage.tsx (Admin)
```typescript
// AVANT
query.eq('validation_status', filterStatus);
update({ validation_status: 'validated' });

// APRÈS
query.eq('status', filterStatus);
update({
  status: 'approved',
  is_active: true,
  approved_at: new Date().toISOString(),
  approved_by: profile.id
});
```

#### NewEnrollmentModal.tsx (Parent)
```typescript
// AVANT
.eq('validation_status', 'validated')

// APRÈS
.eq('status', 'approved')
.eq('is_active', true)
```

#### CenterDashboard.tsx
```typescript
// Interface corrigée
interface Center {
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  is_active: boolean;
  shipp_commission_pct: number | null;  // Peut être NULL
  allow_center_edit_prices: boolean | null;
}
```

---

## Requêtes SQL de Vérification

### Test 1: Vérifier un centre créé

```sql
-- Après qu'un centre s'inscrive sur /center-signup
SELECT
  c.id,
  c.name,
  c.owner_profile_id,
  c.status,
  c.is_active,
  c.created_at,
  p.email as owner_email,
  p.full_name as owner_name
FROM centers c
LEFT JOIN profiles p ON p.id = c.owner_profile_id
WHERE c.email = 'votre-centre-test@example.com';
```

**Résultat attendu:**
- ✅ 1 ligne retournée
- ✅ `status = 'pending'`
- ✅ `is_active = false`
- ✅ `owner_profile_id` correspond à l'ID du profil créé

---

### Test 2: Vérifier centres visibles pour l'admin

```sql
-- Tous les centres (vue admin)
SELECT
  id,
  name,
  status,
  is_active,
  created_at,
  approved_at,
  approved_by
FROM centers
ORDER BY created_at DESC;
```

**Résultat attendu:**
- ✅ Tous les centres visibles (y compris pending, approved, rejected, suspended)
- ✅ Le centre test créé apparaît avec `status='pending'`

---

### Test 3: Centres visibles pour les parents (inscription)

```sql
-- Centres disponibles pour inscription (vue parent)
SELECT
  id,
  name,
  address_text,
  status,
  is_active
FROM centers
WHERE status = 'approved'
  AND is_active = true
ORDER BY name;
```

**Résultat attendu:**
- ✅ Seulement les centres avec `status='approved'` ET `is_active=true`
- ✅ Le centre test créé n'apparaît PAS (car status='pending')

---

### Test 4: Après validation admin

```sql
-- Le centre doit être validé et actif
SELECT
  c.id,
  c.name,
  c.status,
  c.is_active,
  c.approved_at,
  c.approved_by,
  p.full_name as approved_by_name
FROM centers c
LEFT JOIN profiles p ON p.id = c.approved_by
WHERE c.email = 'votre-centre-test@example.com';
```

**Résultat attendu:**
- ✅ `status = 'approved'`
- ✅ `is_active = true`
- ✅ `approved_at` est rempli (timestamp récent)
- ✅ `approved_by` contient l'ID de l'admin
- ✅ `approved_by_name` affiche le nom de l'admin

---

### Test 5: Vérifier lien compte ↔ fiche

```sql
-- Vérifier qu'un compte centre a bien sa fiche
SELECT
  p.id as profile_id,
  p.email,
  p.role,
  p.full_name,
  c.id as center_id,
  c.name as center_name,
  c.status,
  c.is_active
FROM profiles p
LEFT JOIN centers c ON c.owner_profile_id = p.id
WHERE p.role = 'center'
  AND p.email = 'votre-centre-test@example.com';
```

**Résultat attendu:**
- ✅ 1 ligne retournée
- ✅ `profile_id` et `center_id` sont tous deux remplis (NOT NULL)
- ✅ Lien correct entre le compte (profiles) et la fiche (centers)

---

## Tests UI - Étape par Étape

### Test UI 1: Inscription Centre

**Objectif:** Vérifier que l'inscription centre crée bien la fiche dans `centers`

**Étapes:**

1. **Ouvrir** `/center-signup`
2. **Étape 1 - Informations compte:**
   - Nom responsable: "Jean Dupont"
   - Email: "centre.test@example.com"
   - Téléphone: "+225 01 02 03 04 05"
   - Nom du centre: "Centre ABC Formation"
   - Mot de passe: "Test123!"
   - Cliquer "Suivant"

3. **Étape 2 - Informations centre:**
   - Adresse: "Cocody, Riviera Golf, Abidjan"
   - Description: "Centre de formation sportive et artistique"
   - Lien Google Maps: (optionnel)
   - Logo: (optionnel)
   - Ajouter au moins 1 activité:
     - Nom: "Cours de Football"
     - Type: Sport
     - Tarif cours: 20000
     - Tarif transport: 5000
   - Cliquer "Finaliser l'inscription"

4. **Résultat attendu:**
   - ✅ Message de succès affiché
   - ✅ Pas d'erreur console
   - ✅ Redirection ou indication que le compte est en attente

5. **Vérification SQL:**
   ```sql
   SELECT * FROM centers WHERE email = 'centre.test@example.com';
   ```
   - ✅ 1 ligne retournée avec `status='pending'`, `is_active=false`

6. **Vérification Admin:**
   - Se connecter en tant qu'admin
   - Aller sur "Centres"
   - Filtre "En attente"
   - ✅ Le centre "Centre ABC Formation" doit apparaître

---

### Test UI 2: Validation Admin

**Objectif:** Vérifier que l'admin peut valider le centre

**Étapes:**

1. **Se connecter en tant qu'admin** (token ou email/password admin)
2. **Naviguer vers** "Centres"
3. **Cliquer sur filtre** "En attente"
4. **Résultat attendu:**
   - ✅ Centre "Centre ABC Formation" visible
   - ✅ Badge jaune "En attente"
   - ✅ Boutons "Valider" et "Refuser" visibles

5. **Cliquer sur** "Valider"
6. **Résultat attendu:**
   - ✅ Message "Centre validé avec succès"
   - ✅ Le centre disparaît du filtre "En attente"

7. **Cliquer sur filtre** "Validés"
8. **Résultat attendu:**
   - ✅ Centre "Centre ABC Formation" visible
   - ✅ Badge vert "Validé"
   - ✅ Bouton "Suspendre" visible

9. **Vérification SQL:**
   ```sql
   SELECT status, is_active, approved_at, approved_by
   FROM centers
   WHERE email = 'centre.test@example.com';
   ```
   - ✅ `status = 'approved'`
   - ✅ `is_active = true`
   - ✅ `approved_at` est rempli
   - ✅ `approved_by` contient ID admin

---

### Test UI 3: Dashboard Centre Après Validation

**Objectif:** Vérifier que le centre peut accéder son dashboard après validation

**Étapes:**

1. **Se déconnecter de l'admin**
2. **Se connecter avec** "centre.test@example.com"
3. **Résultat attendu:**
   - ✅ Routing vers `/center-dashboard`
   - ✅ Dashboard centre visible et fonctionnel
   - ✅ Nom du centre affiché dans la navbar
   - ✅ Pas de message "Centre introuvable"

4. **Cliquer sur onglet** "Mon centre"
5. **Résultat attendu:**
   - ✅ Badge vert "Validé" visible
   - ✅ Informations du centre affichées correctement
   - ✅ Possibilité de modifier téléphone, email, adresse, etc.

6. **Cliquer sur onglet** "Mes activités"
7. **Résultat attendu:**
   - ✅ L'activité "Cours de Football" créée lors de l'inscription est visible

---

### Test UI 4: Visibilité Parents

**Objectif:** Vérifier que les parents voient seulement les centres validés

**Étapes:**

1. **Se connecter en tant que parent**
2. **Créer ou accéder à** "Nouvelle Inscription"
3. **Étape "Choisir un centre"**
4. **Résultat attendu:**
   - ✅ Centre "Centre ABC Formation" visible dans la liste
   - ✅ Seulement les centres avec `status='approved'` ET `is_active=true` sont visibles

5. **Retourner à l'admin** et suspendre le centre
6. **Rafraîchir la page d'inscription parent**
7. **Résultat attendu:**
   - ✅ Centre "Centre ABC Formation" n'apparaît PLUS dans la liste

---

### Test UI 5: Refus Centre

**Objectif:** Vérifier le workflow de refus d'un centre

**Étapes:**

1. **Créer un nouveau centre de test** (répéter Test UI 1)
   - Email: "centre.test2@example.com"
   - Nom: "Centre XYZ"

2. **Se connecter admin**
3. **Aller sur** "Centres" → Filtre "En attente"
4. **Cliquer sur** "Refuser" pour le centre "Centre XYZ"
5. **Entrer un motif:** "Documents incomplets"
6. **Cliquer OK**
7. **Résultat attendu:**
   - ✅ Message "Centre refusé"
   - ✅ Le centre disparaît du filtre "En attente"

8. **Cliquer sur filtre** "Refusés"
9. **Résultat attendu:**
   - ✅ Centre "Centre XYZ" visible
   - ✅ Badge rouge "Refusé"
   - ✅ Motif "Documents incomplets" visible

10. **Vérification SQL:**
    ```sql
    SELECT status, is_active, rejected_reason
    FROM centers
    WHERE email = 'centre.test2@example.com';
    ```
    - ✅ `status = 'rejected'`
    - ✅ `is_active = false`
    - ✅ `rejected_reason = 'Documents incomplets'`

---

### Test UI 6: Centre Suspendu

**Objectif:** Vérifier le workflow de suspension d'un centre actif

**Étapes:**

1. **Se connecter admin**
2. **Aller sur** "Centres" → Filtre "Validés"
3. **Cliquer sur** "Suspendre" pour un centre actif
4. **Confirmer** la suspension
5. **Résultat attendu:**
   - ✅ Message "Centre suspendu"
   - ✅ Le centre disparaît du filtre "Validés"

6. **Cliquer sur filtre** "Suspendus"
7. **Résultat attendu:**
   - ✅ Le centre apparaît avec badge gris/orange "Suspendu"

8. **Test visibilité parent:**
   - Se connecter en tant que parent
   - Créer nouvelle inscription
   - ✅ Le centre suspendu n'apparaît PAS dans la liste

9. **Test dashboard centre:**
   - Se connecter avec le compte du centre suspendu
   - ✅ Dashboard affiche un message "Compte suspendu" ou badge "Suspendu"

---

## Résolution des Bugs Signalés

### Bug 1: "Admin ne voit aucun centre"

**Cause:** Inscription centre ne créait pas la ligne dans `centers`, seulement dans `auth.users` + `profiles`

**Solution:**
- ✅ CenterSignup.tsx crée maintenant la fiche dans `centers` après `signUp()`
- ✅ Champs corrects: `status='pending'`, `is_active=false`, `owner_profile_id=user.id`

---

### Bug 2: "Centre inscrit ne peut pas se connecter au dashboard"

**Cause 1:** Aucune fiche `centers` liée au compte
**Cause 2:** RLS bloquait l'accès

**Solution:**
- ✅ Fiche `centers` créée lors de l'inscription
- ✅ RLS policy ajoutée: `owner_profile_id = auth.uid()` permet au centre de voir sa fiche

---

### Bug 3: "Parents ne voient pas les centres dans l'inscription"

**Cause:** Code utilisait `validation_status='validated'` mais DB utilise `status='approved'`

**Solution:**
- ✅ Tous les fichiers corrigés pour utiliser `status='approved'`
- ✅ Filter strict: `status='approved' AND is_active=true`

---

### Bug 4: "Besoin de rafraîchir pour voir les données"

**Cause:** Pas de refetch après update/insert

**Solution:**
- ✅ Ajout de `loadCenters()` après chaque action admin (validate, reject, suspend)
- ✅ Callback `onSuccess()` dans les modales pour refetch dans la page parent

---

## Checklist de Validation Complète

### Backend (Database)

- [ ] Table `centers` a bien la colonne `status` (enum: pending, approved, rejected, suspended)
- [ ] Table `centers` a la colonne `owner_profile_id` (NOT NULL, FK vers profiles)
- [ ] RLS policies permettent:
  - [ ] INSERT par centre (owner_profile_id = auth.uid())
  - [ ] SELECT par centre (sa propre fiche)
  - [ ] SELECT par admin (tout)
  - [ ] SELECT par parent (seulement approved + active)

### Frontend - Inscription Centre

- [ ] Étape 1 crée auth.users + profiles via trigger
- [ ] Étape 2 crée la ligne dans centers avec:
  - [ ] `owner_profile_id = user.id`
  - [ ] `status = 'pending'`
  - [ ] `is_active = false`
- [ ] Gestion d'erreurs claire (message + logs console)

### Frontend - Admin

- [ ] Liste centres chargée depuis table `centers` (pas profiles)
- [ ] Filtres utilisent `status` ('pending', 'approved', 'rejected', 'suspended')
- [ ] Validation met:
  - [ ] `status = 'approved'`
  - [ ] `is_active = true`
  - [ ] `approved_at` + `approved_by`
- [ ] Refus met:
  - [ ] `status = 'rejected'`
  - [ ] `is_active = false`
  - [ ] `rejected_reason`
- [ ] Suspension met:
  - [ ] `status = 'suspended'`
  - [ ] `is_active = false`
- [ ] Refetch automatique après chaque action

### Frontend - Centre

- [ ] Dashboard charge `centers` via `owner_profile_id = auth.uid()`
- [ ] Si aucune fiche trouvée → message clair "Centre introuvable"
- [ ] Badge statut affiche correctement (pending/approved/rejected/suspended)
- [ ] Centre peut modifier ses infos (sauf status/is_active)

### Frontend - Parent

- [ ] Liste centres filtre sur `status='approved' AND is_active=true`
- [ ] Centres suspendus/refusés/en attente n'apparaissent PAS

---

## Commandes de Débogage

### Vérifier tous les centres dans la DB

```sql
SELECT
  id,
  name,
  email,
  status,
  is_active,
  owner_profile_id,
  created_at,
  approved_at
FROM centers
ORDER BY created_at DESC;
```

### Vérifier lien compte ↔ fiche pour tous les centres

```sql
SELECT
  p.email as compte_email,
  p.role,
  c.name as centre_name,
  c.status,
  c.is_active
FROM profiles p
LEFT JOIN centers c ON c.owner_profile_id = p.id
WHERE p.role = 'center';
```

### Compter centres par statut

```sql
SELECT
  status,
  is_active,
  COUNT(*) as count
FROM centers
GROUP BY status, is_active
ORDER BY status;
```

### Trouver centres orphelins (compte sans fiche)

```sql
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role
FROM profiles p
LEFT JOIN centers c ON c.owner_profile_id = p.id
WHERE p.role = 'center'
  AND c.id IS NULL;
```

Si cette requête retourne des lignes, c'est qu'il y a des comptes centres sans fiche associée (bug).

---

## Résumé des Corrections

### Avant ❌

- ❌ Code utilisait `validation_status` (champ inexistant en DB)
- ❌ Valeurs enum incorrectes ('submitted', 'validated')
- ❌ CenterSignup ne créait pas la fiche `centers`
- ❌ RLS manquait (pas de policy INSERT pour centres)
- ❌ Admin ne voyait rien (table vide)
- ❌ Parents ne voyaient pas les centres (mauvais filter)
- ❌ Refresh nécessaire pour voir les changements

### Après ✅

- ✅ Code utilise `status` (champ correct)
- ✅ Valeurs enum correctes ('pending', 'approved', 'rejected', 'suspended')
- ✅ CenterSignup crée compte + fiche en 2 étapes
- ✅ RLS complet (INSERT, SELECT avec bonnes règles)
- ✅ Admin voit tous les centres
- ✅ Parents voient seulement centres validés et actifs
- ✅ Refetch automatique après actions

---

**Date:** 9 Janvier 2025
**Statut:** ✅ COMPLÈTEMENT ALIGNÉ
**Version:** 3.0

---

## Notes Importantes

1. **Ne pas confondre:**
   - `profiles.role='center'` = Type de compte utilisateur
   - `centers.status='approved'` = État de validation de la fiche centre

2. **Workflow correct:**
   ```
   Inscription → auth.users + profiles (role='center')
              → centers (status='pending', is_active=false)
   Validation admin → centers.status='approved', is_active=true
   ```

3. **Un centre peut avoir 4 états:**
   - `pending` → En attente de validation admin (invisible aux parents)
   - `approved` + `is_active=true` → Validé et actif (visible aux parents)
   - `rejected` → Refusé (invisible aux parents)
   - `suspended` → Suspendu (invisible aux parents, mais peut redevenir actif)

4. **Sécurité RLS:**
   - Parents ne voient JAMAIS les centres non validés/inactifs
   - Centres ne voient que leur propre fiche
   - Admin voit tout (via fonction `is_admin()`)
