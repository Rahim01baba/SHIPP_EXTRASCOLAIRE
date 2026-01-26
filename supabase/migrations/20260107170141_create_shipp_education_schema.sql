/*
  # SHIPP Éducation - Complete Database Schema
  
  ## Overview
  Platform for coordinating Saturday extracurricular activities with transportation services.
  Three user roles: Parents, Partner Centers, and Admins.
  
  ## New Tables
  
  ### 1. profiles
  - Extended user information beyond auth.users
  - Links to auth.users.id
  - Stores role, contact info, address
  
  ### 2. children
  - Child profiles managed by parents
  - Stores personal info, age, zone
  
  ### 3. zones
  - Geographic zones served by SHIPP
  - Used for transport planning
  
  ### 4. centers
  - Partner centers offering activities
  - Stores center details, capacity, insurance info
  
  ### 5. activities
  - Activities offered by centers
  - Only Saturday activities
  - Includes pricing (course + transport)
  
  ### 6. enrollments
  - Child enrollments in activities
  - Links children to activities
  - Tracks enrollment status and month
  
  ### 7. payments
  - Payment records for enrollments
  - Mobile Money integration ready
  - Monthly payment tracking
  
  ### 8. invoices
  - Automated PDF invoice records
  - Links to payments and enrollments
  
  ### 9. financial_distributions
  - Breakdown of payment allocation
  - Tracks center share, transport share, margin
  
  ### 10. transport_routes
  - Saturday transport routes by zone
  - Capacity and status tracking
  
  ### 11. route_assignments
  - Children assigned to specific routes
  - Pickup time estimates
  
  ### 12. notifications
  - System notifications for users
  - Email/SMS ready
  
  ### 13. pricing_history
  - Historical record of pricing changes
  - Audit trail for tariff modifications
  
  ## Security
  - RLS enabled on all tables
  - Role-based access policies
  - Parents can only access their own data
  - Centers can only see their enrollments
  - Admins have full access
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('parent', 'center', 'admin');
CREATE TYPE enrollment_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('mobile_money', 'bank_transfer', 'cash');
CREATE TYPE route_status AS ENUM ('planned', 'confirmed', 'cancelled', 'completed');
CREATE TYPE notification_type AS ENUM ('enrollment', 'payment', 'route', 'general');
CREATE TYPE activity_type AS ENUM ('painting', 'music', 'sport', 'robotics', 'aviation', 'language', 'science', 'theater', 'dance', 'other');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'parent',
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text,
  zone_id uuid,
  center_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Centers table
CREATE TABLE IF NOT EXISTS centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  activity_type activity_type NOT NULL,
  description text,
  address text NOT NULL,
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  age_min integer NOT NULL DEFAULT 5,
  age_max integer NOT NULL DEFAULT 18,
  max_capacity integer NOT NULL DEFAULT 20,
  current_capacity integer DEFAULT 0,
  insurance_info text,
  logo_url text,
  images jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key for zone_id in profiles
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_zone 
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;

-- Add foreign key for center_id in profiles
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_center 
  FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE SET NULL;

-- Children table
CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  age integer,
  zone_id uuid REFERENCES zones(id) ON DELETE SET NULL,
  medical_info text,
  emergency_contact text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  day_of_week integer DEFAULT 6,
  start_time time NOT NULL,
  end_time time NOT NULL,
  sessions_per_month integer DEFAULT 4,
  course_price decimal(10,2) NOT NULL,
  transport_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) GENERATED ALWAYS AS (course_price + transport_price) STORED,
  max_participants integer DEFAULT 20,
  current_participants integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_month date NOT NULL,
  status enrollment_status DEFAULT 'pending',
  course_price decimal(10,2) NOT NULL,
  transport_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(child_id, activity_id, enrollment_month)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method payment_method DEFAULT 'mobile_money',
  payment_reference text UNIQUE NOT NULL,
  status payment_status DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  invoice_date date DEFAULT CURRENT_DATE,
  child_name text NOT NULL,
  activity_name text NOT NULL,
  center_name text NOT NULL,
  course_price decimal(10,2) NOT NULL,
  transport_price decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

-- Financial distributions table
CREATE TABLE IF NOT EXISTS financial_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  total_amount decimal(10,2) NOT NULL,
  center_share decimal(10,2) NOT NULL,
  transport_share decimal(10,2) NOT NULL,
  shipp_margin decimal(10,2) NOT NULL,
  distribution_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Transport routes table
CREATE TABLE IF NOT EXISTS transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  route_name text NOT NULL,
  route_date date NOT NULL,
  vehicle_capacity integer NOT NULL DEFAULT 10,
  current_capacity integer DEFAULT 0,
  minimum_children integer DEFAULT 3,
  status route_status DEFAULT 'planned',
  estimated_departure time,
  driver_name text,
  vehicle_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Route assignments table
CREATE TABLE IF NOT EXISTS route_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  pickup_time time,
  pickup_address text,
  dropoff_time time,
  created_at timestamptz DEFAULT now(),
  UNIQUE(route_id, child_id, enrollment_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Pricing history table
CREATE TABLE IF NOT EXISTS pricing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  course_price decimal(10,2) NOT NULL,
  transport_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  change_reason text,
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for zones
CREATE POLICY "Anyone can view active zones"
  ON zones FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage zones"
  ON zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for centers
CREATE POLICY "Anyone can view active centers"
  ON centers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Centers can view own center"
  ON centers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.center_id = centers.id
    )
  );

CREATE POLICY "Centers can update own center"
  ON centers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.center_id = centers.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.center_id = centers.id
    )
  );

CREATE POLICY "Admins can manage centers"
  ON centers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for children
CREATE POLICY "Parents can view own children"
  ON children FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can manage own children"
  ON children FOR ALL
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Admins can view all children"
  ON children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for activities
CREATE POLICY "Anyone can view active activities"
  ON activities FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Centers can manage own activities"
  ON activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.center_id = activities.center_id
    )
  );

CREATE POLICY "Admins can manage activities"
  ON activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for enrollments
CREATE POLICY "Parents can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can create own enrollments"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Centers can view their enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN activities a ON p.center_id = a.center_id
      WHERE p.id = auth.uid()
      AND a.id = enrollments.activity_id
    )
  );

CREATE POLICY "Admins can manage enrollments"
  ON enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for payments
CREATE POLICY "Parents can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can create own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Parents can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for financial_distributions
CREATE POLICY "Centers can view own distributions"
  ON financial_distributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.center_id = financial_distributions.center_id
    )
  );

CREATE POLICY "Admins can manage distributions"
  ON financial_distributions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for transport_routes
CREATE POLICY "Anyone can view confirmed routes"
  ON transport_routes FOR SELECT
  TO authenticated
  USING (status = 'confirmed');

CREATE POLICY "Admins can manage routes"
  ON transport_routes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for route_assignments
CREATE POLICY "Parents can view own route assignments"
  ON route_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = route_assignments.child_id
      AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage route assignments"
  ON route_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for pricing_history
CREATE POLICY "Anyone can view pricing history"
  ON pricing_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create pricing history"
  ON pricing_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_center ON profiles(center_id);
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_zone ON children(zone_id);
CREATE INDEX IF NOT EXISTS idx_centers_zone ON centers(zone_id);
CREATE INDEX IF NOT EXISTS idx_centers_active ON centers(is_active);
CREATE INDEX IF NOT EXISTS idx_activities_center ON activities(center_id);
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active);
CREATE INDEX IF NOT EXISTS idx_enrollments_child ON enrollments(child_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_activity ON enrollments(activity_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_parent ON enrollments(parent_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_month ON enrollments(enrollment_month);
CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent ON payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment ON invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_parent ON invoices(parent_id);
CREATE INDEX IF NOT EXISTS idx_financial_center ON financial_distributions(center_id);
CREATE INDEX IF NOT EXISTS idx_routes_zone ON transport_routes(zone_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON transport_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_route_assignments_route ON route_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_child ON route_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Create functions for automatic calculations
CREATE OR REPLACE FUNCTION update_center_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE centers
    SET current_capacity = current_capacity + 1
    WHERE id = (SELECT center_id FROM activities WHERE id = NEW.activity_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE centers
    SET current_capacity = GREATEST(0, current_capacity - 1)
    WHERE id = (SELECT center_id FROM activities WHERE id = OLD.activity_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_activity_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE activities
    SET current_participants = current_participants + 1
    WHERE id = NEW.activity_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
    UPDATE activities
    SET current_participants = current_participants + 1
    WHERE id = NEW.activity_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
    UPDATE activities
    SET current_participants = GREATEST(0, current_participants - 1)
    WHERE id = NEW.activity_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE activities
    SET current_participants = GREATEST(0, current_participants - 1)
    WHERE id = OLD.activity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_route_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE transport_routes
    SET current_capacity = current_capacity + 1
    WHERE id = NEW.route_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE transport_routes
    SET current_capacity = GREATEST(0, current_capacity - 1)
    WHERE id = OLD.route_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_activity_participants ON enrollments;
CREATE TRIGGER trigger_update_activity_participants
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_participants();

DROP TRIGGER IF EXISTS trigger_update_route_capacity ON route_assignments;
CREATE TRIGGER trigger_update_route_capacity
  AFTER INSERT OR DELETE ON route_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_route_capacity();

-- Insert some initial zones
INSERT INTO zones (name, description, is_active) VALUES
  ('Zone Nord', 'Quartiers nord de la ville', true),
  ('Zone Sud', 'Quartiers sud de la ville', true),
  ('Zone Est', 'Quartiers est de la ville', true),
  ('Zone Ouest', 'Quartiers ouest de la ville', true),
  ('Zone Centre', 'Centre ville', true)
ON CONFLICT DO NOTHING;