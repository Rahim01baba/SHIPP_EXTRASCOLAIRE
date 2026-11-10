/*
  # Lecture publique des types d'activités et des activités

  ## Problème
  - La page d'accueil (visiteurs non connectés) doit lister, par catégorie,
    les centres partenaires et leurs activités.
  - activity_types et activities ne sont lisibles que par les utilisateurs
    connectés : pour un visiteur, les requêtes renvoient une liste vide.
    (Effet de bord : la liste des types d'activités est aussi vide dans le
    formulaire public « Devenir centre partenaire ».)

  ## Solution
  - Autoriser le rôle anon à LIRE uniquement :
    - les types d'activités actifs ;
    - les activités actives des centres approuvés et actifs.
  - Aucune écriture n'est ouverte.
*/

DROP POLICY IF EXISTS "anon_view_active_activity_types" ON activity_types;
CREATE POLICY "anon_view_active_activity_types"
  ON activity_types
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "anon_view_activities_of_approved_centers" ON activities;
CREATE POLICY "anon_view_activities_of_approved_centers"
  ON activities
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM centers
      WHERE centers.id = activities.center_id
        AND centers.status = 'approved'
        AND centers.is_active = true
    )
  );
