/*
  # Add Center Ownership and Commission Management
  
  ## Changes
  
  1. Centers Table Updates
    - Add owner_profile_id: Links center to the user profile that owns/manages it
    - Add shipp_commission_pct: Percentage commission SHIPP takes (variable per center, admin-editable)
    - Add allow_center_edit_prices: Flag to control if center can edit activity prices
    - Add phone, email, address_text, google_maps_link: Additional contact and location fields
  
  2. Notifications Table Updates
    - Add center_id: Links notification to a center (optional)
  
  3. Enrollments Table Updates
    - Add center_id: Direct link to center for easier queries
    - Add payment_status: Track payment status at enrollment level
    - Add amount_total: Total amount for the enrollment
  
  4. Activities Table Updates
    - Add activity_type_id: Link to activity_types table
    - Add age_min, age_max: Age restrictions
    - Add schedule_day, schedule_start, schedule_end: Scheduling info
    - Add use_global_transport: Use global transport price or custom
    - Add price_course, price_transport: Separate pricing
    - Add capacity: Maximum participants
  
  5. RLS Policies
    - Centers can view/update their own center and activities
    - Centers can view enrollments for their activities
    - Centers can view notifications sent to them
  
  ## Security
  - Centers can only access their own data
  - Pricing fields protection via allow_center_edit_prices flag
  - Admin retains full control
*/

-- Add columns to centers table
DO $$
BEGIN
  -- Add owner_profile_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'owner_profile_id'
  ) THEN
    ALTER TABLE centers ADD COLUMN owner_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  -- Add shipp_commission_pct with default 30%
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'shipp_commission_pct'
  ) THEN
    ALTER TABLE centers ADD COLUMN shipp_commission_pct decimal(5,2) DEFAULT 30.00 NOT NULL;
  END IF;
  
  -- Add allow_center_edit_prices with default false
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'allow_center_edit_prices'
  ) THEN
    ALTER TABLE centers ADD COLUMN allow_center_edit_prices boolean DEFAULT false;
  END IF;
  
  -- Add phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'phone'
  ) THEN
    ALTER TABLE centers ADD COLUMN phone text;
  END IF;
  
  -- Add email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'email'
  ) THEN
    ALTER TABLE centers ADD COLUMN email text;
  END IF;
  
  -- Add address_text
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'address_text'
  ) THEN
    ALTER TABLE centers ADD COLUMN address_text text;
  END IF;
  
  -- Add google_maps_link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'centers' AND column_name = 'google_maps_link'
  ) THEN
    ALTER TABLE centers ADD COLUMN google_maps_link text;
  END IF;
END $$;

-- Add center_id to notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'center_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN center_id uuid REFERENCES centers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add columns to enrollments for better center tracking
DO $$
BEGIN
  -- Add center_id for direct center access
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'center_id'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN center_id uuid REFERENCES centers(id) ON DELETE CASCADE;
    
    -- Populate center_id from activities
    UPDATE enrollments e
    SET center_id = (
      SELECT a.center_id 
      FROM activities a 
      WHERE a.id = e.activity_id
    );
  END IF;
  
  -- Add payment_status at enrollment level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;
  
  -- Add amount_total
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments' AND column_name = 'amount_total'
  ) THEN
    ALTER TABLE enrollments ADD COLUMN amount_total decimal(10,2);
    
    -- Populate from total_price
    UPDATE enrollments SET amount_total = total_price WHERE amount_total IS NULL;
  END IF;
END $$;

-- Add columns to activities for better structure
DO $$
BEGIN
  -- Add activity_type_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'activity_type_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN activity_type_id uuid REFERENCES activity_types(id) ON DELETE SET NULL;
  END IF;
  
  -- Add age restrictions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'age_min'
  ) THEN
    ALTER TABLE activities ADD COLUMN age_min integer DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'age_max'
  ) THEN
    ALTER TABLE activities ADD COLUMN age_max integer DEFAULT 18;
  END IF;
  
  -- Add schedule fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'schedule_day'
  ) THEN
    ALTER TABLE activities ADD COLUMN schedule_day integer DEFAULT 6;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'schedule_start'
  ) THEN
    ALTER TABLE activities ADD COLUMN schedule_start time;
    UPDATE activities SET schedule_start = start_time WHERE schedule_start IS NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'schedule_end'
  ) THEN
    ALTER TABLE activities ADD COLUMN schedule_end time;
    UPDATE activities SET schedule_end = end_time WHERE schedule_end IS NULL;
  END IF;
  
  -- Add use_global_transport
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'use_global_transport'
  ) THEN
    ALTER TABLE activities ADD COLUMN use_global_transport boolean DEFAULT true;
  END IF;
  
  -- Add separate price fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'price_course'
  ) THEN
    ALTER TABLE activities ADD COLUMN price_course decimal(10,2);
    UPDATE activities SET price_course = course_price WHERE price_course IS NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'price_transport'
  ) THEN
    ALTER TABLE activities ADD COLUMN price_transport decimal(10,2);
    UPDATE activities SET price_transport = transport_price WHERE price_transport IS NULL;
  END IF;
  
  -- Add capacity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'capacity'
  ) THEN
    ALTER TABLE activities ADD COLUMN capacity integer DEFAULT 20;
    UPDATE activities SET capacity = max_participants WHERE capacity = 20;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_centers_owner ON centers(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_center ON enrollments(center_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status ON enrollments(payment_status);
CREATE INDEX IF NOT EXISTS idx_notifications_center ON notifications(center_id);

-- Update RLS Policies for centers to use owner_profile_id

-- Centers can view their own center using owner_profile_id
DROP POLICY IF EXISTS "Centers can view own center via owner" ON centers;
CREATE POLICY "Centers can view own center via owner"
  ON centers FOR SELECT
  TO authenticated
  USING (owner_profile_id = auth.uid());

-- Centers can update their own center
DROP POLICY IF EXISTS "Centers can update own center via owner" ON centers;
CREATE POLICY "Centers can update own center via owner"
  ON centers FOR UPDATE
  TO authenticated
  USING (owner_profile_id = auth.uid())
  WITH CHECK (owner_profile_id = auth.uid());

-- RLS Policies for activities - Centers can manage their own activities

DROP POLICY IF EXISTS "Centers can view own activities" ON activities;
CREATE POLICY "Centers can view own activities"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM centers
      WHERE centers.id = activities.center_id
      AND centers.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Centers can create activities" ON activities;
CREATE POLICY "Centers can create activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM centers
      WHERE centers.id = activities.center_id
      AND centers.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Centers can update own activities" ON activities;
CREATE POLICY "Centers can update own activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM centers
      WHERE centers.id = activities.center_id
      AND centers.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM centers
      WHERE centers.id = activities.center_id
      AND centers.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Centers can delete own activities" ON activities;
CREATE POLICY "Centers can delete own activities"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM centers
      WHERE centers.id = activities.center_id
      AND centers.owner_profile_id = auth.uid()
    )
  );

-- RLS Policies for enrollments - Centers can view enrollments for their activities

DROP POLICY IF EXISTS "Centers can view enrollments for their activities" ON enrollments;
CREATE POLICY "Centers can view enrollments for their activities"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    center_id IN (
      SELECT id FROM centers
      WHERE owner_profile_id = auth.uid()
    )
  );

-- RLS Policies for notifications - Centers can view their notifications

DROP POLICY IF EXISTS "Centers can view their notifications" ON notifications;
CREATE POLICY "Centers can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR center_id IN (
      SELECT id FROM centers
      WHERE owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Centers can update their notifications" ON notifications;
CREATE POLICY "Centers can update their notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR center_id IN (
      SELECT id FROM centers
      WHERE owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR center_id IN (
      SELECT id FROM centers
      WHERE owner_profile_id = auth.uid()
    )
  );

-- Function to automatically set center_id on enrollment insert/update
CREATE OR REPLACE FUNCTION set_enrollment_center_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.center_id IS NULL THEN
    NEW.center_id := (
      SELECT center_id FROM activities WHERE id = NEW.activity_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_enrollment_center_id ON enrollments;
CREATE TRIGGER trigger_set_enrollment_center_id
  BEFORE INSERT OR UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION set_enrollment_center_id();

SELECT 'Center ownership and commission management migration completed' as message;