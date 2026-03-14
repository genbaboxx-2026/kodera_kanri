// 夜勤計算ロジック

/**
 * 時刻文字列をパースして分単位で返す
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 深夜時間帯（22:00〜5:00）の勤務時間を計算する
 * @param workStart 作業開始時刻 (HH:MM)
 * @param workEnd 作業終了時刻 (HH:MM)
 * @returns 深夜勤務時間（時間、0.5単位）
 */
export function calculateNightHours(
  workStart: string,
  workEnd: string
): number {
  const startMinutes = parseTime(workStart)
  let endMinutes = parseTime(workEnd)

  // 終了時刻が開始時刻より前の場合（日をまたぐ場合）
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60
  }

  // 深夜時間帯: 22:00（1320分）〜29:00（1740分 = 翌5:00）
  const nightStart = 22 * 60 // 22:00
  const nightEnd = 29 * 60   // 翌5:00 (24+5=29時)

  let nightMinutes = 0

  // 勤務時間と深夜時間帯の重複を計算
  const overlapStart = Math.max(startMinutes, nightStart)
  const overlapEnd = Math.min(endMinutes, nightEnd)

  if (overlapStart < overlapEnd) {
    nightMinutes += overlapEnd - overlapStart
  }

  // 日をまたいで翌日の0:00〜5:00も深夜時間帯
  if (endMinutes > 24 * 60) {
    const nextDayOverlapEnd = Math.min(endMinutes - 24 * 60, 5 * 60)
    if (nextDayOverlapEnd > 0) {
      nightMinutes += nextDayOverlapEnd
    }
  }

  // 開始時刻が0:00〜5:00の場合
  if (startMinutes < 5 * 60) {
    nightMinutes += Math.min(5 * 60 - startMinutes, endMinutes - startMinutes)
  }

  const hours = nightMinutes / 60

  // 0.5時間単位で丸め
  return Math.round(hours * 2) / 2
}

/**
 * 夜勤タイプに応じた日数カウントを計算する
 * @param shiftType 勤務区分
 * @returns 日勤日数と夜勤日数の加算値
 */
export function calculateShiftDays(
  shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
): { dayShift: number; nightShift: number; multiplier: number } {
  switch (shiftType) {
    case '日勤のみ':
      return { dayShift: 1, nightShift: 0, multiplier: 1 }
    case '通し夜勤':
      // 日勤後そのまま夜勤 → 夜分を1日カウント × 1.5
      return { dayShift: 1, nightShift: 1, multiplier: 1.5 }
    case '夜勤のみ':
      // 日勤を欠勤扱い、夜勤手当 × 0.5
      return { dayShift: 0, nightShift: 1, multiplier: 0.5 }
    default:
      return { dayShift: 0, nightShift: 0, multiplier: 1 }
  }
}

/**
 * 月次の深夜時間合計を計算する
 * @param records 日別の深夜時間配列
 * @returns 深夜時間合計
 */
export function calculateMonthlyNightHours(
  records: { nightHours: number }[]
): number {
  return records.reduce((sum, record) => sum + record.nightHours, 0)
}
