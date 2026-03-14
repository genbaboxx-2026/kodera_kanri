// 残業計算ロジック

/**
 * 時刻文字列をパースして分単位で返す
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 作業時間から残業時間を計算する（0.5時間単位で丸め）
 * @param workStart 作業開始時刻 (HH:MM)
 * @param workEnd 作業終了時刻 (HH:MM)
 * @param standardHours 所定労働時間（時間）
 * @returns 残業時間（時間、0.5単位）
 */
export function calculateOvertimeHours(
  workStart: string,
  workEnd: string,
  standardHours: number = 8
): number {
  const startMinutes = parseTime(workStart)
  let endMinutes = parseTime(workEnd)

  // 終了時刻が開始時刻より前の場合（日をまたぐ場合）
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60
  }

  const totalMinutes = endMinutes - startMinutes
  const totalHours = totalMinutes / 60

  // 休憩時間を考慮（8時間超で1時間休憩と仮定）
  const breakHours = totalHours > 8 ? 1 : totalHours > 6 ? 0.75 : 0
  const workHours = totalHours - breakHours

  const overtimeHours = Math.max(0, workHours - standardHours)

  // 0.5時間単位で丸め
  return Math.round(overtimeHours * 2) / 2
}

/**
 * 残業開始〜終了時刻から残業時間を計算する（0.5時間単位で丸め）
 * @param overtimeStart 残業開始時刻 (HH:MM)
 * @param overtimeEnd 残業終了時刻 (HH:MM)
 * @returns 残業時間（時間、0.5単位）
 */
export function calculateOvertimeFromRange(
  overtimeStart: string,
  overtimeEnd: string
): number {
  const startMinutes = parseTime(overtimeStart)
  let endMinutes = parseTime(overtimeEnd)

  // 終了時刻が開始時刻より前の場合（日をまたぐ場合）
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60
  }

  const totalMinutes = endMinutes - startMinutes
  const hours = totalMinutes / 60

  // 0.5時間単位で丸め
  return Math.round(hours * 2) / 2
}

/**
 * 固定残業時間を考慮した残業時間の内訳を計算する
 * @param totalOvertimeHours 残業時間合計
 * @param fixedOvertimeHours 固定残業時間
 * @returns 固定残業内と固定残業超過分
 */
export function calculateOvertimeBreakdown(
  totalOvertimeHours: number,
  fixedOvertimeHours: number
): { fixed: number; extra: number } {
  const fixed = Math.min(totalOvertimeHours, fixedOvertimeHours)
  const extra = Math.max(0, totalOvertimeHours - fixedOvertimeHours)

  return { fixed, extra }
}
