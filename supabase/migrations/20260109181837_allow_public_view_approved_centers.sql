/*
  # Allow public access to approved centers

  ## Problem
  - Landing page tries to load approved centers
  - Anonymous users (not logged in) are blocked by RLS
  - This causes the landing page to fail silently

  ## Solution
  - Add RLS policy to allow anonymous users to view approved/active centers
  - This is safe as it only exposes public information about validated centers
*/

-- Policy: Allow public (anonymous) to view approved and active centers
CREATE POLICY "public_view_approved_centers"
  ON centers
  FOR SELECT
  TO anon
  USING (
    status = 'approved'
    AND is_active = true
  );

SELECT 'Public access to approved centers enabled' as message;
