export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brands: {
        Row: {
          accent_color: string
          active: boolean
          created_at: string
          id: string
          logo_url: string | null
          name: string
          partner_host: string | null
          slug: string
        }
        Insert: {
          accent_color: string
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          partner_host?: string | null
          slug: string
        }
        Update: {
          accent_color?: string
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          partner_host?: string | null
          slug?: string
        }
        Relationships: []
      }
      lead_contacts: {
        Row: {
          consent_at: string
          email: string | null
          full_address: string | null
          lead_id: string
          name: string
          phone: string
          privacy_version: string
        }
        Insert: {
          consent_at: string
          email?: string | null
          full_address?: string | null
          lead_id: string
          name: string
          phone: string
          privacy_version: string
        }
        Update: {
          consent_at?: string
          email?: string | null
          full_address?: string | null
          lead_id?: string
          name?: string
          phone?: string
          privacy_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_photos: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_photos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_purchases: {
        Row: {
          id: string
          lead_id: string
          partner_id: string
          price_paid_cents: number
          purchased_at: string
          refund_reason: string | null
          refunded_at: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          partner_id: string
          price_paid_cents: number
          purchased_at?: string
          refund_reason?: string | null
          refunded_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          partner_id?: string
          price_paid_cents?: number
          purchased_at?: string
          refund_reason?: string | null
          refunded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          brand_id: string
          city: string
          created_at: string
          description: string | null
          extra_data: Json
          id: string
          photo_count: number
          postal_code: string
          price_cents: number
          service_id: string
          source: string | null
          status: string
        }
        Insert: {
          brand_id: string
          city: string
          created_at?: string
          description?: string | null
          extra_data?: Json
          id?: string
          photo_count?: number
          postal_code: string
          price_cents: number
          service_id: string
          source?: string | null
          status?: string
        }
        Update: {
          brand_id?: string
          city?: string
          created_at?: string
          description?: string | null
          extra_data?: Json
          id?: string
          photo_count?: number
          postal_code?: string
          price_cents?: number
          service_id?: string
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_brand_memberships: {
        Row: {
          active: boolean
          brand_id: string
          created_at: string
          id: string
          partner_id: string
        }
        Insert: {
          active?: boolean
          brand_id: string
          created_at?: string
          id?: string
          partner_id: string
        }
        Update: {
          active?: boolean
          brand_id?: string
          created_at?: string
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_brand_memberships_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_brand_memberships_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_postcodes: {
        Row: {
          brand_id: string
          partner_id: string
          postal_code: string
        }
        Insert: {
          brand_id: string
          partner_id: string
          postal_code: string
        }
        Update: {
          brand_id?: string
          partner_id?: string
          postal_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_postcodes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_postcodes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_services: {
        Row: {
          partner_id: string
          service_id: string
        }
        Insert: {
          partner_id: string
          service_id: string
        }
        Update: {
          partner_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_services_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_wallets: {
        Row: {
          balance_cents: number
          partner_id: string
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          partner_id: string
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_wallets_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          phone: string | null
          profile_id: string | null
          status: string
          vat_number: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          phone?: string | null
          profile_id?: string | null
          status?: string
          vat_number?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string | null
          profile_id?: string | null
          status?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          brand_id: string
          default_price_cents: number
          id: string
          name_fr: string
          name_nl: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          brand_id: string
          default_price_cents: number
          id?: string
          name_fr: string
          name_nl: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          brand_id?: string
          default_price_cents?: number
          id?: string
          name_fr?: string
          name_nl?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          partner_id: string
          purchase_id: string | null
          reason: string | null
          stripe_event_id: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          partner_id: string
          purchase_id?: string | null
          reason?: string | null
          stripe_event_id?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          partner_id?: string
          purchase_id?: string | null
          reason?: string | null
          stripe_event_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "lead_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_wallet: {
        Args: { p_amount_cents: number; p_partner_id: string; p_reason: string }
        Returns: {
          balance_cents: number
          partner_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      credit_wallet_from_stripe: {
        Args: {
          p_amount_cents: number
          p_partner_id: string
          p_stripe_event_id: string
        }
        Returns: {
          balance_cents: number
          partner_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_partner_id: { Args: never; Returns: string }
      ingest_lead: {
        Args: {
          p_brand_id: string
          p_city: string
          p_consent_at: string
          p_description: string
          p_email: string
          p_extra_data: Json
          p_full_address: string
          p_name: string
          p_phone: string
          p_photo_count: number
          p_postal_code: string
          p_price_cents: number
          p_privacy_version: string
          p_service_id: string
          p_source: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      partner_can_see_lead: {
        Args: { p_lead_id: string; p_partner_id: string }
        Returns: boolean
      }
      purchase_lead: {
        Args: { p_lead_id: string }
        Returns: {
          id: string
          lead_id: string
          partner_id: string
          price_paid_cents: number
          purchased_at: string
          refund_reason: string | null
          refunded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lead_purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refund_purchase: {
        Args: { p_purchase_id: string; p_reason: string }
        Returns: {
          id: string
          lead_id: string
          partner_id: string
          price_paid_cents: number
          purchased_at: string
          refund_reason: string | null
          refunded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lead_purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

