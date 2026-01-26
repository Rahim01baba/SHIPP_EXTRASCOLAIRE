# Configuration Storage Supabase

## Bucket requis : child-photos

Pour que l'upload des photos d'enfants fonctionne, créez le bucket "child-photos" depuis le dashboard Supabase :

1. Aller dans Storage > Create bucket
2. Nom : `child-photos`
3. Public : Oui
4. File size limit : 5 MB
5. Allowed MIME types : image/jpeg, image/png, image/webp

## Policies RLS Storage

Appliquer ces policies sur le bucket :

```sql
-- SELECT/Download : Les parents peuvent voir les photos de leurs enfants
CREATE POLICY "Parents can view own children photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'child-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- INSERT/Upload : Les parents peuvent uploader des photos
CREATE POLICY "Parents can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'child-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE : Les parents peuvent remplacer leurs photos
CREATE POLICY "Parents can update photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'child-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE : Les parents peuvent supprimer leurs photos
CREATE POLICY "Parents can delete photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'child-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Structure des fichiers

```
child-photos/
  {parent_id}/
    {child_id}.jpg
    {child_id}.png
    {child_id}.webp
```

Cette structure garantit que chaque parent ne peut accéder qu'aux photos de ses propres enfants.
