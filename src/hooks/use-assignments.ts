'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type Assignment = Tables<'assignments'> & {
  site: Tables<'sites'>
  client_company: Tables<'companies'>
  payer_company: Tables<'companies'>
  assignment_workers: (Tables<'assignment_workers'> & {
    worker: Tables<'workers'>
  })[]
  assignment_partners: (Tables<'assignment_partners'> & {
    partner_company: Tables<'partner_companies'>
  })[]
}

export function useAssignments(targetDate: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('assignments')
          .select(`
            *,
            site:sites(*),
            client_company:companies!assignments_client_company_id_fkey(*),
            payer_company:companies!assignments_payer_company_id_fkey(*),
            assignment_workers(
              *,
              worker:workers(*)
            ),
            assignment_partners(
              *,
              partner_company:partner_companies(*)
            )
          `)
          .eq('target_date', targetDate)
          .order('created_at', { ascending: true })

        if (fetchError) throw fetchError

        setAssignments(data as Assignment[])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [targetDate])

  const refetch = () => {
    // トリガーして再フェッチ
  }

  return { assignments, loading, error, refetch }
}

export function useAssignmentLocations(targetDate: string) {
  const [locations, setLocations] = useState<
    (Tables<'assignment_locations'> & {
      worker: Tables<'workers'>
      location_type: Tables<'location_types'>
    })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('assignment_locations')
          .select(`
            *,
            worker:workers(*),
            location_type:location_types(*)
          `)
          .eq('target_date', targetDate)

        if (fetchError) throw fetchError

        setLocations(data || [])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [targetDate])

  return { locations, loading, error }
}
