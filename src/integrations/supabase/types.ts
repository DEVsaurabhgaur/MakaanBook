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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          landlord_id: string
          role: Database["public"]["Enums"]["chat_role"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          landlord_id: string
          role: Database["public"]["Enums"]["chat_role"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          landlord_id?: string
          role?: Database["public"]["Enums"]["chat_role"]
        }
        Relationships: []
      }
      electricity_bills: {
        Row: {
          amount_paid: number
          bill_amount: number
          billed_units: number
          cash_proof_urls: string[] | null
          cash_serial_notes: string | null
          created_at: string
          current_reading: number
          due_date: string
          fixed_charge: number
          house_id: string | null
          id: string
          is_meter_replaced: boolean | null
          landlord_id: string
          mode_of_payment: Database["public"]["Enums"]["payment_mode"] | null
          month: number
          new_meter_start_reading: number | null
          notes: string | null
          old_meter_final_reading: number | null
          paid_date: string | null
          per_unit_rate: number
          previous_reading: number
          room_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          total_bill: number
          transaction_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          amount_paid?: number
          bill_amount?: number
          billed_units?: number
          cash_proof_urls?: string[] | null
          cash_serial_notes?: string | null
          created_at?: string
          current_reading?: number
          due_date: string
          fixed_charge?: number
          house_id?: string | null
          id?: string
          is_meter_replaced?: boolean | null
          landlord_id: string
          mode_of_payment?: Database["public"]["Enums"]["payment_mode"] | null
          month: number
          new_meter_start_reading?: number | null
          notes?: string | null
          old_meter_final_reading?: number | null
          paid_date?: string | null
          per_unit_rate?: number
          previous_reading?: number
          room_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          total_bill?: number
          transaction_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          amount_paid?: number
          bill_amount?: number
          billed_units?: number
          cash_proof_urls?: string[] | null
          cash_serial_notes?: string | null
          created_at?: string
          current_reading?: number
          due_date?: string
          fixed_charge?: number
          house_id?: string | null
          id?: string
          is_meter_replaced?: boolean | null
          landlord_id?: string
          mode_of_payment?: Database["public"]["Enums"]["payment_mode"] | null
          month?: number
          new_meter_start_reading?: number | null
          notes?: string | null
          old_meter_final_reading?: number | null
          paid_date?: string | null
          per_unit_rate?: number
          previous_reading?: number
          room_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
          total_bill?: number
          transaction_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "electricity_bills_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_bills_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electricity_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          default_unit_rate: number | null
          house_name: string
          id: string
          landlord_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          default_unit_rate?: number | null
          house_name: string
          id?: string
          landlord_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          default_unit_rate?: number | null
          house_name?: string
          id?: string
          landlord_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_record_id: string | null
          related_record_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_record_id?: string | null
          related_record_type?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_record_id?: string | null
          related_record_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          must_change_password: boolean
          phone: string | null
          profile_pic_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          must_change_password?: boolean
          phone?: string | null
          profile_pic_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          profile_pic_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rent_records: {
        Row: {
          amount_paid: number
          cash_proof_urls: string[] | null
          cash_serial_notes: string | null
          created_at: string
          due_date: string
          house_id: string | null
          id: string
          landlord_id: string
          mode_of_payment: Database["public"]["Enums"]["payment_mode"] | null
          month: number
          notes: string | null
          paid_date: string | null
          pending_amount: number
          rent_amount: number
          room_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          transaction_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          amount_paid?: number
          cash_proof_urls?: string[] | null
          cash_serial_notes?: string | null
          created_at?: string
          due_date: string
          house_id?: string | null
          id?: string
          landlord_id: string
          mode_of_payment?: Database["public"]["Enums"]["payment_mode"] | null
          month: number
          notes?: string | null
          paid_date?: string | null
          pending_amount?: number
          rent_amount: number
          room_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          amount_paid?: number
          cash_proof_urls?: string[] | null
          cash_serial_notes?: string | null
          created_at?: string
          due_date?: string
          house_id?: string | null
          id?: string
          landlord_id?: string
          mode_of_payment?: Database["public"]["Enums"]["payment_mode"] | null
          month?: number
          notes?: string | null
          paid_date?: string | null
          pending_amount?: number
          rent_amount?: number
          room_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rent_records_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_records_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          floor: string | null
          house_id: string
          id: string
          is_occupied: boolean
          landlord_id: string
          monthly_rent: number
          rent_due_day: number
          room_number: string
          security_deposit: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          floor?: string | null
          house_id: string
          id?: string
          is_occupied?: boolean
          landlord_id: string
          monthly_rent?: number
          rent_due_day?: number
          room_number: string
          security_deposit?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          floor?: string | null
          house_id?: string
          id?: string
          is_occupied?: boolean
          landlord_id?: string
          monthly_rent?: number
          rent_due_day?: number
          room_number?: string
          security_deposit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          aadhar_number: string | null
          alternate_phone: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_proof_url: string | null
          is_active: boolean
          landlord_id: string
          monthly_rent: number
          move_in_date: string
          move_out_date: string | null
          phone: string | null
          profile_pic_url: string | null
          rent_due_day: number
          room_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aadhar_number?: string | null
          alternate_phone?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          id_proof_url?: string | null
          is_active?: boolean
          landlord_id: string
          monthly_rent?: number
          move_in_date?: string
          move_out_date?: string | null
          phone?: string | null
          profile_pic_url?: string | null
          rent_due_day?: number
          room_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aadhar_number?: string | null
          alternate_phone?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_proof_url?: string | null
          is_active?: boolean
          landlord_id?: string
          monthly_rent?: number
          move_in_date?: string
          move_out_date?: string | null
          phone?: string | null
          profile_pic_url?: string | null
          rent_due_day?: number
          room_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          landlord_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          landlord_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          landlord_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "landlord" | "tenant"
      chat_role: "user" | "assistant"
      notification_type:
        | "rent_due"
        | "rent_overdue"
        | "bill_due"
        | "payment_received"
        | "general"
      payment_mode: "cash" | "online" | "upi" | "bank_transfer"
      payment_status: "pending" | "paid" | "overdue" | "partial"
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
      app_role: ["landlord", "tenant"],
      chat_role: ["user", "assistant"],
      notification_type: [
        "rent_due",
        "rent_overdue",
        "bill_due",
        "payment_received",
        "general",
      ],
      payment_mode: ["cash", "online", "upi", "bank_transfer"],
      payment_status: ["pending", "paid", "overdue", "partial"],
    },
  },
} as const
