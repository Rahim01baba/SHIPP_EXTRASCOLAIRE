export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'parent' | 'center' | 'admin';
export type EnrollmentStatus = 'pending_admin_validation' | 'active' | 'rejected' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'mobile_money' | 'bank_transfer' | 'cash';
export type RouteStatus = 'planned' | 'confirmed' | 'cancelled' | 'completed';
export type NotificationType = 'enrollment' | 'payment' | 'route' | 'general';
export type ActivityType = 'painting' | 'music' | 'sport' | 'robotics' | 'aviation' | 'language' | 'science' | 'theater' | 'dance' | 'other';
export type CenterValidationStatus = 'submitted' | 'validated' | 'rejected' | 'suspended';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          email: string;
          phone: string;
          address: string | null;
          zone_id: string | null;
          center_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          email: string;
          phone: string;
          address?: string | null;
          zone_id?: string | null;
          center_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          email?: string;
          phone?: string;
          address?: string | null;
          zone_id?: string | null;
          center_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      zones: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      activity_types: {
        Row: {
          id: string;
          category: string;
          name: string;
          description: string | null;
          icon: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      centers: {
        Row: {
          id: string;
          name: string;
          activity_type: ActivityType;
          activity_type_ids: string[];
          description: string | null;
          address: string;
          google_maps_url: string | null;
          latitude: number | null;
          longitude: number | null;
          zone_id: string | null;
          age_min: number;
          age_max: number;
          max_capacity: number;
          current_capacity: number;
          insurance_info: string | null;
          logo_url: string | null;
          images: Json;
          is_active: boolean;
          validation_status: CenterValidationStatus;
          validated_at: string | null;
          validated_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          activity_type?: ActivityType;
          activity_type_ids?: string[];
          description?: string | null;
          address?: string;
          google_maps_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          zone_id?: string | null;
          age_min?: number;
          age_max?: number;
          max_capacity?: number;
          current_capacity?: number;
          insurance_info?: string | null;
          logo_url?: string | null;
          images?: Json;
          is_active?: boolean;
          validation_status?: CenterValidationStatus;
          validated_at?: string | null;
          validated_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          activity_type?: ActivityType;
          activity_type_ids?: string[];
          description?: string | null;
          address?: string;
          google_maps_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          zone_id?: string | null;
          age_min?: number;
          age_max?: number;
          max_capacity?: number;
          current_capacity?: number;
          insurance_info?: string | null;
          logo_url?: string | null;
          images?: Json;
          is_active?: boolean;
          validation_status?: CenterValidationStatus;
          validated_at?: string | null;
          validated_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          parent_id: string;
          full_name: string;
          date_of_birth: string;
          age: number | null;
          zone_id: string | null;
          medical_info: string | null;
          emergency_contact: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          full_name: string;
          date_of_birth: string;
          age?: number | null;
          zone_id?: string | null;
          medical_info?: string | null;
          emergency_contact?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          parent_id?: string;
          full_name?: string;
          date_of_birth?: string;
          age?: number | null;
          zone_id?: string | null;
          medical_info?: string | null;
          emergency_contact?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          center_id: string;
          name: string;
          description: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          sessions_per_month: number;
          course_price: number;
          transport_price: number;
          total_price: number;
          max_participants: number;
          current_participants: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          name: string;
          description?: string | null;
          day_of_week?: number;
          start_time: string;
          end_time: string;
          sessions_per_month?: number;
          course_price: number;
          transport_price: number;
          max_participants?: number;
          current_participants?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          center_id?: string;
          name?: string;
          description?: string | null;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          sessions_per_month?: number;
          course_price?: number;
          transport_price?: number;
          max_participants?: number;
          current_participants?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          child_id: string;
          activity_id: string;
          parent_id: string;
          center_id: string | null;
          enrollment_month: string;
          status: EnrollmentStatus;
          payment_status: string;
          course_amount: number;
          transport_amount: number;
          total_amount: number;
          rejection_reason: string | null;
          validated_by: string | null;
          validated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          activity_id: string;
          parent_id: string;
          center_id?: string | null;
          enrollment_month: string;
          status?: EnrollmentStatus;
          payment_status?: string;
          course_amount: number;
          transport_amount: number;
          total_amount: number;
          rejection_reason?: string | null;
          validated_by?: string | null;
          validated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          activity_id?: string;
          parent_id?: string;
          center_id?: string | null;
          enrollment_month?: string;
          status?: EnrollmentStatus;
          payment_status?: string;
          course_amount?: number;
          transport_amount?: number;
          total_amount?: number;
          rejection_reason?: string | null;
          validated_by?: string | null;
          validated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          enrollment_id: string;
          parent_id: string;
          amount: number;
          payment_method: PaymentMethod;
          payment_reference: string;
          status: PaymentStatus;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          enrollment_id: string;
          parent_id: string;
          amount: number;
          payment_method?: PaymentMethod;
          payment_reference: string;
          status?: PaymentStatus;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          enrollment_id?: string;
          parent_id?: string;
          amount?: number;
          payment_method?: PaymentMethod;
          payment_reference?: string;
          status?: PaymentStatus;
          paid_at?: string | null;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          payment_id: string;
          enrollment_id: string;
          parent_id: string;
          invoice_number: string;
          invoice_date: string;
          child_name: string;
          activity_name: string;
          center_name: string;
          course_price: number;
          transport_price: number;
          total_amount: number;
          pdf_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          enrollment_id: string;
          parent_id: string;
          invoice_number: string;
          invoice_date?: string;
          child_name: string;
          activity_name: string;
          center_name: string;
          course_price: number;
          transport_price: number;
          total_amount: number;
          pdf_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          enrollment_id?: string;
          parent_id?: string;
          invoice_number?: string;
          invoice_date?: string;
          child_name?: string;
          activity_name?: string;
          center_name?: string;
          course_price?: number;
          transport_price?: number;
          total_amount?: number;
          pdf_url?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          is_read: boolean;
          related_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          is_read?: boolean;
          related_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          is_read?: boolean;
          related_id?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      enrollment_status: EnrollmentStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      route_status: RouteStatus;
      notification_type: NotificationType;
      activity_type: ActivityType;
      center_validation_status: CenterValidationStatus;
    };
  };
}
