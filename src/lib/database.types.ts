
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "availability_slots": {
                  Row: {
                    "created_at": string,"end_time": string,"id": string,"start_time": string,"user_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_time": string,"id"?: string,"start_time": string,"user_id": string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"end_time"?: string,"id"?: string,"start_time"?: string,"user_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_slots_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "availability_slots_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "created_at": string,"id": string,"initiated_by": string,"learner_id": string,"message": string,"offer_id": string,"proposed_starts_at": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"initiated_by": string,"learner_id": string,"message"?: string,"offer_id": string,"proposed_starts_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"initiated_by"?: string,"learner_id"?: string,"message"?: string,"offer_id"?: string,"proposed_starts_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_learner_id_fkey"
      columns: ["learner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_learner_id_fkey"
      columns: ["learner_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offer_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offer_stats"
      referencedColumns: ["offer_id"]
    },{
      foreignKeyName: "bookings_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"localities": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"offers": {
                  Row: {
                    "created_at": string,"description": string,"format": string,"id": string,"level": string,"locality_id": string | null,"max_participants": number | null,"mode": string,"session_count": number,"session_duration_min": number,"skill_id": string,"status": string,"teacher_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"format": string,"id"?: string,"level": string,"locality_id"?: string | null,"max_participants"?: number | null,"mode": string,"session_count": number,"session_duration_min": number,"skill_id": string,"status"?: string,"teacher_id": string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"format"?: string,"id"?: string,"level"?: string,"locality_id"?: string | null,"max_participants"?: number | null,"mode"?: string,"session_count"?: number,"session_duration_min"?: number,"skill_id"?: string,"status"?: string,"teacher_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_locality_id_fkey"
      columns: ["locality_id"]
isOneToOne: false
      referencedRelation: "localities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skill_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "bio": string,"created_at": string,"first_name": string,"id": string,"last_name": string,"locality_id": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string,"created_at"?: string,"first_name": string,"id": string,"last_name": string,"locality_id": string,"username": string
                  }
                  Update: {
                    "bio"?: string,"created_at"?: string,"first_name"?: string,"id"?: string,"last_name"?: string,"locality_id"?: string,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_locality_id_fkey"
      columns: ["locality_id"]
isOneToOne: false
      referencedRelation: "localities"
      referencedColumns: ["id"]
    }
                  ]
                },"ratings": {
                  Row: {
                    "booking_id": string,"comment": string,"created_at": string,"id": string,"learner_id": string,"points": number,"teacher_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"comment"?: string,"created_at"?: string,"id"?: string,"learner_id": string,"points": number,"teacher_id": string
                  }
                  Update: {
                    "booking_id"?: string,"comment"?: string,"created_at"?: string,"id"?: string,"learner_id"?: string,"points"?: number,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ratings_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "booking_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: true
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_learner_id_fkey"
      columns: ["learner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_learner_id_fkey"
      columns: ["learner_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "booking_id": string | null,"created_at": string,"ends_at": string,"id": string,"offer_id": string,"sequence_no": number,"starts_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id"?: string | null,"created_at"?: string,"ends_at": string,"id"?: string,"offer_id": string,"sequence_no": number,"starts_at": string,"status"?: string
                  }
                  Update: {
                    "booking_id"?: string | null,"created_at"?: string,"ends_at"?: string,"id"?: string,"offer_id"?: string,"sequence_no"?: number,"starts_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "booking_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offer_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offer_stats"
      referencedColumns: ["offer_id"]
    },{
      foreignKeyName: "sessions_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    }
                  ]
                },"skills": {
                  Row: {
                    "category_id": string,"created_at": string,"created_by": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "skills_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "skills_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "skills_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    }
                  ]
                },"user_skills": {
                  Row: {
                    "created_at": string,"id": string,"level": string | null,"role": string,"skill_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"level"?: string | null,"role": string,"skill_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"level"?: string | null,"role"?: string,"skill_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skill_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_skills_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_skills_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "booking_cards": {
                  Row: {
                    "created_at": string | null,"first_session_at": string | null,"format": string | null,"id": string | null,"initiated_by": string | null,"last_session_end_at": string | null,"learner_first_name": string | null,"learner_id": string | null,"learner_last_name": string | null,"learner_username": string | null,"level": string | null,"message": string | null,"mode": string | null,"next_session_at": string | null,"offer_id": string | null,"offer_status": string | null,"offer_title": string | null,"proposed_starts_at": string | null,"rating_comment": string | null,"rating_id": string | null,"rating_points": number | null,"session_count": number | null,"session_duration_min": number | null,"session_rows": number | null,"skill_id": string | null,"skill_name": string | null,"status": string | null,"teacher_first_name": string | null,"teacher_id": string | null,"teacher_last_name": string | null,"teacher_username": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "bookings_learner_id_fkey"
      columns: ["learner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_learner_id_fkey"
      columns: ["learner_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offer_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offer_stats"
      referencedColumns: ["offer_id"]
    },{
      foreignKeyName: "bookings_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skill_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_cards": {
                  Row: {
                    "accepted_count": number | null,"category_name": string | null,"created_at": string | null,"description": string | null,"format": string | null,"id": string | null,"level": string | null,"locality_id": string | null,"locality_name": string | null,"max_participants": number | null,"mode": string | null,"next_session_at": string | null,"points_total": number | null,"rating_count": number | null,"seats_left": number | null,"session_count": number | null,"session_duration_min": number | null,"skill_id": string | null,"skill_name": string | null,"status": string | null,"teacher_first_name": string | null,"teacher_id": string | null,"teacher_last_name": string | null,"teacher_locality_id": string | null,"teacher_locality_name": string | null,"teacher_username": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "offers_locality_id_fkey"
      columns: ["locality_id"]
isOneToOne: false
      referencedRelation: "localities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skill_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_locality_id_fkey"
      columns: ["teacher_locality_id"]
isOneToOne: false
      referencedRelation: "localities"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_stats": {
                  Row: {
                    "accepted_count": number | null,"next_session_at": string | null,"offer_id": string | null,"seats_left": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"skill_catalog": {
                  Row: {
                    "active_offer_count": number | null,"category_id": string | null,"category_name": string | null,"created_at": string | null,"id": string | null,"name": string | null,"teacher_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "skills_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_directory": {
                  Row: {
                    "active_offer_count": number | null,"first_name": string | null,"id": string | null,"last_name": string | null,"locality_id": string | null,"locality_name": string | null,"points_total": number | null,"rating_count": number | null,"username": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "profiles_locality_id_fkey"
      columns: ["locality_id"]
isOneToOne: false
      referencedRelation: "localities"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_stats": {
                  Row: {
                    "points_average": number | null,"points_total": number | null,"rating_count": number | null,"teacher_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "ratings_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teacher_directory"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "booking_session_bounds":
{ Args: { "p_booking_id": string }; Returns: Record<string, unknown>
                           },
"community_stats":
{ Args: Record<PropertyKey, never>; Returns: Record<string, unknown>
                           },
"create_offer":
{ Args: { "p_description": string,"p_format": string,"p_level": string,"p_locality_id": string,"p_max_participants": number,"p_mode": string,"p_session_count": number,"p_session_duration_min": number,"p_session_starts": (string)[],"p_skill_id": string,"p_title": string }; Returns: string
                           },
"is_booking_party":
{ Args: { "p_booking_id": string }; Returns: boolean
                           },
"is_offer_teacher":
{ Args: { "p_offer_id": string }; Returns: boolean
                           },
"pending_response_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"username_available":
{ Args: { "p_username": string }; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
