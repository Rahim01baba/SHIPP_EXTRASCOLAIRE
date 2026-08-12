export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'parent' | 'center' | 'admin'
export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'pending_admin_validation' | 'active' | 'rejected'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PaymentMethod = 'mobile_money' | 'bank_transfer' | 'cash'
export type RouteStatus = 'planned' | 'confirmed' | 'cancelled' | 'completed'
export type NotificationType = 'enrollment' | 'payment' | 'route' | 'general'
export type ActivityType = 'painting' | 'music' | 'sport' | 'robotics' | 'aviation' | 'language' | 'science' | 'theater' | 'dance' | 'other'
export type CenterValidationStatus = 'submitted' | 'validated' | 'rejected' | 'suspended'
export type CenterStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          center_id: string
          name: string
          description: string | null
          day_of_week: number
          start_time: string
          end_time: string
          sessions_per_month: number | null
          course_price: number
          transport_price: number | null
          total_price: number | null
          max_participants: number | null
          current_participants: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          use_global_transport: boolean | null
          activity_type_id: string | null
          age_min: number | null
          age_max: number | null
        }
        Insert: {
          id?: string
          center_id: string
          name: string
          description?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          sessions_per_month?: number | null
          course_price: number
          transport_price?: number | null
          total_price?: number | null
          max_participants?: number | null
          current_participants?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          use_global_transport?: boolean | null
          activity_type_id?: string | null
          age_min?: number | null
          age_max?: number | null
        }
        Update: {
          id?: string
          center_id?: string
          name?: string
          description?: string | null
          day_of_week?: number
          start_time?: string
          end_time?: string
          sessions_per_month?: number | null
          course_price?: number
          transport_price?: number | null
          total_price?: number | null
          max_participants?: number | null
          current_participants?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          use_global_transport?: boolean | null
          activity_type_id?: string | null
          age_min?: number | null
          age_max?: number | null
        }
      }
      activity_types: {
        Row: {
          id: string
          category: string
          name: string
          description: string | null
          icon: string | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          category: string
          name: string
          description?: string | null
          icon?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          category?: string
          name?: string
          description?: string | null
          icon?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      centers: {
        Row: {
          id: string
          name: string
          activity_type: ActivityType | null
          description: string | null
          address: string | null
          zone_id: string | null
          age_min: number | null
          age_max: number | null
          max_capacity: number | null
          current_capacity: number | null
          insurance_info: string | null
          logo_url: string | null
          images: Json | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          validation_status: CenterValidationStatus | null
          validated_at: string | null
          validated_by: string | null
          rejection_reason: string | null
          activity_type_ids: string[] | null
          google_maps_url: string | null
          latitude: number | null
          longitude: number | null
          notes_admin: string | null
          owner_profile_id: string
          shipp_commission_pct: number
          allow_center_edit_prices: boolean | null
          phone: string | null
          email: string | null
          address_text: string | null
          google_maps_link: string | null
          status: CenterStatus
          approved_at: string | null
          approved_by: string | null
          rejected_reason: string | null
          transport_fee_monthly: number
        }
        Insert: {
          id?: string
          name: string
          activity_type?: ActivityType | null
          description?: string | null
          address?: string | null
          zone_id?: string | null
          age_min?: number | null
          age_max?: number | null
          max_capacity?: number | null
          current_capacity?: number | null
          insurance_info?: string | null
          logo_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          validation_status?: CenterValidationStatus | null
          validated_at?: string | null
          validated_by?: string | null
          rejection_reason?: string | null
          activity_type_ids?: string[] | null
          google_maps_url?: string | null
          latitude?: number | null
          longitude?: number | null
          notes_admin?: string | null
          owner_profile_id: string
          shipp_commission_pct?: number
          allow_center_edit_prices?: boolean | null
          phone?: string | null
          email?: string | null
          address_text?: string | null
          google_maps_link?: string | null
          status?: CenterStatus
          approved_at?: string | null
          approved_by?: string | null
          rejected_reason?: string | null
          transport_fee_monthly?: number
        }
        Update: {
          id?: string
          name?: string
          activity_type?: ActivityType | null
          description?: string | null
          address?: string | null
          zone_id?: string | null
          age_min?: number | null
          age_max?: number | null
          max_capacity?: number | null
          current_capacity?: number | null
          insurance_info?: string | null
          logo_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          validation_status?: CenterValidationStatus | null
          validated_at?: string | null
          validated_by?: string | null
          rejection_reason?: string | null
          activity_type_ids?: string[] | null
          google_maps_url?: string | null
          latitude?: number | null
          longitude?: number | null
          notes_admin?: string | null
          owner_profile_id?: string
          shipp_commission_pct?: number
          allow_center_edit_prices?: boolean | null
          phone?: string | null
          email?: string | null
          address_text?: string | null
          google_maps_link?: string | null
          status?: CenterStatus
          approved_at?: string | null
          approved_by?: string | null
          rejected_reason?: string | null
          transport_fee_monthly?: number
        }
      }
      children: {
        Row: {
          id: string
          parent_id: string
          created_at: string | null
          updated_at: string | null
          first_name: string
          last_name: string
          birth_date: string
          gender: string
          emergency_contact_name: string
          emergency_contact_phone: string
          transport_authorization: boolean
          photo_url: string | null
          medical_notes: string | null
        }
        Insert: {
          id?: string
          parent_id: string
          created_at?: string | null
          updated_at?: string | null
          first_name: string
          last_name: string
          birth_date: string
          gender: string
          emergency_contact_name: string
          emergency_contact_phone: string
          transport_authorization?: boolean
          photo_url?: string | null
          medical_notes?: string | null
        }
        Update: {
          id?: string
          parent_id?: string
          created_at?: string | null
          updated_at?: string | null
          first_name?: string
          last_name?: string
          birth_date?: string
          gender?: string
          emergency_contact_name?: string
          emergency_contact_phone?: string
          transport_authorization?: boolean
          photo_url?: string | null
          medical_notes?: string | null
        }
      }
      enrollments: {
        Row: {
          id: string
          child_id: string
          activity_id: string
          parent_id: string
          enrollment_month: string
          status: EnrollmentStatus | null
          created_at: string | null
          updated_at: string | null
          center_id: string | null
          payment_status: string | null
          amount_total: number | null
          course_amount: number
          transport_amount: number
          total_amount: number
          rejection_reason: string | null
          validated_by: string | null
          validated_at: string | null
          is_deleted: boolean
          paid_at: string | null
          payment_note: string | null
          payment_marked_by: string | null
        }
        Insert: {
          id?: string
          child_id: string
          activity_id: string
          parent_id: string
          enrollment_month: string
          status?: EnrollmentStatus | null
          created_at?: string | null
          updated_at?: string | null
          center_id?: string | null
          payment_status?: string | null
          amount_total?: number | null
          course_amount?: number
          transport_amount?: number
          total_amount?: number
          rejection_reason?: string | null
          validated_by?: string | null
          validated_at?: string | null
          is_deleted?: boolean
          paid_at?: string | null
          payment_note?: string | null
          payment_marked_by?: string | null
        }
        Update: {
          id?: string
          child_id?: string
          activity_id?: string
          parent_id?: string
          enrollment_month?: string
          status?: EnrollmentStatus | null
          created_at?: string | null
          updated_at?: string | null
          center_id?: string | null
          payment_status?: string | null
          amount_total?: number | null
          course_amount?: number
          transport_amount?: number
          total_amount?: number
          rejection_reason?: string | null
          validated_by?: string | null
          validated_at?: string | null
          is_deleted?: boolean
          paid_at?: string | null
          payment_note?: string | null
          payment_marked_by?: string | null
        }
      }
      financial_distributions: {
        Row: {
          id: string
          payment_id: string
          enrollment_id: string
          center_id: string
          total_amount: number
          center_share: number
          transport_share: number
          shipp_margin: number
          distribution_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          payment_id: string
          enrollment_id: string
          center_id: string
          total_amount: number
          center_share: number
          transport_share: number
          shipp_margin: number
          distribution_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          payment_id?: string
          enrollment_id?: string
          center_id?: string
          total_amount?: number
          center_share?: number
          transport_share?: number
          shipp_margin?: number
          distribution_date?: string | null
          created_at?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          payment_id: string | null
          enrollment_id: string
          parent_id: string
          invoice_number: string
          invoice_date: string | null
          child_name: string
          activity_name: string
          center_name: string
          course_price: number
          transport_price: number
          total_amount: number
          pdf_url: string | null
          created_at: string | null
          invoice_sent: boolean | null
          sent_at: string | null
          sent_by: string | null
          child_id: string | null
        }
        Insert: {
          id?: string
          payment_id?: string | null
          enrollment_id: string
          parent_id: string
          invoice_number: string
          invoice_date?: string | null
          child_name: string
          activity_name: string
          center_name: string
          course_price: number
          transport_price: number
          total_amount: number
          pdf_url?: string | null
          created_at?: string | null
          invoice_sent?: boolean | null
          sent_at?: string | null
          sent_by?: string | null
          child_id?: string | null
        }
        Update: {
          id?: string
          payment_id?: string | null
          enrollment_id?: string
          parent_id?: string
          invoice_number?: string
          invoice_date?: string | null
          child_name?: string
          activity_name?: string
          center_name?: string
          course_price?: number
          transport_price?: number
          total_amount?: number
          pdf_url?: string | null
          created_at?: string | null
          invoice_sent?: boolean | null
          sent_at?: string | null
          sent_by?: string | null
          child_id?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          is_read: boolean | null
          related_id: string | null
          created_at: string | null
          center_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          is_read?: boolean | null
          related_id?: string | null
          created_at?: string | null
          center_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          message?: string
          is_read?: boolean | null
          related_id?: string | null
          created_at?: string | null
          center_id?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          enrollment_id: string
          parent_id: string
          amount: number
          payment_method: PaymentMethod | null
          payment_reference: string
          status: PaymentStatus | null
          paid_at: string | null
          created_at: string | null
          validated_by: string | null
          validated_at: string | null
          payment_month: string | null
        }
        Insert: {
          id?: string
          enrollment_id: string
          parent_id: string
          amount: number
          payment_method?: PaymentMethod | null
          payment_reference: string
          status?: PaymentStatus | null
          paid_at?: string | null
          created_at?: string | null
          validated_by?: string | null
          validated_at?: string | null
          payment_month?: string | null
        }
        Update: {
          id?: string
          enrollment_id?: string
          parent_id?: string
          amount?: number
          payment_method?: PaymentMethod | null
          payment_reference?: string
          status?: PaymentStatus | null
          paid_at?: string | null
          created_at?: string | null
          validated_by?: string | null
          validated_at?: string | null
          payment_month?: string | null
        }
      }
      pricing_history: {
        Row: {
          id: string
          activity_id: string
          course_price: number
          transport_price: number
          total_price: number
          changed_by: string | null
          change_reason: string | null
          effective_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          activity_id: string
          course_price: number
          transport_price: number
          total_price: number
          changed_by?: string | null
          change_reason?: string | null
          effective_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          activity_id?: string
          course_price?: number
          transport_price?: number
          total_price?: number
          changed_by?: string | null
          change_reason?: string | null
          effective_date?: string | null
          created_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          email: string
          phone: string | null
          address: string | null
          zone_id: string | null
          center_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          role?: UserRole
          full_name: string
          email: string
          phone?: string | null
          address?: string | null
          zone_id?: string | null
          center_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: UserRole
          full_name?: string
          email?: string
          phone?: string | null
          address?: string | null
          zone_id?: string | null
          center_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      route_assignments: {
        Row: {
          id: string
          route_id: string
          child_id: string
          enrollment_id: string
          pickup_time: string | null
          pickup_address: string | null
          dropoff_time: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          route_id: string
          child_id: string
          enrollment_id: string
          pickup_time?: string | null
          pickup_address?: string | null
          dropoff_time?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          route_id?: string
          child_id?: string
          enrollment_id?: string
          pickup_time?: string | null
          pickup_address?: string | null
          dropoff_time?: string | null
          created_at?: string | null
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: number
          description: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          value: number
          description?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: number
          description?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
      }
      transport_routes: {
        Row: {
          id: string
          zone_id: string
          route_name: string
          route_date: string
          vehicle_capacity: number
          current_capacity: number | null
          minimum_children: number | null
          status: RouteStatus | null
          estimated_departure: string | null
          driver_name: string | null
          vehicle_number: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          zone_id: string
          route_name: string
          route_date: string
          vehicle_capacity?: number
          current_capacity?: number | null
          minimum_children?: number | null
          status?: RouteStatus | null
          estimated_departure?: string | null
          driver_name?: string | null
          vehicle_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          zone_id?: string
          route_name?: string
          route_date?: string
          vehicle_capacity?: number
          current_capacity?: number | null
          minimum_children?: number | null
          status?: RouteStatus | null
          estimated_departure?: string | null
          driver_name?: string | null
          vehicle_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      zones: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
    }
    Views: {
      enrollments_payment_summary: {
        Row: {
          parent_id: string | null
          total_enrollments: number | null
          paid_count: number | null
          pending_count: number | null
          late_count: number | null
          cancelled_count: number | null
          total_paid: number | null
          total_outstanding: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      enrollment_status: EnrollmentStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
      route_status: RouteStatus
      notification_type: NotificationType
      activity_type: ActivityType
      center_validation_status: CenterValidationStatus
      center_status: CenterStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
