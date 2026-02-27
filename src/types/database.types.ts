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
      action_items: {
        Row: {
          call_id: string | null
          campaign_name: string | null
          contact_id: string
          created_at: string
          description: string | null
          id: string
          is_resolved: boolean
          lead_id: string | null
          org_id: string
          resolution_detail: string | null
          resolution_type: Database["public"]["Enums"]["resolution_type"] | null
          resolved_at: string | null
          title: string
          type: Database["public"]["Enums"]["action_item_type"]
        }
        Insert: {
          call_id?: string | null
          campaign_name?: string | null
          contact_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean
          lead_id?: string | null
          org_id: string
          resolution_detail?: string | null
          resolution_type?:
            | Database["public"]["Enums"]["resolution_type"]
            | null
          resolved_at?: string | null
          title: string
          type: Database["public"]["Enums"]["action_item_type"]
        }
        Update: {
          call_id?: string | null
          campaign_name?: string | null
          contact_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean
          lead_id?: string | null
          org_id?: string
          resolution_detail?: string | null
          resolution_type?:
            | Database["public"]["Enums"]["resolution_type"]
            | null
          resolved_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["action_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "action_items_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          additional_notes: string | null
          agent_type: string | null
          booking_rate: number
          campaign_goals: Json | null
          created_at: string
          direction: Database["public"]["Enums"]["agent_direction"]
          id: string
          name: string
          org_id: string
          phone_number_id: string | null
          preferred_greeting: string | null
          purpose_description: string | null
          retell_agent_id: string | null
          status: Database["public"]["Enums"]["agent_status"]
          total_bookings: number
          total_calls: number
          updated_at: string
          voice_gender: string | null
        }
        Insert: {
          additional_notes?: string | null
          agent_type?: string | null
          booking_rate?: number
          campaign_goals?: Json | null
          created_at?: string
          direction?: Database["public"]["Enums"]["agent_direction"]
          id?: string
          name: string
          org_id: string
          phone_number_id?: string | null
          preferred_greeting?: string | null
          purpose_description?: string | null
          retell_agent_id?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          total_bookings?: number
          total_calls?: number
          updated_at?: string
          voice_gender?: string | null
        }
        Update: {
          additional_notes?: string | null
          agent_type?: string | null
          booking_rate?: number
          campaign_goals?: Json | null
          created_at?: string
          direction?: Database["public"]["Enums"]["agent_direction"]
          id?: string
          name?: string
          org_id?: string
          phone_number_id?: string | null
          preferred_greeting?: string | null
          purpose_description?: string | null
          retell_agent_id?: string | null
          status?: Database["public"]["Enums"]["agent_status"]
          total_bookings?: number
          total_calls?: number
          updated_at?: string
          voice_gender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          calendar_connection_id: string | null
          calendar_event_id: string | null
          calendar_provider: string | null
          calendar_synced_at: string | null
          call_id: string | null
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          is_manual: boolean
          lead_id: string | null
          notes: string | null
          org_id: string
          scheduled_at: string
          status: string
          sync_status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          calendar_connection_id?: string | null
          calendar_event_id?: string | null
          calendar_provider?: string | null
          calendar_synced_at?: string | null
          call_id?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_manual?: boolean
          lead_id?: string | null
          notes?: string | null
          org_id: string
          scheduled_at: string
          status?: string
          sync_status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          calendar_connection_id?: string | null
          calendar_event_id?: string | null
          calendar_provider?: string | null
          calendar_synced_at?: string | null
          call_id?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_manual?: boolean
          lead_id?: string | null
          notes?: string | null
          org_id?: string
          scheduled_at?: string
          status?: string
          sync_status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_blocks: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          org_id: string
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          org_id: string
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          org_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_blocks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          calendar_name: string
          color: string | null
          created_at: string
          id: string
          integration_id: string
          is_enabled_for_display: boolean
          org_id: string
          provider: string
          provider_calendar_id: string
          sync_direction: string
          updated_at: string
        }
        Insert: {
          calendar_name: string
          color?: string | null
          created_at?: string
          id?: string
          integration_id: string
          is_enabled_for_display?: boolean
          org_id: string
          provider: string
          provider_calendar_id: string
          sync_direction?: string
          updated_at?: string
        }
        Update: {
          calendar_name?: string
          color?: string | null
          created_at?: string
          id?: string
          integration_id?: string
          is_enabled_for_display?: boolean
          org_id?: string
          provider?: string
          provider_calendar_id?: string
          sync_direction?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string | null
          ai_summary: string | null
          caller_phone: string | null
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds: number | null
          ended_at: string | null
          engagement_level: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          org_id: string
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          outcome_confidence: number | null
          phone_number_id: string | null
          recording_url: string | null
          retell_call_id: string | null
          sentiment: string | null
          started_at: string | null
          summary_one_line: string | null
          transcript_text: string | null
          transcript_url: string | null
        }
        Insert: {
          agent_id?: string | null
          ai_summary?: string | null
          caller_phone?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          ended_at?: string | null
          engagement_level?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          org_id: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          outcome_confidence?: number | null
          phone_number_id?: string | null
          recording_url?: string | null
          retell_call_id?: string | null
          sentiment?: string | null
          started_at?: string | null
          summary_one_line?: string | null
          transcript_text?: string | null
          transcript_url?: string | null
        }
        Update: {
          agent_id?: string | null
          ai_summary?: string | null
          caller_phone?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["call_direction"]
          duration_seconds?: number | null
          ended_at?: string | null
          engagement_level?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          org_id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          outcome_confidence?: number | null
          phone_number_id?: string | null
          recording_url?: string | null
          retell_call_id?: string | null
          sentiment?: string | null
          started_at?: string | null
          summary_one_line?: string | null
          transcript_text?: string | null
          transcript_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_appointment_schedules: {
        Row: {
          campaign_id: string
          created_at: string
          day_of_week: number
          enabled: boolean
          id: string
          slots: Json
        }
        Insert: {
          campaign_id: string
          created_at?: string
          day_of_week: number
          enabled?: boolean
          id?: string
          slots?: Json
        }
        Update: {
          campaign_id?: string
          created_at?: string
          day_of_week?: number
          enabled?: boolean
          id?: string
          slots?: Json
        }
        Relationships: [
          {
            foreignKeyName: "campaign_appointment_schedules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_schedules: {
        Row: {
          campaign_id: string
          created_at: string
          day_of_week: number
          enabled: boolean
          id: string
          slots: Json
        }
        Insert: {
          campaign_id: string
          created_at?: string
          day_of_week: number
          enabled?: boolean
          id?: string
          slots?: Json
        }
        Update: {
          campaign_id?: string
          created_at?: string
          day_of_week?: number
          enabled?: boolean
          id?: string
          slots?: Json
        }
        Relationships: [
          {
            foreignKeyName: "campaign_schedules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          agent_id: string | null
          bookings: number
          calendar_connection_id: string | null
          calls_connected: number
          calls_made: number
          created_at: string
          daily_call_limit: number | null
          end_date: string | null
          id: string
          max_retries: number | null
          name: string
          org_id: string
          retry_interval_hours: number | null
          status: Database["public"]["Enums"]["campaign_status"]
          timezone: string | null
          total_duration_minutes: number
          total_leads: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          bookings?: number
          calendar_connection_id?: string | null
          calls_connected?: number
          calls_made?: number
          created_at?: string
          daily_call_limit?: number | null
          end_date?: string | null
          id?: string
          max_retries?: number | null
          name: string
          org_id: string
          retry_interval_hours?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
          timezone?: string | null
          total_duration_minutes?: number
          total_leads?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          bookings?: number
          calendar_connection_id?: string | null
          calls_connected?: number
          calls_made?: number
          created_at?: string
          daily_call_limit?: number | null
          end_date?: string | null
          id?: string
          max_retries?: number | null
          name?: string
          org_id?: string
          retry_interval_hours?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
          timezone?: string | null
          total_duration_minutes?: number
          total_leads?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_settings: {
        Row: {
          auto_email_unsub: boolean
          auto_sms_stop: boolean
          auto_verbal_dnc: boolean
          casl_enabled: boolean
          created_at: string
          id: string
          national_dnc_check: boolean
          org_id: string
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          auto_email_unsub?: boolean
          auto_sms_stop?: boolean
          auto_verbal_dnc?: boolean
          casl_enabled?: boolean
          created_at?: string
          id?: string
          national_dnc_check?: boolean
          org_id: string
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_email_unsub?: boolean
          auto_sms_stop?: boolean
          auto_verbal_dnc?: boolean
          casl_enabled?: boolean
          created_at?: string
          id?: string
          national_dnc_check?: boolean
          org_id?: string
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          crm_provider: string | null
          crm_record_id: string | null
          email: string | null
          first_name: string
          id: string
          is_dnc: boolean
          last_name: string | null
          org_id: string
          phone: string
          source: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          crm_provider?: string | null
          crm_record_id?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_dnc?: boolean
          last_name?: string | null
          org_id: string
          phone: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          crm_provider?: string | null
          crm_record_id?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_dnc?: boolean
          last_name?: string | null
          org_id?: string
          phone?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activity_log: {
        Row: {
          activity_type: string
          contact_id: string
          created_at: string
          crm_engagement_id: string | null
          crm_provider: string
          error_message: string | null
          id: string
          org_id: string
          payload: Json | null
          status: string
        }
        Insert: {
          activity_type: string
          contact_id: string
          created_at?: string
          crm_engagement_id?: string | null
          crm_provider: string
          error_message?: string | null
          id?: string
          org_id: string
          payload?: Json | null
          status?: string
        }
        Update: {
          activity_type?: string
          contact_id?: string
          created_at?: string
          crm_engagement_id?: string | null
          crm_provider?: string
          error_message?: string | null
          id?: string
          org_id?: string
          payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dnc_list: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          org_id: string
          phone: string
          reason: string
          source_call_id: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          org_id: string
          phone: string
          reason?: string
          source_call_id?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          org_id?: string
          phone?: string
          reason?: string
          source_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dnc_list_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dnc_list_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dnc_list_source_call_id_fkey"
            columns: ["source_call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          org_id: string
          sent_at: string | null
          status: string
          subject: string | null
          type: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          org_id: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          org_id?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          account_email: string | null
          config: Json | null
          connected_at: string | null
          created_at: string
          id: string
          org_id: string
          service_name: string
          service_type: string | null
          status: string
        }
        Insert: {
          account_email?: string | null
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          id?: string
          org_id: string
          service_name: string
          service_type?: string | null
          status?: string
        }
        Update: {
          account_email?: string | null
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          id?: string
          org_id?: string
          service_name?: string
          service_type?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          invoice_url: string | null
          org_id: string
          period_label: string | null
          status: string
          stripe_invoice_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          org_id: string
          period_label?: string | null
          status?: string
          stripe_invoice_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          org_id?: string
          period_label?: string | null
          status?: string
          stripe_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          import_source: string | null
          last_activity_at: string | null
          last_call_outcome: Database["public"]["Enums"]["call_outcome"] | null
          max_retries: number | null
          notes: string | null
          org_id: string
          retry_count: number
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          campaign_id: string
          contact_id: string
          created_at?: string
          id?: string
          import_source?: string | null
          last_activity_at?: string | null
          last_call_outcome?: Database["public"]["Enums"]["call_outcome"] | null
          max_retries?: number | null
          notes?: string | null
          org_id: string
          retry_count?: number
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          import_source?: string | null
          last_activity_at?: string | null
          last_call_outcome?: Database["public"]["Enums"]["call_outcome"] | null
          max_retries?: number | null
          notes?: string | null
          org_id?: string
          retry_count?: number
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          org_id: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          org_id: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          org_id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          business_phone: string | null
          business_type: string | null
          country: string | null
          created_at: string
          id: string
          industry: string | null
          name: string
          stripe_customer_id: string | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_phone?: string | null
          business_type?: string | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          stripe_customer_id?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_phone?: string | null
          business_type?: string | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          stripe_customer_id?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          agent_id: string | null
          assigned_to: string | null
          campaign_id: string | null
          created_at: string
          friendly_name: string | null
          id: string
          number: string
          org_id: string
          status: string
          total_calls_handled: number
          total_texts_sent: number
          twilio_sid: string | null
          type: Database["public"]["Enums"]["phone_number_type"]
        }
        Insert: {
          agent_id?: string | null
          assigned_to?: string | null
          campaign_id?: string | null
          created_at?: string
          friendly_name?: string | null
          id?: string
          number: string
          org_id: string
          status?: string
          total_calls_handled?: number
          total_texts_sent?: number
          twilio_sid?: string | null
          type?: Database["public"]["Enums"]["phone_number_type"]
        }
        Update: {
          agent_id?: string | null
          assigned_to?: string | null
          campaign_id?: string | null
          created_at?: string
          friendly_name?: string | null
          id?: string
          number?: string
          org_id?: string
          status?: string
          total_calls_handled?: number
          total_texts_sent?: number
          twilio_sid?: string | null
          type?: Database["public"]["Enums"]["phone_number_type"]
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_numbers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_numbers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string
          direction: string
          from_number: string | null
          id: string
          lead_id: string | null
          org_id: string
          phone_number_id: string | null
          status: string
          to_number: string | null
          twilio_sid: string | null
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          direction: string
          from_number?: string | null
          id?: string
          lead_id?: string | null
          org_id: string
          phone_number_id?: string | null
          status?: string
          to_number?: string | null
          twilio_sid?: string | null
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          direction?: string
          from_number?: string | null
          id?: string
          lead_id?: string | null
          org_id?: string
          phone_number_id?: string | null
          status?: string
          to_number?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          call_minutes_limit: number
          call_minutes_used: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          phone_numbers_limit: number
          phone_numbers_used: number
          plan_name: string | null
          price_monthly: number | null
          status: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          call_minutes_limit?: number
          call_minutes_used?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          phone_numbers_limit?: number
          phone_numbers_used?: number
          plan_name?: string | null
          price_monthly?: number | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          call_minutes_limit?: number
          call_minutes_used?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          phone_numbers_limit?: number
          phone_numbers_used?: number
          plan_name?: string | null
          price_monthly?: number | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string | null
          org_id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name?: string | null
          org_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string | null
          org_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      verification: {
        Row: {
          business_address: string | null
          business_type: string | null
          country: string | null
          created_at: string
          dba_name: string | null
          id: string
          industry: string | null
          legal_business_name: string | null
          org_id: string
          province_or_state: string | null
          registration_type: string | null
          rep_dob: string | null
          rep_email: string | null
          rep_full_name: string | null
          rep_job_title: string | null
          rep_phone: string | null
          reviewed_at: string | null
          state_registration_number: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string | null
          tax_id: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          business_address?: string | null
          business_type?: string | null
          country?: string | null
          created_at?: string
          dba_name?: string | null
          id?: string
          industry?: string | null
          legal_business_name?: string | null
          org_id: string
          province_or_state?: string | null
          registration_type?: string | null
          rep_dob?: string | null
          rep_email?: string | null
          rep_full_name?: string | null
          rep_job_title?: string | null
          rep_phone?: string | null
          reviewed_at?: string | null
          state_registration_number?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          tax_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          business_address?: string | null
          business_type?: string | null
          country?: string | null
          created_at?: string
          dba_name?: string | null
          id?: string
          industry?: string | null
          legal_business_name?: string | null
          org_id?: string
          province_or_state?: string | null
          registration_type?: string | null
          rep_dob?: string | null
          rep_email?: string | null
          rep_full_name?: string | null
          rep_job_title?: string | null
          rep_phone?: string | null
          reviewed_at?: string | null
          state_registration_number?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          tax_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          org_id: string | null
          payload: Json | null
          processed_at: string | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          org_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          source: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          org_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: never; Returns: string }
      handle_new_signup: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_org_name: string
          p_user_id: string
        }
        Returns: Json
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      action_item_type:
        | "sms_reply"
        | "callback_request"
        | "hot_lead"
        | "email_engagement"
        | "manual_booking_needed"
      agent_direction: "inbound" | "outbound"
      agent_status: "active" | "pending" | "inactive"
      call_direction: "inbound" | "outbound"
      call_outcome:
        | "booked"
        | "interested"
        | "callback"
        | "voicemail"
        | "no_answer"
        | "not_interested"
        | "wrong_number"
        | "dnc"
      campaign_status: "draft" | "active" | "paused" | "completed"
      lead_status:
        | "new"
        | "contacted"
        | "interested"
        | "appt_set"
        | "showed"
        | "closed_won"
        | "closed_lost"
        | "bad_lead"
      phone_number_type: "texting" | "inbound"
      resolution_type:
        | "appointment_scheduled"
        | "followup_scheduled"
        | "not_interested"
        | "wrong_number"
        | "dismissed"
      user_role: "owner" | "admin" | "member" | "super_admin"
      verification_status:
        | "not_started"
        | "in_progress"
        | "approved"
        | "rejected"
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
      action_item_type: [
        "sms_reply",
        "callback_request",
        "hot_lead",
        "email_engagement",
        "manual_booking_needed",
      ],
      agent_direction: ["inbound", "outbound"],
      agent_status: ["active", "pending", "inactive"],
      call_direction: ["inbound", "outbound"],
      call_outcome: [
        "booked",
        "interested",
        "callback",
        "voicemail",
        "no_answer",
        "not_interested",
        "wrong_number",
        "dnc",
      ],
      campaign_status: ["draft", "active", "paused", "completed"],
      lead_status: [
        "new",
        "contacted",
        "interested",
        "appt_set",
        "showed",
        "closed_won",
        "closed_lost",
        "bad_lead",
      ],
      phone_number_type: ["texting", "inbound"],
      resolution_type: [
        "appointment_scheduled",
        "followup_scheduled",
        "not_interested",
        "wrong_number",
        "dismissed",
      ],
      user_role: ["owner", "admin", "member", "super_admin"],
      verification_status: [
        "not_started",
        "in_progress",
        "approved",
        "rejected",
      ],
    },
  },
} as const
