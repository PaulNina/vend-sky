export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      campaign_periods: {
        Row: {
          campaign_id: string
          closed_at: string | null
          closed_by: string | null
          id: string
          period_end: string
          period_number: number
          period_start: string
          report_generated_at: string | null
          report_sent_at: string | null
          settlement_generated_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          period_end: string
          period_number: number
          period_start: string
          report_generated_at?: string | null
          report_sent_at?: string | null
          settlement_generated_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          period_end?: string
          period_number?: number
          period_start?: string
          report_generated_at?: string | null
          report_sent_at?: string | null
          settlement_generated_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_periods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ai_date_validation: boolean
          anchor_date: string | null
          auto_periods_enabled: boolean
          close_reason: string | null
          close_time_local: string
          closed_at: string | null
          created_at: string
          custom_days: number | null
          end_date: string
          enforce_sales_within_campaign: boolean
          id: string
          is_active: boolean
          name: string
          period_mode: string
          points_mode: string
          registration_close_at: string | null
          registration_enabled: boolean
          registration_open_at: string | null
          report_on_close: boolean
          report_recipients_mode: string
          require_vendor_approval: boolean
          slug: string | null
          start_date: string
          status: string
          subtitle: string | null
        }
        Insert: {
          ai_date_validation?: boolean
          anchor_date?: string | null
          auto_periods_enabled?: boolean
          close_reason?: string | null
          close_time_local?: string
          closed_at?: string | null
          created_at?: string
          custom_days?: number | null
          end_date: string
          enforce_sales_within_campaign?: boolean
          id?: string
          is_active?: boolean
          name: string
          period_mode?: string
          points_mode?: string
          registration_close_at?: string | null
          registration_enabled?: boolean
          registration_open_at?: string | null
          report_on_close?: boolean
          report_recipients_mode?: string
          require_vendor_approval?: boolean
          slug?: string | null
          start_date: string
          status?: string
          subtitle?: string | null
        }
        Update: {
          ai_date_validation?: boolean
          anchor_date?: string | null
          auto_periods_enabled?: boolean
          close_reason?: string | null
          close_time_local?: string
          closed_at?: string | null
          created_at?: string
          custom_days?: number | null
          end_date?: string
          enforce_sales_within_campaign?: boolean
          id?: string
          is_active?: boolean
          name?: string
          period_mode?: string
          points_mode?: string
          registration_close_at?: string | null
          registration_enabled?: boolean
          registration_open_at?: string | null
          report_on_close?: boolean
          report_recipients_mode?: string
          require_vendor_approval?: boolean
          slug?: string | null
          start_date?: string
          status?: string
          subtitle?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      city_group_members: {
        Row: {
          city_name: string
          group_id: string
          id: string
        }
        Insert: {
          city_name: string
          group_id: string
          id?: string
        }
        Update: {
          city_name?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "city_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      city_groups: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      commission_payments: {
        Row: {
          amount_bs: number
          campaign_id: string
          created_at: string
          id: string
          paid_at: string | null
          paid_by: string | null
          payment_note: string | null
          payment_proof_url: string | null
          period_end: string
          period_id: string | null
          period_start: string
          status: Database["public"]["Enums"]["commission_payment_status"]
          units: number
          vendor_id: string
        }
        Insert: {
          amount_bs?: number
          campaign_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_note?: string | null
          payment_proof_url?: string | null
          period_end: string
          period_id?: string | null
          period_start: string
          status?: Database["public"]["Enums"]["commission_payment_status"]
          units?: number
          vendor_id: string
        }
        Update: {
          amount_bs?: number
          campaign_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_note?: string | null
          payment_proof_url?: string | null
          period_end?: string
          period_id?: string | null
          period_start?: string
          status?: Database["public"]["Enums"]["commission_payment_status"]
          units?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "campaign_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          from_name: string | null
          id: string
          is_active: boolean
          key: string
          reply_to: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          from_name?: string | null
          id?: string
          is_active?: boolean
          key: string
          reply_to?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          from_name?: string | null
          id?: string
          is_active?: boolean
          key?: string
          reply_to?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          bonus_bs_value: number
          created_at: string
          id: string
          is_active: boolean
          model_code: string
          name: string
          points_value: number
          size_inches: number | null
        }
        Insert: {
          bonus_bs_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          model_code: string
          name: string
          points_value?: number
          size_inches?: number | null
        }
        Update: {
          bonus_bs_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          model_code?: string
          name?: string
          points_value?: number
          size_inches?: number | null
        }
        Relationships: []
      }
      report_recipients: {
        Row: {
          campaign_id: string
          city: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          campaign_id: string
          city: string
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          campaign_id?: string
          city?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      restricted_serials: {
        Row: {
          id: string
          imported_at: string
          reason: string
          serial: string
          source_campaign: string | null
        }
        Insert: {
          id?: string
          imported_at?: string
          reason: string
          serial: string
          source_campaign?: string | null
        }
        Update: {
          id?: string
          imported_at?: string
          reason?: string
          serial?: string
          source_campaign?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          reason: string
          reviewed_at: string
          reviewer_user_id: string
          sale_id: string
        }
        Insert: {
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          reason: string
          reviewed_at?: string
          reviewer_user_id: string
          sale_id: string
        }
        Update: {
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          reason?: string
          reviewed_at?: string
          reviewer_user_id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_attachments: {
        Row: {
          created_at: string
          id: string
          nota_url: string
          poliza_url: string
          sale_id: string
          tag_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          nota_url: string
          poliza_url: string
          sale_id: string
          tag_url: string
        }
        Update: {
          created_at?: string
          id?: string
          nota_url?: string
          poliza_url?: string
          sale_id?: string
          tag_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_attachments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          ai_date_confidence: number | null
          ai_date_detected: string | null
          ai_flag: boolean | null
          bonus_bs: number
          campaign_id: string
          city: string
          created_at: string
          id: string
          points: number
          product_id: string
          sale_date: string
          serial: string
          status: Database["public"]["Enums"]["sale_status"]
          vendor_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          ai_date_confidence?: number | null
          ai_date_detected?: string | null
          ai_flag?: boolean | null
          bonus_bs?: number
          campaign_id: string
          city: string
          created_at?: string
          id?: string
          points?: number
          product_id: string
          sale_date: string
          serial: string
          status?: Database["public"]["Enums"]["sale_status"]
          vendor_id: string
          week_end: string
          week_start: string
        }
        Update: {
          ai_date_confidence?: number | null
          ai_date_detected?: string | null
          ai_flag?: boolean | null
          bonus_bs?: number
          campaign_id?: string
          city?: string
          created_at?: string
          id?: string
          points?: number
          product_id?: string
          sale_date?: string
          serial?: string
          status?: Database["public"]["Enums"]["sale_status"]
          vendor_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      serials: {
        Row: {
          id: string
          imported_at: string
          product_id: string | null
          serial: string
          status: Database["public"]["Enums"]["serial_status"]
          used_sale_id: string | null
        }
        Insert: {
          id?: string
          imported_at?: string
          product_id?: string | null
          serial: string
          status?: Database["public"]["Enums"]["serial_status"]
          used_sale_id?: string | null
        }
        Update: {
          id?: string
          imported_at?: string
          product_id?: string | null
          serial?: string
          status?: Database["public"]["Enums"]["serial_status"]
          used_sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_audits: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          id: string
          reason: string | null
          sale_id: string
          supervisor_user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          reason?: string | null
          sale_id: string
          supervisor_user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          reason?: string | null
          sale_id?: string
          supervisor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_audits_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          is_disabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          is_disabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          is_disabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          city: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_blocks: {
        Row: {
          created_at: string
          end_at: string | null
          id: string
          reason: string
          start_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          end_at?: string | null
          id?: string
          reason: string
          start_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          end_at?: string | null
          id?: string
          reason?: string
          start_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_blocks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_store_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_store: string | null
          observation: string | null
          previous_store: string | null
          vendor_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_store?: string | null
          observation?: string | null
          previous_store?: string | null
          vendor_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_store?: string | null
          observation?: string | null
          previous_store?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_store_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          city: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          pending_approval: boolean
          phone: string | null
          qr_expires_at: string | null
          qr_uploaded_at: string | null
          qr_url: string | null
          store_name: string | null
          talla_polera: string | null
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          pending_approval?: boolean
          phone?: string | null
          qr_expires_at?: string | null
          qr_uploaded_at?: string | null
          qr_url?: string | null
          store_name?: string | null
          talla_polera?: string | null
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          pending_approval?: boolean
          phone?: string | null
          qr_expires_at?: string | null
          qr_uploaded_at?: string | null
          qr_url?: string | null
          store_name?: string | null
          talla_polera?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_campaign_ranking: {
        Args: { _campaign_id: string }
        Returns: {
          city: string
          full_name: string
          store_name: string
          total_bonus_bs: number
          total_points: number
          total_units: number
          vendor_id: string
        }[]
      }
      get_sales_by_city: {
        Args: {
          _campaign_id?: string
          _end_date?: string
          _start_date?: string
        }
        Returns: {
          approved_units: number
          city: string
          pending_units: number
          rejected_units: number
          total_bonus_bs: number
          total_points: number
          total_units: number
        }[]
      }
      get_top_products: {
        Args: {
          _campaign_id?: string
          _end_date?: string
          _limit?: number
          _start_date?: string
        }
        Returns: {
          city: string
          model_code: string
          product_id: string
          product_name: string
          total_bonus_bs: number
          total_units: number
        }[]
      }
      get_user_city: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "vendedor" | "revisor_ciudad" | "supervisor" | "admin"
      audit_action: "ok" | "revert"
      commission_payment_status: "pending" | "paid"
      review_decision: "approved" | "rejected"
      sale_status: "pending" | "approved" | "rejected" | "closed"
      serial_status: "available" | "used" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["vendedor", "revisor_ciudad", "supervisor", "admin"],
      audit_action: ["ok", "revert"],
      commission_payment_status: ["pending", "paid"],
      review_decision: ["approved", "rejected"],
      sale_status: ["pending", "approved", "rejected", "closed"],
      serial_status: ["available", "used", "blocked"],
    },
  },
} as const
