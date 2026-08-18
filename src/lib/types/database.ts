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
      business_dreams: {
        Row: {
          id: string
          network_id: string
          person_id: string
          name: string
          description: string
          target_cents: number
          expected_revenue_cents: number | null
          give_back: string | null
          status: Database["public"]["Enums"]["business_status"]
          collection_id: string | null
          created_at: string
          approved_at: string | null
        }
        Insert: {
          id?: string
          network_id: string
          person_id: string
          name: string
          description: string
          target_cents: number
          expected_revenue_cents?: number | null
          give_back?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          collection_id?: string | null
          created_at?: string
          approved_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["business_dreams"]["Insert"]>
        Relationships: []
      }
      business_questions: {
        Row: {
          id: string
          business_id: string
          asker_id: string
          question: string
          answer: string | null
          answered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          asker_id: string
          question: string
          answer?: string | null
          answered_at?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["business_questions"]["Insert"]>
        Relationships: []
      }
      business_votes: {
        Row: {
          id: string
          business_id: string
          voter_id: string
          approve: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          voter_id: string
          approve: boolean
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["business_votes"]["Insert"]>
        Relationships: []
      }
      business_updates: {
        Row: {
          id: string
          business_id: string
          photo_url: string | null
          metric: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          photo_url?: string | null
          metric?: string | null
          note?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["business_updates"]["Insert"]>
        Relationships: []
      }
      rad_draws: {
        Row: {
          id: string
          network_id: string
          year: number
          winner_person_id: string | null
          prize_cents: number
          status: Database["public"]["Enums"]["rad_status"]
          choice: Database["public"]["Enums"]["rad_choice"] | null
          recipient_person_id: string | null
          created_at: string
          decided_at: string | null
          stripe_transfer_id: string | null
        }
        Insert: {
          id?: string
          network_id: string
          year: number
          winner_person_id?: string | null
          prize_cents: number
          status?: Database["public"]["Enums"]["rad_status"]
          choice?: Database["public"]["Enums"]["rad_choice"] | null
          recipient_person_id?: string | null
          created_at?: string
          decided_at?: string | null
          stripe_transfer_id?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["rad_draws"]["Insert"]>
        Relationships: []
      }
      stem_rounds: {
        Row: {
          id: string
          network_id: string
          year: number
          status: Database["public"]["Enums"]["stem_status"]
          winner_person_id: string | null
          created_at: string
          decided_at: string | null
        }
        Insert: {
          id?: string
          network_id: string
          year: number
          status?: Database["public"]["Enums"]["stem_status"]
          winner_person_id?: string | null
          created_at?: string
          decided_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["stem_rounds"]["Insert"]>
        Relationships: []
      }
      stem_nominations: {
        Row: {
          id: string
          round_id: string
          nominee_person_id: string
          nominated_by: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          round_id: string
          nominee_person_id: string
          nominated_by: string
          reason: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["stem_nominations"]["Insert"]>
        Relationships: []
      }
      stem_votes: {
        Row: {
          id: string
          round_id: string
          nomination_id: string
          voter_id: string
          created_at: string
        }
        Insert: {
          id?: string
          round_id: string
          nomination_id: string
          voter_id: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["stem_votes"]["Insert"]>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          network_id: string
          recipient_person_id: string
          actor_person_id: string | null
          kind: Database["public"]["Enums"]["notification_kind"]
          subject_type: string | null
          subject_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          network_id: string
          recipient_person_id: string
          actor_person_id?: string | null
          kind: Database["public"]["Enums"]["notification_kind"]
          subject_type?: string | null
          subject_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>
        Relationships: []
      }
      album_items: {
        Row: {
          id: string
          network_id: string
          uploaded_by: string
          file_url: string
          file_type: Database["public"]["Enums"]["media_kind"]
          title: string | null
          memory_text: string | null
          date_of_memory: string | null
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          network_id: string
          uploaded_by: string
          file_url: string
          file_type?: Database["public"]["Enums"]["media_kind"]
          title?: string | null
          memory_text?: string | null
          date_of_memory?: string | null
          location?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["album_items"]["Insert"]>
        Relationships: []
      }
      album_tags: {
        Row: {
          id: string
          album_item_id: string
          person_id: string
          tagged_by: string
          confirmed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          album_item_id: string
          person_id: string
          tagged_by: string
          confirmed?: boolean
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["album_tags"]["Insert"]>
        Relationships: []
      }
      album_reactions: {
        Row: {
          id: string
          album_item_id: string
          person_id: string
          reaction: Database["public"]["Enums"]["reaction_kind"]
          created_at: string
        }
        Insert: {
          id?: string
          album_item_id: string
          person_id: string
          reaction: Database["public"]["Enums"]["reaction_kind"]
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["album_reactions"]["Insert"]>
        Relationships: []
      }
      album_comments: {
        Row: {
          id: string
          album_item_id: string
          person_id: string
          comment_text: string
          created_at: string
        }
        Insert: {
          id?: string
          album_item_id: string
          person_id: string
          comment_text: string
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["album_comments"]["Insert"]>
        Relationships: []
      }
      pot_ledger: {
        Row: {
          id: string
          network_id: string
          kind: Database["public"]["Enums"]["pot_entry_kind"]
          amount_cents: number
          contribution_id: string | null
          person_id: string | null
          stripe_ref: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          network_id: string
          kind: Database["public"]["Enums"]["pot_entry_kind"]
          amount_cents: number
          contribution_id?: string | null
          person_id?: string | null
          stripe_ref?: string | null
          description?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["pot_ledger"]["Insert"]>
        Relationships: []
      }
      pot_subscriptions: {
        Row: {
          id: string
          network_id: string
          person_id: string
          amount_cents: number
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: Database["public"]["Enums"]["pot_sub_status"]
          created_at: string
          canceled_at: string | null
        }
        Insert: {
          id?: string
          network_id: string
          person_id: string
          amount_cents: number
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: Database["public"]["Enums"]["pot_sub_status"]
          created_at?: string
          canceled_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["pot_subscriptions"]["Insert"]>
        Relationships: []
      }
      payout_accounts: {
        Row: {
          id: string
          person_id: string
          network_id: string
          provider: Database["public"]["Enums"]["payout_provider"]
          external_id: string
          status: Database["public"]["Enums"]["payout_status"]
          country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          person_id: string
          network_id: string
          provider: Database["public"]["Enums"]["payout_provider"]
          external_id: string
          status?: Database["public"]["Enums"]["payout_status"]
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["payout_accounts"]["Insert"]>
        Relationships: []
      }
      dreams: {
        Row: {
          collection_id: string | null
          created_at: string
          fulfilled_at: string | null
          id: string
          network_id: string
          person_id: string
          status: Database["public"]["Enums"]["dream_status"]
          target_cents: number
          title: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          network_id: string
          person_id: string
          status?: Database["public"]["Enums"]["dream_status"]
          target_cents: number
          title: string
        }
        Update: Partial<Database["public"]["Tables"]["dreams"]["Insert"]>
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
      business_tally: {
        Args: { bid: string }
        Returns: {
          ja: number
          nee: number
          actief: number
          nodig: number
          goedgekeurd: boolean
          mijn_stem: boolean | null
        }[]
      }
      approve_business: { Args: { bid: string }; Returns: string | null }
      cofounder_dashboard: {
        Args: Record<string, never>
        Returns: {
          leden_totaal: number
          leden_deelnemend: number
          leden_sluimerend: number
          leden_onbekend: number
          groei_maand: number
          volume_totaal_cents: number
          volume_maand_cents: number
          volume_jaar_cents: number
          cofounder_verdienste_cents: number
          rolpool_cents: number
          pot_saldo_cents: number
          dromen_actief: number
          dromen_bereikt: number
          netwerksterkte: number
        }[]
      }
      family_roles: {
        Args: Record<string, never>
        Returns: {
          role: Database["public"]["Enums"]["family_role"]
          drempel: number
          ontgrendeld: boolean
          houder_id: string | null
          houder_naam: string | null
        }[]
      }
      family_dreams: {
        Args: Record<string, never>
        Returns: {
          dream_id: string
          person_id: string
          first_name: string
          last_name: string
          photo_url: string | null
          title: string
          target_cents: number
          raised_cents: number
          collection_id: string | null
          status: Database["public"]["Enums"]["dream_status"]
        }[]
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
      payout_ready: { Args: { p: string }; Returns: boolean }
      album_reaction_counts: {
        Args: { p_item: string }
        Returns: {
          reaction: Database["public"]["Enums"]["reaction_kind"]
          aantal: number
        }[]
      }
      rad_lootjes: {
        Args: Record<string, never>
        Returns: {
          person_id: string
          first_name: string
          last_name: string
          lootjes: number
        }[]
      }
      draai_rad: { Args: Record<string, never>; Returns: string }
      beslis_rad: {
        Args: {
          p_draw: string
          p_choice: Database["public"]["Enums"]["rad_choice"]
          p_recipient: string | null
          p_transfer?: string | null
        }
        Returns: undefined
      }
      my_pot_summary: {
        Args: Record<string, never>
        Returns: {
          saldo_cents: number
          uit_1pct_cents: number
          uit_donaties_cents: number
          uit_maandbijdrage_cents: number
          uitgekeerd_cents: number
          donatie_aantal: number
        }[]
      }
      record_pot_donation: {
        Args: { p_network: string; p_person: string; p_amount: number; p_ref: string }
        Returns: undefined
      }
      record_pot_maandbijdrage: {
        Args: { p_network: string; p_person: string; p_amount: number; p_ref: string }
        Returns: undefined
      }
      pot_maandbijdrage_stats: {
        Args: Record<string, never>
        Returns: { leden: number; per_maand_cents: number }[]
      }
      relation_label: { Args: { me: string; other: string }; Returns: string }
      relation_route: { Args: { me: string; other: string }; Returns: string }
      settle_contribution: {
        Args: { p_contribution: string; p_intent: string | null }
        Returns: undefined
      }
      siblings_of: {
        Args: { p: string }
        Returns: { person_id: string; shared_parents: number }[]
      }
      stem_ronde: {
        Args: Record<string, never>
        Returns: {
          id: string
          network_id: string
          year: number
          status: Database["public"]["Enums"]["stem_status"]
          winner_person_id: string | null
          created_at: string
          decided_at: string | null
        }
      }
      stem_uitslag: {
        Args: { p_round: string }
        Returns: {
          nomination_id: string
          nominee_id: string
          nominee_naam: string
          reason: string
          stemmen: number
          mijn_stem: boolean
        }[]
      }
      sluit_stem: { Args: { p_round: string }; Returns: string }
      meld: {
        Args: {
          p_recipient: string
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_subject_type: string | null
          p_subject_id: string | null
        }
        Returns: undefined
      }
      markeer_meldingen_gelezen: {
        Args: Record<string, never>
        Returns: undefined
      }
      start_familie: {
        Args: {
          p_naam: string
          p_land: string | null
          p_voornaam: string
          p_achternaam: string
          p_stad: string | null
        }
        Returns: string
      }
      ontdek_verbindingen: {
        Args: Record<string, never>
        Returns: {
          a_id: string
          a_naam: string
          b_id: string
          b_naam: string
          samen: number
        }[]
      }
      komende_verjaardagen: {
        Args: Record<string, never>
        Returns: {
          person_id: string
          naam: string
          born_on: string
          volgende: string
          wordt: number
          dagen_tot: number
        }[]
      }
      mijlpalen_tijdlijn: {
        Args: Record<string, never>
        Returns: {
          id: string
          person_id: string
          naam: string
          kind: Database["public"]["Enums"]["life_event_kind"]
          title: string
          occurs_on: string
          collection_id: string | null
        }[]
      }
    }
    Enums: {
      collection_status: "concept" | "open" | "gesloten" | "uitbetaald"
      contact_status: "verbonden" | "stil" | "herstellend"
      business_status: "stemming" | "goedgekeurd" | "afgewezen" | "afgerond"
      contribution_status: "wachtend" | "betaald" | "mislukt" | "terugbetaald"
      dream_status: "actief" | "vervuld" | "gepauzeerd"
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
      media_kind: "foto" | "video" | "audio"
      reaction_kind: "hart" | "lach" | "traan" | "vuur"
      rad_status: "getrokken" | "besloten"
      rad_choice: "zelf" | "gunnen" | "pot" | "dromen"
      stem_status: "open" | "afgerond"
      notification_kind:
        | "album_reactie"
        | "album_opmerking"
        | "album_tag"
        | "stem_nominatie"
        | "stem_winst"
        | "mijlpaal"
      payout_provider: "stripe" | "flutterwave"
      payout_status: "onboarding" | "ready" | "restricted"
      pot_entry_kind: "transactie_1pct" | "maandbijdrage" | "donatie" | "uitkering"
      pot_sub_status: "actief" | "geannuleerd"
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
