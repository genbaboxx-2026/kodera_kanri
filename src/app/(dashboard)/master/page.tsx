'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkerManagement } from '@/components/master/worker-management'
import { DepartmentManagement } from '@/components/master/department-management'
import { CompanyManagement } from '@/components/master/company-management'
import { PartnerCompanyManagement } from '@/components/master/partner-company-management'
import { LocationTypeManagement } from '@/components/master/location-type-management'
import { CalendarManagement } from '@/components/master/calendar-management'

export default function MasterPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">マスタ設定</h1>
      </div>

      <Tabs defaultValue="workers" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="workers">作業員</TabsTrigger>
          <TabsTrigger value="departments">所属</TabsTrigger>
          <TabsTrigger value="companies">発注元・支払者</TabsTrigger>
          <TabsTrigger value="partners">協力会社</TabsTrigger>
          <TabsTrigger value="locations">勤務場所区分</TabsTrigger>
          <TabsTrigger value="calendar">会社カレンダー</TabsTrigger>
        </TabsList>

        {/* 作業員タブ */}
        <TabsContent value="workers">
          <WorkerManagement />
        </TabsContent>

        {/* 所属タブ */}
        <TabsContent value="departments">
          <DepartmentManagement />
        </TabsContent>

        {/* 発注元・支払者タブ */}
        <TabsContent value="companies">
          <CompanyManagement />
        </TabsContent>

        {/* 協力会社タブ */}
        <TabsContent value="partners">
          <PartnerCompanyManagement />
        </TabsContent>

        {/* 勤務場所区分タブ */}
        <TabsContent value="locations">
          <LocationTypeManagement />
        </TabsContent>

        {/* 会社カレンダータブ */}
        <TabsContent value="calendar">
          <CalendarManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
