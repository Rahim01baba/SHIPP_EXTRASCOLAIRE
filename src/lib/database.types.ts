export type Json =
    | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'parent' | 'center' | 'admin';
export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'pending_admin_validation' | 'active' | 'rejected';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'mobile_money' | 'bank_transfer' | 'cash';
export type RouteStatus = 'planned' | 'confirmed' | 'cancelled' | 'completed';
export type NotificationType = 'enrollment' | 'payment' | 'route' | 'general';
export type ActivityType = 'painting' | 'music' | 'sport' | 'robotics' | 'aviation' | 'language' | 'science' | 'theater' | 'dance' | 'other';
export type CenterValidationStatus = 'submitted' | 'validated' | 'rejected' | 'suspended';
export type CenterStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Database {
    public: {
          Tables: {
      profiles: {
                Row: {
                            id: string;
                            role: UserRole;
                            full_name: string;
                            email: string;
                            phone: string | null;
                            address: string | null;
                            zone_id: string | null;
                            center_id: string | null;
                            created_at: string | null;
                            updated_at: string | null;
                };
                Insert: {
                  id: string;
                  role?: UserRole;
                  full_name: string;
                  email: string;
                  phone?: string | null;
                  address?: string | null;
                  zone_id?: string | null;
                  center_id?: string | null;
                  created_at?: string | null;
                  updated_at?: string | null;
                };
                Update: {
                  id?: string;
                  role?: UserRole;
                  full_name?: string;
                  email?: string;
                  phone?: string | null;
                  address?: string | null;
                  zone_id?: string | null;
                  center_id?: string | null;
                  created_at?: string | null;
                  updated_at?: string | null;
                };
      };
            
