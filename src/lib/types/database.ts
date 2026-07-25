// Gegenereerd uit de Supabase-database (supabase gen types).
// Niet met de hand bewerken — hergenereer na een migratie.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      collections: {
        Row: {
          beneficiary_id: string
          closes_at: string
          created_at: string
          id: string
          life_event_id: string | null
          message: string | null
          network_id: string
          opens_at: string
          started_by: string
          status: Database["public"]["Enums"]["collection_status"]
          stripe_account_id: string | null
          suggested_cents: number
          title: string
        }
        Insert: {
          beneficiary_id: string
          closes_at: string
          created_at?: string
          id?: string
          life_event_id?: string | null
          message?: string | null
          network_id: string
          opens_at?: string
          started_by: string
          status?: Database["public"]["Enums"]["collection_status"]
          stripe_account_id?: string | null
          suggested_cents?: number
          title: string
        }
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>
        Relationships: []
      }
      contact_log: {
        Row: { id: string; occurred_at: string; person_a: string; person_b: string }
        Insert: { id?: string; occurred_at?: string; person_a: string; person_b: string }
        Update: Partial<Database["public"]["Tables"]["contact_log"]["Insert"]>
        Relationships: []
      }
      contact_states: {
        Row: {
          changed_at: string
          network_id: string
          person_a: string
          person_b: string
          set_by: string | null
          status: Database["public"]["Enums"]["contact_status"]
        }
        Insert: {
          changed_at?: string
          network_id: string
          person_a: string
          person_b: string
          set_by?: string | null
          status: Database["public"]["Enums"]["contact_status"]
        }
        Update: Partial<Database["public"]["Tables"]["contact_states"]["Insert"]>
        Relationships: []
      }
      contributions: {
        Row: {
          amount_cents: number
          collection_id: string
          contributor_id: string
          created_at: string
          currency: string
          hide_name: boolean
          id: string
          message: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["contribution_status"]
          stripe_payment_intent: string | null
        }
        Insert: {
          amount_cents: number
          collection_id: string
          contributor_id: string
          created_at?: string
          currency?: string
          hide_name?: boolean
          id?: string
          message?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          stripe_payment_intent?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["contributions"]["Insert"]>
        Relationships: []
      }
      event_suggestions: {
        Row: { kind: Database["public"]["Enums"]["life_event_kind"]; suggested_cents: number }
        Insert: { kind: Database["public"]["Enums"]["life_event_kind"]; suggested_cents: number }
        Update: Partial<Database["public"]["Tables"]["event_suggestions"]["Insert"]>
        Relationships: []
      }
      family_networks: {
        Row: { created_at: string; home_country: string | null; id: string; name: string }
        Insert: { created_at?: string; home_country?: string | null; id?: string; name: string }
        Update: Partial<Database["public"]["Tables"]["family_networks"]["Insert"]>
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          channel: string
          created_at: string
          destination: string
          expires_at: string
          id: string
          invited_by: string
          network_id: string
          person_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          channel: string
          created_at?: string
          destination: string
          expires_at?: string
          id?: string
          invited_by: string
          network_id: string
          person_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: Partial<Database["public"]["Tables"]["invites"]["Insert"]>
        Relationships: []
      }
      life_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["life_event_kind"]
          network_id: string
          occurs_on: string
          person_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["life_event_kind"]
          network_id: string
          occurs_on: string
          person_id: string
          title: string
        }
        Update: Partial<Database["public"]["Tables"]["life_events"]["Insert"]>
        Relationships: []
      }
      memberships: {
        Row: {
          granted_at: string
          id: string
          network_id: string
          person_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["family_role"]
        }
        Insert: {
          granted_at?: string
          id?: string
          network_id: string
          person_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["family_role"]
        }
        Update: Partial<Database["public"]["Tables"]["memberships"]["Insert"]>
        Relationships: []
      }
      persons: {
        Row: {
          birth_name: string | null
          born_on: string | null
          city: string | null
          claimed_by: string | null
          country: string | null
          created_at: string
          created_by: string | null
          died_on: string | null
          first_name: string
          id: string
          last_name: string
          managed_by: string | null
          network_id: string
          photo_url: string | null
        }
        Insert: {
          birth_name?: string | null
          born_on?: string | null
          city?: string | null
          claimed_by?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          died_on?: string | null
          first_name: string
          id?: string
          last_name: string
          managed_by?: string | null
          network_id: string
          photo_url?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["persons"]["Insert"]>
        Relationships: []
      }
      relationships: {
        Row: {
          created_at: string
          created_by: string | null
          from_person: string
          id: string
          kind: Database["public"]["Enums"]["relationship_kind"]
          network_id: string
          origin: Database["public"]["Enums"]["relationship_origin"]
          to_person: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_person: string
          id?: string
          kind: Database["public"]["Enums"]["relationship_kind"]
          network_id: string
          origin?: Database["public"]["Enums"]["relationship_origin"]
          to_person: string
        }
        Update: Partial<Database["public"]["Tables"]["relationships"]["Insert"]>
        Relationships: []
      }
      transaction_splits: {
        Row: {
          co_founder_cents: number
          contribution_id: string
          created_at: string
          family_pot_cents: number
          gross_cents: number
          id: string
          net_cents: number
          network_id: string
          platform_cents: number
          role_holder_cents: number
        }
        Insert: {
          co_founder_cents: number
          contribution_id: string
          created_at?: string
          family_pot_cents: number
          gross_cents: number
          id?: string
          net_cents: number
          network_id: string
          platform_cents: number
          role_holder_cents: number
        }
        Update: Partial<Database["public"]["Tables"]["transaction_splits"]["Insert"]>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      ancestors_of: {
        Args: { max_depth?: number; p: string }
        Returns: { generations: number; person_id: string }[]
      }
      collection_contributors: {
        Args: { col: string }
        Returns: {
          contributor_id: string
          first_name: string
          hide_name: boolean
          last_name: string
          message: string
          paid_at: string
          photo_url: string
        }[]
      }
      collection_total: {
        Args: { col: string }
        Returns: { contributor_count: number; total_cents: number }[]
      }
      compute_split: {
        Args: { gross: number }
        Returns: {
          co_founder: number
          family_pot: number
          net: number
          platform: number
          role_holder: number
        }[]
      }
      descendants_of: {
        Args: { max_depth?: number; p: string }
        Returns: { generations: number; person_id: string }[]
      }
      family_map: {
        Args: { me: string }
        Returns: {
          city: string
          country: string
          first_name: string
          is_claimed: boolean
          label: string
          last_contact: string
          last_name: string
          person_id: string
          photo_url: string
          status: Database["public"]["Enums"]["contact_status"]
        }[]
      }
      family_stats: {
        Args: { me: string }
        Returns: { known: number; out_of_touch: number; silent: number; total: number }[]
      }
      has_role: {
        Args: { net: string; r: Database["public"]["Enums"]["family_role"] }
        Returns: boolean
      }
      invite_preview: {
        Args: { invite_token: string }
        Returns: {
          expired: boolean
          inviter_name: string
          network_name: string
          person_first_name: string
          person_last_name: string
          status: Database["public"]["Enums"]["invite_status"]
        }[]
      }
      claim_invite: { Args: { invite_token: string }; Returns: string }
      me: { Args: Record<string, never>; Returns: string }
      my_networks: { Args: Record<string, never>; Returns: string[] }
      relation_label: { Args: { me: string; other: string }; Returns: string }
      settle_contribution: {
        Args: { p_contribution: string; p_intent: string | null }
        Returns: undefined
      }
      siblings_of: {
        Args: { p: string }
        Returns: { person_id: string; shared_parents: number }[]
      }
    }
    Enums: {
      collection_status: "concept" | "open" | "gesloten" | "uitbetaald"
      contact_status: "verbonden" | "stil" | "herstellend"
      contribution_status: "wachtend" | "betaald" | "mislukt" | "terugbetaald"
      family_role:
        | "co_founder"
        | "events_manager"
        | "verhalen_manager"
        | "pot_beheerder"
        | "connector"
        | "welzijn_manager"
        | "mediator"
        | "archivaris"
      invite_status: "open" | "geaccepteerd" | "verlopen"
      life_event_kind:
        | "verjaardag"
        | "ronde_verjaardag"
        | "zwemdiploma"
        | "nieuwe_school"
        | "afstuderen"
        | "huwelijk"
        | "geboorte"
        | "overlijden"
        | "diaspora_mijlpaal"
        | "business_droom"
        | "nood"
      relationship_kind: "parent" | "partner"
      relationship_origin: "biological" | "adoptive" | "step" | "foster" | "donor" | "chosen"
    }
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
