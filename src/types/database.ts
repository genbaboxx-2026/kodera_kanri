// 自動生成される型定義ファイル
// Supabase CLIで `npx supabase gen types typescript` を実行して生成

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      workers: {
        Row: {
          id: number
          name: string
          name_kana: string
          email: string | null
          system_role: '管理者' | '現場スタッフ' | null
          can_edit_haichi: boolean
          can_edit_nippo: boolean
          employment_type: '正社員' | '外国人技能実習生'
          department: string
          fixed_overtime_hours: number
          status: '在籍' | '退職'
          line_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          name_kana: string
          email?: string | null
          system_role?: '管理者' | '現場スタッフ' | null
          can_edit_haichi?: boolean
          can_edit_nippo?: boolean
          employment_type: '正社員' | '外国人技能実習生'
          department: string
          fixed_overtime_hours?: number
          status?: '在籍' | '退職'
          line_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          name_kana?: string
          email?: string | null
          system_role?: '管理者' | '現場スタッフ' | null
          can_edit_haichi?: boolean
          can_edit_nippo?: boolean
          employment_type?: '正社員' | '外国人技能実習生'
          department?: string
          fixed_overtime_hours?: number
          status?: '在籍' | '退職'
          line_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      departments: {
        Row: {
          id: number
          name: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          display_order?: number
          created_at?: string
        }
      }
      sites: {
        Row: {
          id: number
          name: string
          construction_number: string | null
          client_company_id: number
          payer_company_id: number
          start_date: string | null
          end_date: string | null
          status: '稼働中' | '完了'
          default_contract_type: '常用' | '請負' | null
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          construction_number?: string | null
          client_company_id: number
          payer_company_id: number
          start_date?: string | null
          end_date?: string | null
          status?: '稼働中' | '完了'
          default_contract_type?: '常用' | '請負' | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          construction_number?: string | null
          client_company_id?: number
          payer_company_id?: number
          start_date?: string | null
          end_date?: string | null
          status?: '稼働中' | '完了'
          default_contract_type?: '常用' | '請負' | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: number
          name: string
          signer_name: string | null
          contact: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          signer_name?: string | null
          contact?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          signer_name?: string | null
          contact?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      partner_companies: {
        Row: {
          id: number
          name: string
          contact: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          contact?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          contact?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      location_types: {
        Row: {
          id: number
          name: string
          requires_report: boolean
          show_in_dezura: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          requires_report?: boolean
          show_in_dezura?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          requires_report?: boolean
          show_in_dezura?: boolean
          display_order?: number
          created_at?: string
        }
      }
      work_categories: {
        Row: {
          id: number
          name: string
          display_order: number
        }
        Insert: {
          id?: number
          name: string
          display_order?: number
        }
        Update: {
          id?: number
          name?: string
          display_order?: number
        }
      }
      company_calendar: {
        Row: {
          id: number
          fiscal_year: number
          calendar_date: string
          day_type: '出勤日' | '法定休日' | '所定休日'
        }
        Insert: {
          id?: number
          fiscal_year: number
          calendar_date: string
          day_type: '出勤日' | '法定休日' | '所定休日'
        }
        Update: {
          id?: number
          fiscal_year?: number
          calendar_date?: string
          day_type?: '出勤日' | '法定休日' | '所定休日'
        }
      }
      assignments: {
        Row: {
          id: number
          target_date: string
          site_id: number
          client_company_id: number
          payer_company_id: number
          contract_type: '常用' | '請負'
          shift_type: '日勤のみ' | '通し夜勤' | '夜勤のみ'
          memo: string | null
          published_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          target_date: string
          site_id: number
          client_company_id: number
          payer_company_id: number
          contract_type: '常用' | '請負'
          shift_type?: '日勤のみ' | '通し夜勤' | '夜勤のみ'
          memo?: string | null
          published_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          target_date?: string
          site_id?: number
          client_company_id?: number
          payer_company_id?: number
          contract_type?: '常用' | '請負'
          shift_type?: '日勤のみ' | '通し夜勤' | '夜勤のみ'
          memo?: string | null
          published_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      assignment_workers: {
        Row: {
          id: number
          assignment_id: number
          worker_id: number
          shift: '日勤' | '夜勤'
          is_foreman: boolean
          confirmed: boolean
          confirmed_at: string | null
        }
        Insert: {
          id?: number
          assignment_id: number
          worker_id: number
          shift?: '日勤' | '夜勤'
          is_foreman?: boolean
          confirmed?: boolean
          confirmed_at?: string | null
        }
        Update: {
          id?: number
          assignment_id?: number
          worker_id?: number
          shift?: '日勤' | '夜勤'
          is_foreman?: boolean
          confirmed?: boolean
          confirmed_at?: string | null
        }
      }
      assignment_partners: {
        Row: {
          id: number
          assignment_id: number
          partner_company_id: number
          headcount: number
        }
        Insert: {
          id?: number
          assignment_id: number
          partner_company_id: number
          headcount?: number
        }
        Update: {
          id?: number
          assignment_id?: number
          partner_company_id?: number
          headcount?: number
        }
      }
      assignment_locations: {
        Row: {
          id: number
          target_date: string
          worker_id: number
          location_type_id: number
        }
        Insert: {
          id?: number
          target_date: string
          worker_id: number
          location_type_id: number
        }
        Update: {
          id?: number
          target_date?: string
          worker_id?: number
          location_type_id?: number
        }
      }
      daily_reports: {
        Row: {
          id: number
          report_date: string
          site_id: number
          reporter_id: number
          contract_type: '常用' | '請負'
          work_start: string
          work_end: string
          night_start: string | null
          night_end: string | null
          headcount_total: number
          headcount_jouyo: number
          headcount_ukeoi: number
          work_detail: string | null
          remarks: string | null
          weather: '晴' | '曇' | '雨' | '雪' | null
          temperature: number | null
          wind: '強' | '中' | '弱' | '無' | null
          absent_note: string | null
          check_status: '未提出' | '提出済' | '1人目済' | '確定'
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          report_date: string
          site_id: number
          reporter_id: number
          contract_type: '常用' | '請負'
          work_start: string
          work_end: string
          night_start?: string | null
          night_end?: string | null
          headcount_total?: number
          headcount_jouyo?: number
          headcount_ukeoi?: number
          work_detail?: string | null
          remarks?: string | null
          weather?: '晴' | '曇' | '雨' | '雪' | null
          temperature?: number | null
          wind?: '強' | '中' | '弱' | '無' | null
          absent_note?: string | null
          check_status?: '未提出' | '提出済' | '1人目済' | '確定'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          report_date?: string
          site_id?: number
          reporter_id?: number
          contract_type?: '常用' | '請負'
          work_start?: string
          work_end?: string
          night_start?: string | null
          night_end?: string | null
          headcount_total?: number
          headcount_jouyo?: number
          headcount_ukeoi?: number
          work_detail?: string | null
          remarks?: string | null
          weather?: '晴' | '曇' | '雨' | '雪' | null
          temperature?: number | null
          wind?: '強' | '中' | '弱' | '無' | null
          absent_note?: string | null
          check_status?: '未提出' | '提出済' | '1人目済' | '確定'
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      report_workers: {
        Row: {
          id: number
          daily_report_id: number
          worker_id: number
          work_start: string | null
          work_end: string | null
          overtime_hours: number | null
          overtime_start: string | null
          overtime_end: string | null
        }
        Insert: {
          id?: number
          daily_report_id: number
          worker_id: number
          work_start?: string | null
          work_end?: string | null
          overtime_hours?: number | null
          overtime_start?: string | null
          overtime_end?: string | null
        }
        Update: {
          id?: number
          daily_report_id?: number
          worker_id?: number
          work_start?: string | null
          work_end?: string | null
          overtime_hours?: number | null
          overtime_start?: string | null
          overtime_end?: string | null
        }
      }
      report_work_categories: {
        Row: {
          id: number
          daily_report_id: number
          work_category_id: number
        }
        Insert: {
          id?: number
          daily_report_id: number
          work_category_id: number
        }
        Update: {
          id?: number
          daily_report_id?: number
          work_category_id?: number
        }
      }
      report_partners: {
        Row: {
          id: number
          daily_report_id: number
          partner_company_id: number
          headcount: number
          work_start: string | null
          work_end: string | null
          overtime_hours: number | null
        }
        Insert: {
          id?: number
          daily_report_id: number
          partner_company_id: number
          headcount?: number
          work_start?: string | null
          work_end?: string | null
          overtime_hours?: number | null
        }
        Update: {
          id?: number
          daily_report_id?: number
          partner_company_id?: number
          headcount?: number
          work_start?: string | null
          work_end?: string | null
          overtime_hours?: number | null
        }
      }
      signatures: {
        Row: {
          id: number
          daily_report_id: number
          signer_name: string
          image_path: string | null
          signed_at: string
          is_locked: boolean
        }
        Insert: {
          id?: number
          daily_report_id: number
          signer_name: string
          image_path?: string | null
          signed_at?: string
          is_locked?: boolean
        }
        Update: {
          id?: number
          daily_report_id?: number
          signer_name?: string
          image_path?: string | null
          signed_at?: string
          is_locked?: boolean
        }
      }
      dezura_records: {
        Row: {
          id: number
          record_date: string
          site_id: number
          assignment_id: number | null
          daily_report_id: number | null
          check_status: '未提出' | 'ピンク' | '確定'
          checker1_id: string | null
          checker1_at: string | null
          checker2_id: string | null
          checker2_at: string | null
          confirmed_at: string | null
        }
        Insert: {
          id?: number
          record_date: string
          site_id: number
          assignment_id?: number | null
          daily_report_id?: number | null
          check_status?: '未提出' | 'ピンク' | '確定'
          checker1_id?: string | null
          checker1_at?: string | null
          checker2_id?: string | null
          checker2_at?: string | null
          confirmed_at?: string | null
        }
        Update: {
          id?: number
          record_date?: string
          site_id?: number
          assignment_id?: number | null
          daily_report_id?: number | null
          check_status?: '未提出' | 'ピンク' | '確定'
          checker1_id?: string | null
          checker1_at?: string | null
          checker2_id?: string | null
          checker2_at?: string | null
          confirmed_at?: string | null
        }
      }
      attendance_monthly: {
        Row: {
          id: number
          worker_id: number
          year_month: number
          required_work_days: number
          days_day_shift: number
          days_night_only: number
          days_night_through: number
          total_hours: number
          overtime_hours: number
          overtime_fixed: number
          overtime_extra: number
          night_hours: number
          holiday_legal: number
          holiday_scheduled: number
          paid_leave: number
          comp_leave: number
        }
        Insert: {
          id?: number
          worker_id: number
          year_month: number
          required_work_days?: number
          days_day_shift?: number
          days_night_only?: number
          days_night_through?: number
          total_hours?: number
          overtime_hours?: number
          overtime_fixed?: number
          overtime_extra?: number
          night_hours?: number
          holiday_legal?: number
          holiday_scheduled?: number
          paid_leave?: number
          comp_leave?: number
        }
        Update: {
          id?: number
          worker_id?: number
          year_month?: number
          required_work_days?: number
          days_day_shift?: number
          days_night_only?: number
          days_night_through?: number
          total_hours?: number
          overtime_hours?: number
          overtime_fixed?: number
          overtime_extra?: number
          night_hours?: number
          holiday_legal?: number
          holiday_scheduled?: number
          paid_leave?: number
          comp_leave?: number
        }
      }
      profiles: {
        Row: {
          id: string
          worker_id: number | null
          role: '管理者' | '現場スタッフ' | '作業員'
          display_name: string
          line_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          worker_id?: number | null
          role?: '管理者' | '現場スタッフ' | '作業員'
          display_name: string
          line_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          worker_id?: number | null
          role?: '管理者' | '現場スタッフ' | '作業員'
          display_name?: string
          line_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
