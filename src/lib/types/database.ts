// Gegenereerd uit de Supabase-database (supabase gen types).
// Niet met de hand bewerken, hergenereer na een migratie.
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
      active_network: {
        Row: {
          auth_uid: string
          network_id: string
          updated_at: string
        }
        Insert: {
          auth_uid: string
          network_id: string
          updated_at?: string
        }
        Update: {
          auth_uid?: string
          network_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_network_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
        ]
      }
      album_comments: {
        Row: {
          album_item_id: string
          comment_text: string
          created_at: string
          id: string
          person_id: string
        }
        Insert: {
          album_item_id: string
          comment_text: string
          created_at?: string
          id?: string
          person_id: string
        }
        Update: {
          album_item_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_comments_album_item_id_fkey"
            columns: ["album_item_id"]
            isOneToOne: false
            referencedRelation: "album_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_comments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      album_items: {
        Row: {
          created_at: string
          date_of_memory: string | null
          file_type: Database["public"]["Enums"]["media_kind"]
          file_url: string
          id: string
          location: string | null
          memory_text: string | null
          network_id: string
          title: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          date_of_memory?: string | null
          file_type?: Database["public"]["Enums"]["media_kind"]
          file_url: string
          id?: string
          location?: string | null
          memory_text?: string | null
          network_id: string
          title?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          date_of_memory?: string | null
          file_type?: Database["public"]["Enums"]["media_kind"]
          file_url?: string
          id?: string
          location?: string | null
          memory_text?: string | null
          network_id?: string
          title?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_items_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_items_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      album_reactions: {
        Row: {
          album_item_id: string
          created_at: string
          id: string
          person_id: string
          reaction: Database["public"]["Enums"]["reaction_kind"]
        }
        Insert: {
          album_item_id: string
          created_at?: string
          id?: string
          person_id: string
          reaction: Database["public"]["Enums"]["reaction_kind"]
        }
        Update: {
          album_item_id?: string
          created_at?: string
          id?: string
          person_id?: string
          reaction?: Database["public"]["Enums"]["reaction_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "album_reactions_album_item_id_fkey"
            columns: ["album_item_id"]
            isOneToOne: false
            referencedRelation: "album_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_reactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      album_tags: {
        Row: {
          album_item_id: string
          confirmed: boolean
          created_at: string
          id: string
          person_id: string
          tagged_by: string
        }
        Insert: {
          album_item_id: string
          confirmed?: boolean
          created_at?: string
          id?: string
          person_id: string
          tagged_by: string
        }
        Update: {
          album_item_id?: string
          confirmed?: boolean
          created_at?: string
          id?: string
          person_id?: string
          tagged_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_tags_album_item_id_fkey"
            columns: ["album_item_id"]
            isOneToOne: false
            referencedRelation: "album_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_tags_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      begroetingen: {
        Row: {
          created_at: string
          id: string
          naar_persoon: string
          van_persoon: string
        }
        Insert: {
          created_at?: string
          id?: string
          naar_persoon: string
          van_persoon: string
        }
        Update: {
          created_at?: string
          id?: string
          naar_persoon?: string
          van_persoon?: string
        }
        Relationships: [
          {
            foreignKeyName: "begroetingen_naar_persoon_fkey"
            columns: ["naar_persoon"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "begroetingen_van_persoon_fkey"
            columns: ["van_persoon"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      business_dreams: {
        Row: {
          approved_at: string | null
          collection_id: string | null
          created_at: string
          description: string
          expected_revenue_cents: number | null
          give_back: string | null
          id: string
          name: string
          network_id: string
          person_id: string
          status: Database["public"]["Enums"]["business_status"]
          target_cents: number
        }
        Insert: {
          approved_at?: string | null
          collection_id?: string | null
          created_at?: string
          description: string
          expected_revenue_cents?: number | null
          give_back?: string | null
          id?: string
          name: string
          network_id: string
          person_id: string
          status?: Database["public"]["Enums"]["business_status"]
          target_cents: number
        }
        Update: {
          approved_at?: string | null
          collection_id?: string | null
          created_at?: string
          description?: string
          expected_revenue_cents?: number | null
          give_back?: string | null
          id?: string
          name?: string
          network_id?: string
          person_id?: string
          status?: Database["public"]["Enums"]["business_status"]
          target_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_dreams_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_dreams_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_dreams_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      business_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          asker_id: string
          business_id: string
          created_at: string
          id: string
          question: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          asker_id: string
          business_id: string
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          asker_id?: string
          business_id?: string
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_questions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_questions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_dreams"
            referencedColumns: ["id"]
          },
        ]
      }
      business_updates: {
        Row: {
          business_id: string
          created_at: string
          id: string
          metric: string | null
          note: string | null
          photo_url: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          metric?: string | null
          note?: string | null
          photo_url?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          metric?: string | null
          note?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_updates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_dreams"
            referencedColumns: ["id"]
          },
        ]
      }
      business_votes: {
        Row: {
          approve: boolean
          business_id: string
          created_at: string
          id: string
          voter_id: string
        }
        Insert: {
          approve: boolean
          business_id: string
          created_at?: string
          id?: string
          voter_id: string
        }
        Update: {
          approve?: boolean
          business_id?: string
          created_at?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_votes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_dreams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          person_id: string
          room_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          person_id: string
          room_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          person_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          edited_at: string | null
          id: string
          message_text: string | null
          message_type: Database["public"]["Enums"]["chat_message_type"]
          reference_id: string | null
          room_id: string
          sender_id: string | null
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          id?: string
          message_text?: string | null
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          reference_id?: string | null
          room_id: string
          sender_id?: string | null
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          id?: string
          message_text?: string | null
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          reference_id?: string | null
          room_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          country: string | null
          created_at: string
          id: string
          name: string | null
          network_id: string
          type: Database["public"]["Enums"]["chat_room_type"]
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          name?: string | null
          network_id: string
          type?: Database["public"]["Enums"]["chat_room_type"]
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          name?: string | null
          network_id?: string
          type?: Database["public"]["Enums"]["chat_room_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Update: {
          beneficiary_id?: string
          closes_at?: string
          created_at?: string
          id?: string
          life_event_id?: string | null
          message?: string | null
          network_id?: string
          opens_at?: string
          started_by?: string
          status?: Database["public"]["Enums"]["collection_status"]
          stripe_account_id?: string | null
          suggested_cents?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_life_event_id_fkey"
            columns: ["life_event_id"]
            isOneToOne: false
            referencedRelation: "life_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_log: {
        Row: {
          id: string
          occurred_at: string
          person_a: string
          person_b: string
        }
        Insert: {
          id?: string
          occurred_at?: string
          person_a: string
          person_b: string
        }
        Update: {
          id?: string
          occurred_at?: string
          person_a?: string
          person_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_log_person_a_fkey"
            columns: ["person_a"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_log_person_b_fkey"
            columns: ["person_b"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          changed_at?: string
          network_id?: string
          person_a?: string
          person_b?: string
          set_by?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
        }
        Relationships: [
          {
            foreignKeyName: "contact_states_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_states_person_a_fkey"
            columns: ["person_a"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_states_person_b_fkey"
            columns: ["person_b"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_states_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          amount_cents?: number
          collection_id?: string
          contributor_id?: string
          created_at?: string
          currency?: string
          hide_name?: boolean
          id?: string
          message?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          stripe_payment_intent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          collection_id?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          network_id?: string
          person_id?: string
          status?: Database["public"]["Enums"]["dream_status"]
          target_cents?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dreams_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dreams_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dreams_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      event_suggestions: {
        Row: {
          kind: Database["public"]["Enums"]["life_event_kind"]
          suggested_cents: number
        }
        Insert: {
          kind: Database["public"]["Enums"]["life_event_kind"]
          suggested_cents: number
        }
        Update: {
          kind?: Database["public"]["Enums"]["life_event_kind"]
          suggested_cents?: number
        }
        Relationships: []
      }
      family_networks: {
        Row: {
          created_at: string
          home_country: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          home_country?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          home_country?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_subscriptions: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          created_at: string
          id: string
          network_id: string
          person_id: string
          status: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          id?: string
          network_id: string
          person_id: string
          status?: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          id?: string
          network_id?: string
          person_id?: string
          status?: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_subscriptions_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_subscriptions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          accepted_at?: string | null
          channel?: string
          created_at?: string
          destination?: string
          expires_at?: string
          id?: string
          invited_by?: string
          network_id?: string
          person_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      keeper_payouts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          network_id: string
          person_id: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          network_id: string
          person_id: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          network_id?: string
          person_id?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keeper_payouts_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keeper_payouts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      keeper_upgrades: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          created_at: string
          network_id: string
          person_id: string
          status: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          network_id: string
          person_id: string
          status?: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          network_id?: string
          person_id?: string
          status?: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keeper_upgrades_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: true
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keeper_upgrades_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["life_event_kind"]
          network_id?: string
          occurs_on?: string
          person_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_events_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          granted_at?: string
          id?: string
          network_id?: string
          person_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["family_role"]
        }
        Relationships: [
          {
            foreignKeyName: "memberships_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_person_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          network_id: string
          read_at: string | null
          recipient_person_id: string
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          actor_person_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          network_id: string
          read_at?: string | null
          recipient_person_id: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          actor_person_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          network_id?: string
          read_at?: string | null
          recipient_person_id?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_person_id_fkey"
            columns: ["actor_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_person_id_fkey"
            columns: ["recipient_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          country: string | null
          created_at: string
          external_id: string
          id: string
          network_id: string
          person_id: string
          provider: Database["public"]["Enums"]["payout_provider"]
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          external_id: string
          id?: string
          network_id: string
          person_id: string
          provider: Database["public"]["Enums"]["payout_provider"]
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          external_id?: string
          id?: string
          network_id?: string
          person_id?: string
          provider?: Database["public"]["Enums"]["payout_provider"]
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_accounts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      person_links: {
        Row: {
          confirmed_by: string | null
          created_at: string
          id: string
          person_a: string
          person_b: string
        }
        Insert: {
          confirmed_by?: string | null
          created_at?: string
          id?: string
          person_a: string
          person_b: string
        }
        Update: {
          confirmed_by?: string | null
          created_at?: string
          id?: string
          person_a?: string
          person_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_links_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_links_person_a_fkey"
            columns: ["person_a"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_links_person_b_fkey"
            columns: ["person_b"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          birth_name?: string | null
          born_on?: string | null
          city?: string | null
          claimed_by?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          died_on?: string | null
          first_name?: string
          id?: string
          last_name?: string
          managed_by?: string | null
          network_id?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_managed_by_fkey"
            columns: ["managed_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
        ]
      }
      pot_ledger: {
        Row: {
          amount_cents: number
          contribution_id: string | null
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["pot_entry_kind"]
          network_id: string
          person_id: string | null
          stripe_ref: string | null
        }
        Insert: {
          amount_cents: number
          contribution_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["pot_entry_kind"]
          network_id: string
          person_id?: string | null
          stripe_ref?: string | null
        }
        Update: {
          amount_cents?: number
          contribution_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["pot_entry_kind"]
          network_id?: string
          person_id?: string | null
          stripe_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pot_ledger_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pot_ledger_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pot_ledger_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      pot_subscriptions: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          created_at: string
          id: string
          network_id: string
          person_id: string
          status: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          amount_cents: number
          canceled_at?: string | null
          created_at?: string
          id?: string
          network_id: string
          person_id: string
          status?: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          id?: string
          network_id?: string
          person_id?: string
          status?: Database["public"]["Enums"]["pot_sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pot_subscriptions_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pot_subscriptions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      rad_draws: {
        Row: {
          choice: Database["public"]["Enums"]["rad_choice"] | null
          created_at: string
          decided_at: string | null
          id: string
          network_id: string
          prize_cents: number
          recipient_person_id: string | null
          status: Database["public"]["Enums"]["rad_status"]
          stripe_transfer_id: string | null
          winner_person_id: string | null
          year: number
        }
        Insert: {
          choice?: Database["public"]["Enums"]["rad_choice"] | null
          created_at?: string
          decided_at?: string | null
          id?: string
          network_id: string
          prize_cents: number
          recipient_person_id?: string | null
          status?: Database["public"]["Enums"]["rad_status"]
          stripe_transfer_id?: string | null
          winner_person_id?: string | null
          year: number
        }
        Update: {
          choice?: Database["public"]["Enums"]["rad_choice"] | null
          created_at?: string
          decided_at?: string | null
          id?: string
          network_id?: string
          prize_cents?: number
          recipient_person_id?: string | null
          status?: Database["public"]["Enums"]["rad_status"]
          stripe_transfer_id?: string | null
          winner_person_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rad_draws_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rad_draws_recipient_person_id_fkey"
            columns: ["recipient_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rad_draws_winner_person_id_fkey"
            columns: ["winner_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          created_at?: string
          created_by?: string | null
          from_person?: string
          id?: string
          kind?: Database["public"]["Enums"]["relationship_kind"]
          network_id?: string
          origin?: Database["public"]["Enums"]["relationship_origin"]
          to_person?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_from_person_fkey"
            columns: ["from_person"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_to_person_fkey"
            columns: ["to_person"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      stem_nominations: {
        Row: {
          created_at: string
          id: string
          nominated_by: string
          nominee_person_id: string
          reason: string
          round_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nominated_by: string
          nominee_person_id: string
          reason: string
          round_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nominated_by?: string
          nominee_person_id?: string
          reason?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stem_nominations_nominated_by_fkey"
            columns: ["nominated_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stem_nominations_nominee_person_id_fkey"
            columns: ["nominee_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stem_nominations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "stem_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      stem_rounds: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          network_id: string
          status: Database["public"]["Enums"]["stem_status"]
          winner_person_id: string | null
          year: number
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          network_id: string
          status?: Database["public"]["Enums"]["stem_status"]
          winner_person_id?: string | null
          year: number
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          network_id?: string
          status?: Database["public"]["Enums"]["stem_status"]
          winner_person_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "stem_rounds_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stem_rounds_winner_person_id_fkey"
            columns: ["winner_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      stem_votes: {
        Row: {
          created_at: string
          id: string
          nomination_id: string
          round_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nomination_id: string
          round_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nomination_id?: string
          round_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stem_votes_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "stem_nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stem_votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "stem_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stem_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          co_founder_cents?: number
          contribution_id?: string
          created_at?: string
          family_pot_cents?: number
          gross_cents?: number
          id?: string
          net_cents?: number
          network_id?: string
          platform_cents?: number
          role_holder_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "family_networks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activeer_keeper_upgrade: {
        Args: {
          p_amount?: number
          p_customer: string
          p_net: string
          p_person: string
          p_sub_id: string
        }
        Returns: undefined
      }
      album_reaction_counts: {
        Args: { p_item: string }
        Returns: {
          aantal: number
          reaction: Database["public"]["Enums"]["reaction_kind"]
        }[]
      }
      ancestors_of: {
        Args: { max_depth?: number; p: string }
        Returns: {
          generations: number
          person_id: string
        }[]
      }
      approve_business: { Args: { bid: string }; Returns: string }
      beslis_rad: {
        Args: {
          p_choice: Database["public"]["Enums"]["rad_choice"]
          p_draw: string
          p_recipient: string
          p_transfer?: string
        }
        Returns: undefined
      }
      bevestig_persoon_match: {
        Args: { p_a: string; p_b: string }
        Returns: undefined
      }
      business_tally: {
        Args: { bid: string }
        Returns: {
          actief: number
          goedgekeurd: boolean
          ja: number
          mijn_stem: boolean
          nee: number
          nodig: number
        }[]
      }
      chat_systeembericht: {
        Args: {
          p_net: string
          p_ref: string
          p_text: string
          p_type: Database["public"]["Enums"]["chat_message_type"]
        }
        Returns: undefined
      }
      claim_invite: { Args: { invite_token: string }; Returns: string }
      cofounder_dashboard: {
        Args: never
        Returns: {
          cofounder_verdienste_cents: number
          dromen_actief: number
          dromen_bereikt: number
          groei_maand: number
          leden_deelnemend: number
          leden_onbekend: number
          leden_sluimerend: number
          leden_totaal: number
          netwerksterkte: number
          pot_saldo_cents: number
          rolpool_cents: number
          volume_jaar_cents: number
          volume_maand_cents: number
          volume_totaal_cents: number
        }[]
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
        Returns: {
          contributor_count: number
          total_cents: number
        }[]
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
        Returns: {
          generations: number
          person_id: string
        }[]
      }
      draai_rad: { Args: never; Returns: string }
      ensure_tak_chats: { Args: never; Returns: undefined }
      familie_vorm: {
        Args: { me: string }
        Returns: {
          generaties: number
          herkend: number
          leden: number
        }[]
      }
      family_dreams: {
        Args: never
        Returns: {
          collection_id: string
          contributor_count: number
          dream_id: string
          first_name: string
          last_name: string
          person_id: string
          photo_url: string
          raised_cents: number
          status: Database["public"]["Enums"]["dream_status"]
          target_cents: number
          title: string
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
      family_roles: {
        Args: never
        Returns: {
          drempel: number
          houder_id: string
          houder_naam: string
          ontgrendeld: boolean
          role: Database["public"]["Enums"]["family_role"]
        }[]
      }
      family_stats: {
        Args: { me: string }
        Returns: {
          known: number
          out_of_touch: number
          silent: number
          total: number
        }[]
      }
      has_role: {
        Args: { net: string; r: Database["public"]["Enums"]["family_role"] }
        Returns: boolean
      }
      heeft_keeper_upgrade: { Args: { p_net: string }; Returns: boolean }
      heractiveer_familie_abonnement: {
        Args: {
          p_amount?: number
          p_customer: string
          p_net: string
          p_person: string
          p_sub_id: string
        }
        Returns: undefined
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
      is_lid_van_room: { Args: { p_room: string }; Returns: boolean }
      kan_bij_room: { Args: { p_room: string }; Returns: boolean }
      keeper_beschikbaar: { Args: { p_net: string }; Returns: number }
      keeper_saldo: { Args: { p_net: string }; Returns: number }
      keeper_van: { Args: { p_net: string }; Returns: string }
      komende_verjaardagen: {
        Args: never
        Returns: {
          born_on: string
          dagen_tot: number
          naam: string
          person_id: string
          volgende: string
          wordt: number
        }[]
      }
      leg_chat_contact_vast: { Args: { p_room: string }; Returns: undefined }
      maak_verjaardag_collectes: { Args: { p_dagen?: number }; Returns: number }
      markeer_meldingen_gelezen: { Args: never; Returns: undefined }
      me: { Args: never; Returns: string }
      meld: {
        Args: {
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_recipient: string
          p_subject_id: string
          p_subject_type: string
        }
        Returns: undefined
      }
      mijlpalen_tijdlijn: {
        Args: never
        Returns: {
          collection_id: string
          id: string
          kind: Database["public"]["Enums"]["life_event_kind"]
          naam: string
          occurs_on: string
          person_id: string
          title: string
        }[]
      }
      mijn_begroetingen: {
        Args: { me: string }
        Returns: {
          van_familie: string
          van_id: string
          van_naam: string
          wederzijds: boolean
        }[]
      }
      mijn_families: {
        Args: never
        Returns: {
          bevroren: boolean
          is_active: boolean
          name: string
          network_id: string
        }[]
      }
      mogelijke_matches: {
        Args: { me: string }
        Returns: {
          ander_familie: string
          ander_id: string
          ander_naam: string
          mijn_id: string
          mijn_naam: string
          signaal: string
        }[]
      }
      my_networks: { Args: never; Returns: string[] }
      my_pot_summary: {
        Args: never
        Returns: {
          donatie_aantal: number
          saldo_cents: number
          uit_1pct_cents: number
          uit_donaties_cents: number
          uit_maandbijdrage_cents: number
          uitgekeerd_cents: number
        }[]
      }
      naam_norm: { Args: { t: string }; Returns: string }
      netwerk_bevroren: { Args: { p_net: string }; Returns: boolean }
      ontdek_verbindingen: {
        Args: never
        Returns: {
          a_id: string
          a_naam: string
          b_id: string
          b_naam: string
          samen: number
        }[]
      }
      ontdekt_profiel: {
        Args: { me: string; p_id: string }
        Returns: {
          achternaam: string
          ander_familie: string
          brug_naam: string
          hun_kant: string
          id: string
          mijn_kant: string
          photo_url: string
          voornaam: string
        }[]
      }
      ontdekte_familie: {
        Args: { me: string }
        Returns: {
          ander_familie: string
          brug_naam: string
          hun_kant: string
          mijn_kant: string
          ontdekt_id: string
          ontdekt_naam: string
        }[]
      }
      partner_nudge: {
        Args: { me: string }
        Returns: {
          partner_naam: string
          toon: boolean
        }[]
      }
      payout_ready: { Args: { p: string }; Returns: boolean }
      pot_maandbijdrage_stats: {
        Args: never
        Returns: {
          leden: number
          per_maand_cents: number
        }[]
      }
      rad_lootjes: {
        Args: never
        Returns: {
          first_name: string
          last_name: string
          lootjes: number
          person_id: string
        }[]
      }
      record_pot_donation: {
        Args: {
          p_amount: number
          p_network: string
          p_person: string
          p_ref: string
        }
        Returns: undefined
      }
      record_pot_maandbijdrage: {
        Args: {
          p_amount: number
          p_network: string
          p_person: string
          p_ref: string
        }
        Returns: undefined
      }
      relatie_pad: {
        Args: { me: string; other: string }
        Returns: {
          naam: string
          pos: number
        }[]
      }
      relation_label: { Args: { me: string; other: string }; Returns: string }
      relation_route: { Args: { me: string; other: string }; Returns: string }
      settle_contribution: {
        Args: { p_contribution: string; p_intent: string }
        Returns: undefined
      }
      siblings_of: {
        Args: { p: string }
        Returns: {
          person_id: string
          shared_parents: number
        }[]
      }
      sluit_stem: { Args: { p_round: string }; Returns: string }
      start_direct: { Args: { p_other: string }; Returns: string }
      start_familie: {
        Args: {
          p_achternaam: string
          p_land: string
          p_naam: string
          p_stad: string
          p_voornaam: string
        }
        Returns: string
      }
      stem_ronde: {
        Args: never
        Returns: {
          created_at: string
          decided_at: string | null
          id: string
          network_id: string
          status: Database["public"]["Enums"]["stem_status"]
          winner_person_id: string | null
          year: number
        }
        SetofOptions: {
          from: "*"
          to: "stem_rounds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      stem_uitslag: {
        Args: { p_round: string }
        Returns: {
          mijn_stem: boolean
          nomination_id: string
          nominee_id: string
          nominee_naam: string
          reason: string
          stemmen: number
        }[]
      }
      stich_familie_als_lid: {
        Args: {
          p_amount?: number
          p_auth: string
          p_city: string
          p_country: string
          p_customer: string
          p_family_name: string
          p_first: string
          p_last: string
          p_sub_id: string
        }
        Returns: string
      }
      zeg_hallo: { Args: { p_naar: string }; Returns: undefined }
      zet_actieve_familie: { Args: { p_net: string }; Returns: undefined }
    }
    Enums: {
      business_status: "stemming" | "goedgekeurd" | "afgewezen" | "afgerond"
      chat_message_type:
        | "tekst"
        | "foto"
        | "collecte_link"
        | "album_item"
        | "moment"
        | "systeem"
      chat_room_type: "familie" | "tak" | "direct"
      collection_status:
        | "concept"
        | "open"
        | "gesloten"
        | "uitbetaald"
        | "verwijderd"
      contact_status: "verbonden" | "stil" | "herstellend"
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
      media_kind: "foto" | "video" | "audio"
      notification_kind:
        | "album_reactie"
        | "album_opmerking"
        | "album_tag"
        | "stem_nominatie"
        | "stem_winst"
        | "mijlpaal"
        | "uitnodiging_geaccepteerd"
      payout_provider: "stripe" | "flutterwave"
      payout_status: "onboarding" | "ready" | "restricted"
      pot_entry_kind:
        | "transactie_1pct"
        | "maandbijdrage"
        | "donatie"
        | "uitkering"
      pot_sub_status: "actief" | "geannuleerd"
      rad_choice: "zelf" | "gunnen" | "pot" | "dromen"
      rad_status: "getrokken" | "besloten"
      reaction_kind: "hart" | "lach" | "traan" | "vuur"
      relationship_kind: "parent" | "partner"
      relationship_origin:
        | "biological"
        | "adoptive"
        | "step"
        | "foster"
        | "donor"
        | "chosen"
      stem_status: "open" | "afgerond"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      business_status: ["stemming", "goedgekeurd", "afgewezen", "afgerond"],
      chat_message_type: [
        "tekst",
        "foto",
        "collecte_link",
        "album_item",
        "moment",
        "systeem",
      ],
      chat_room_type: ["familie", "tak", "direct"],
      collection_status: [
        "concept",
        "open",
        "gesloten",
        "uitbetaald",
        "verwijderd",
      ],
      contact_status: ["verbonden", "stil", "herstellend"],
      contribution_status: ["wachtend", "betaald", "mislukt", "terugbetaald"],
      dream_status: ["actief", "vervuld", "gepauzeerd"],
      family_role: [
        "co_founder",
        "events_manager",
        "verhalen_manager",
        "pot_beheerder",
        "connector",
        "welzijn_manager",
        "mediator",
        "archivaris",
      ],
      invite_status: ["open", "geaccepteerd", "verlopen"],
      life_event_kind: [
        "verjaardag",
        "ronde_verjaardag",
        "zwemdiploma",
        "nieuwe_school",
        "afstuderen",
        "huwelijk",
        "geboorte",
        "overlijden",
        "diaspora_mijlpaal",
        "business_droom",
        "nood",
      ],
      media_kind: ["foto", "video", "audio"],
      notification_kind: [
        "album_reactie",
        "album_opmerking",
        "album_tag",
        "stem_nominatie",
        "stem_winst",
        "mijlpaal",
        "uitnodiging_geaccepteerd",
      ],
      payout_provider: ["stripe", "flutterwave"],
      payout_status: ["onboarding", "ready", "restricted"],
      pot_entry_kind: [
        "transactie_1pct",
        "maandbijdrage",
        "donatie",
        "uitkering",
      ],
      pot_sub_status: ["actief", "geannuleerd"],
      rad_choice: ["zelf", "gunnen", "pot", "dromen"],
      rad_status: ["getrokken", "besloten"],
      reaction_kind: ["hart", "lach", "traan", "vuur"],
      relationship_kind: ["parent", "partner"],
      relationship_origin: [
        "biological",
        "adoptive",
        "step",
        "foster",
        "donor",
        "chosen",
      ],
      stem_status: ["open", "afgerond"],
    },
  },
} as const
