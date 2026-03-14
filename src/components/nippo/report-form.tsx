'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OvertimeRow } from './overtime-row'
import { PartnerOvertime } from './partner-overtime'
import { Plus } from 'lucide-react'

export function ReportForm() {
  const [contractType, setContractType] = useState('常用')
  const [workStart, setWorkStart] = useState('08:00')
  const [workEnd, setWorkEnd] = useState('17:00')
  const [weather, setWeather] = useState('')

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* 現場情報 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">現場情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">サンプル現場</span>
            <Badge>{contractType}</Badge>
          </div>
          <div className="text-sm text-gray-500">
            発注元: サンプル会社 / 支払者: サンプル会社
          </div>
        </CardContent>
      </Card>

      {/* 作業時間 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">作業時間</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始</Label>
              <Input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>終了</Label>
              <Input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 作業者 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">作業者</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">山田太郎</Badge>
            <Badge variant="secondary">佐藤次郎</Badge>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3 w-3" />
              追加
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            計 2名（常用: 2名 / 請負: 0名）
          </div>
        </CardContent>
      </Card>

      {/* 残業者 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">残業者</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OvertimeRow
            name="山田太郎"
            startTime="17:00"
            endTime="17:30"
            onRemove={() => {}}
          />
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-1 h-3 w-3" />
            残業者を追加
          </Button>
        </CardContent>
      </Card>

      {/* 協力会社 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">協力会社</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PartnerOvertime
            name="蓮見鳶工業"
            headcount={2}
            overtimeHeadcount={1}
            overtimeHours={0.5}
          />
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-1 h-3 w-3" />
            協力会社を追加
          </Button>
        </CardContent>
      </Card>

      {/* 作業内容 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">作業内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">とび</Badge>
            <Badge variant="outline">解体</Badge>
            <Badge variant="outline">サポート土工</Badge>
            <Badge variant="outline">現場管理</Badge>
            <Badge variant="outline">CON</Badge>
            <Badge variant="outline">その他</Badge>
          </div>
          <Textarea placeholder="作業内容の詳細" />
        </CardContent>
      </Card>

      {/* 天候・気温 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">天候・環境</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>天候</Label>
              <Select value={weather} onValueChange={(value) => setWeather(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="晴">晴</SelectItem>
                  <SelectItem value="曇">曇</SelectItem>
                  <SelectItem value="雨">雨</SelectItem>
                  <SelectItem value="雪">雪</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>気温</Label>
              <Input type="number" placeholder="℃" />
            </div>
            <div className="space-y-2">
              <Label>風力</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="強">強</SelectItem>
                  <SelectItem value="中">中</SelectItem>
                  <SelectItem value="弱">弱</SelectItem>
                  <SelectItem value="無">無</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 欠勤・遅刻早退 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">欠勤・遅刻早退</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="欠勤者・遅刻早退者がいる場合は記入" />
        </CardContent>
      </Card>
    </div>
  )
}
