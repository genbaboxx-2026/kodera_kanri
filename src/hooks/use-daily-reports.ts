'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type DailyReport = Tables<'daily_reports'> & {
  site: Tables<'sites'>
  reporter: Tables<'workers'>
  report_workers: (Tables<'report_workers'> & {
    worker: Tables<'workers'>
  })[]
  report_partners: Tables<'report_partners'>[]
  report_work_categories: (Tables<'report_work_categories'> & {
    work_category: Tables<'work_categories'>
  })[]
  signature?: Tables<'signatures'>
}

export function useDailyReports(reportDate: string) {
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('daily_reports')
          .select(`
            *,
            site:sites(*),
            reporter:workers(*),
            report_workers(
              *,
              worker:workers(*)
            ),
            report_partners(*),
            report_work_categories(
              *,
              work_category:work_categories(*)
            ),
            signature:signatures(*)
          `)
          .eq('report_date', reportDate)
          .order('created_at', { ascending: true })

        if (fetchError) throw fetchError

        setReports(data as DailyReport[])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [reportDate])

  return { reports, loading, error }
}

export function useDailyReport(reportId: number | null) {
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!reportId) {
      setReport(null)
      setLoading(false)
      return
    }

    const fetchReport = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('daily_reports')
          .select(`
            *,
            site:sites(*),
            reporter:workers(*),
            report_workers(
              *,
              worker:workers(*)
            ),
            report_partners(*),
            report_work_categories(
              *,
              work_category:work_categories(*)
            ),
            signature:signatures(*)
          `)
          .eq('id', reportId)
          .single()

        if (fetchError) throw fetchError

        setReport(data as DailyReport)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [reportId])

  return { report, loading, error }
}
