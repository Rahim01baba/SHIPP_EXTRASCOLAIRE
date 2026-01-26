# Diagnostic Admin - Accès aux Inscriptions

## 🔍 Problème identifié et résolu

Les inscriptions créées par les parents n'apparaissaient pas dans l'interface admin.

## ✅ Corrections effectuées

### 1. **Nettoyage des Policies RLS**
- **Problème**: Plusieurs policies admin dupliquées sur la table `enrollments`
- **Solution**: Suppression de toutes les anciennes policies et création d'une seule policy complète
- **Policy finale**: `"Admins have full access to enrollments"` avec clauses USING et WITH CHECK

### 2. **Logs de Debug ajoutés**
Des logs détaillés ont été ajoutés dans `/src/components/admin/EnrollmentsPage.tsx`:
- Vérification du compte admin connecté
- Logs de la requête Supabase
- Affichage du nombre d'inscriptions retournées
- Affichage des statuts des inscriptions

### 3. **Message d'information UI**
Un message apparaît maintenant dans l'interface admin quand aucune inscription n'est trouvée, indiquant d'ouvrir la console pour voir les logs de debug.

## 🧪 Comment tester

### Étape 1: Créer une inscription parent
1. Se connecter en tant que parent
2. Aller dans "Inscriptions"
3. Cliquer sur "Nouvelle inscription"
4. Suivre le processus complet
5. ✅ L'inscription devrait avoir le statut `pending_admin_validation`

### Étape 2: Vérifier côté admin
1. Se connecter en tant qu'admin:
   - Email: `admin@shipp-edu.com` ou `admin@shipp.com`
   - Les deux comptes ont le rôle admin
2. Ouvrir la console du navigateur (F12)
3. Aller dans "Inscriptions"
4. Observer les logs dans la console qui commencent par `[ADMIN ENROLLMENTS]`

### Logs à vérifier
```
[ADMIN ENROLLMENTS] Current user: <user_id> <email>
[ADMIN ENROLLMENTS] User profile: { role: "admin" }
[ADMIN ENROLLMENTS] Loading enrollments for tab: pending
[ADMIN ENROLLMENTS] Filtering for pending statuses
[ADMIN ENROLLMENTS] Query result: {
  dataCount: X,
  error: null,
  firstItem: {...},
  statuses: [...]
}
```

## 🔧 Si le problème persiste

### Vérification 1: Confirmer que l'utilisateur est bien admin
```sql
SELECT id, email, role
FROM profiles
WHERE id = auth.uid();
```
Le rôle doit être `'admin'`

### Vérification 2: Vérifier que des inscriptions existent
```sql
SELECT id, status, created_at
FROM enrollments
ORDER BY created_at DESC
LIMIT 5;
```

### Vérification 3: Tester is_admin()
Dans la console Supabase SQL Editor:
```sql
SELECT is_admin();
```
Devrait retourner `true` quand connecté en tant qu'admin

### Vérification 4: Vérifier les policies RLS
```sql
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'enrollments'::regclass;
```

## 📊 Statuts d'inscription

L'admin doit voir les inscriptions selon les onglets:

| Onglet | Statuts filtrés |
|--------|----------------|
| À valider | `pending_admin_validation`, `pending` |
| Validées | `active`, `confirmed` |
| Annulées | `cancelled`, `rejected` |
| Toutes | Tous les statuts |

## 🔐 Comptes Admin disponibles

1. `admin@shipp-edu.com` - Compte principal
2. `admin@shipp.com` - Compte secondaire

Les deux ont le rôle `admin` dans la table `profiles`.

## 🚀 Migrations appliquées

1. `diagnose_admin_enrollment_access_v2` - Diagnostic des policies et données
2. `fix_admin_enrollment_policy_with_check` - Correction de la policy admin avec WITH CHECK

## 📝 Notes importantes

- Les logs de debug sont temporaires et peuvent être retirés en production
- La fonction `is_admin()` utilise `SECURITY DEFINER` pour vérifier le rôle sans récursion RLS
- Toutes les anciennes inscriptions avec statut `confirmed` apparaissent dans l'onglet "Validées"
- Les nouvelles inscriptions créées auront le statut `pending_admin_validation`
