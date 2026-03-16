// LINE Flex Message テンプレート

interface AssignmentInfo {
  siteName: string
  clientCompany: string
  contractType: '常用' | '請負'
  shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
  memo?: string
  assignmentWorkerId: number
}

// 複数現場の配置通知用Flex Message
export function createMultiSiteAssignmentNotification(
  date: string,
  siteNames: string[],
  assignmentWorkerIds: number[]
) {
  const siteListText = siteNames.length === 1
    ? siteNames[0]
    : siteNames.slice(0, -1).join('、') + 'と' + siteNames[siteNames.length - 1]

  // 確認用のIDは最初のassignment_worker_idを使用
  const confirmId = assignmentWorkerIds[0]

  return {
    type: 'flex' as const,
    altText: `【配置連絡】${date} ${siteListText}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1DB446',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: '配置連絡',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'sm',
          },
          {
            type: 'text',
            text: date,
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            margin: 'md',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: siteListText,
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: 'に配置されました！',
            size: 'md',
            margin: 'sm',
          },
          ...(siteNames.length > 1 ? [{
            type: 'text' as const,
            text: `計${siteNames.length}現場`,
            size: 'sm' as const,
            color: '#888888',
            margin: 'lg' as const,
          }] : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '確認しました',
              data: `action=confirm_multi&assignment_worker_ids=${assignmentWorkerIds.join(',')}`,
            },
          },
        ],
      },
    },
  }
}

// 配置通知用Flex Message（単一現場・詳細版）
export function createAssignmentNotification(
  date: string,
  assignment: AssignmentInfo
) {
  return {
    type: 'flex' as const,
    altText: `【配置連絡】${date} ${assignment.siteName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '配置連絡',
            weight: 'bold',
            color: '#1DB446',
            size: 'sm',
          },
          {
            type: 'text',
            text: date,
            weight: 'bold',
            size: 'xl',
            margin: 'md',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: assignment.siteName,
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '発注元',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: assignment.clientCompany,
                    wrap: true,
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '契約',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: assignment.contractType,
                    wrap: true,
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '勤務',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: assignment.shiftType,
                    wrap: true,
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
            ],
          },
          ...(assignment.memo
            ? [
                {
                  type: 'text' as const,
                  text: assignment.memo,
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  margin: 'lg',
                },
              ]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '確認しました',
              data: `action=confirm&assignment_worker_id=${assignment.assignmentWorkerId}`,
            },
          },
        ],
      },
    },
  }
}

// 配置追加通知用Flex Message
export function createAssignmentAddedNotification(
  date: string,
  siteName: string,
  notificationId: number
) {
  return {
    type: 'flex' as const,
    altText: `【配置変更】${date} ${siteName}に追加されました`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1DB446',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: '配置変更',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'sm',
          },
          {
            type: 'text',
            text: date,
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            margin: 'md',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ 配置に追加されました',
            weight: 'bold',
            color: '#1DB446',
            size: 'md',
          },
          {
            type: 'text',
            text: siteName,
            weight: 'bold',
            size: 'lg',
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '確認しました',
              data: `action=confirm_change&notification_id=${notificationId}`,
            },
          },
        ],
      },
    },
  }
}

// 配置解除通知用Flex Message
export function createAssignmentRemovedNotification(
  date: string,
  siteName: string,
  notificationId: number
) {
  return {
    type: 'flex' as const,
    altText: `【配置変更】${date} ${siteName}から外れました`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FF6B6B',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: '配置変更',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'sm',
          },
          {
            type: 'text',
            text: date,
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            margin: 'md',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '❌ 配置から外れました',
            weight: 'bold',
            color: '#FF6B6B',
            size: 'md',
          },
          {
            type: 'text',
            text: siteName,
            weight: 'bold',
            size: 'lg',
            margin: 'md',
          },
          {
            type: 'text',
            text: '予定が変更になりました。ご確認ください。',
            wrap: true,
            color: '#666666',
            size: 'sm',
            margin: 'lg',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#FF6B6B',
            action: {
              type: 'postback',
              label: '確認しました',
              data: `action=confirm_change&notification_id=${notificationId}`,
            },
          },
        ],
      },
    },
  }
}

// 配置変更（現場移動）通知用Flex Message
export function createAssignmentMovedNotification(
  date: string,
  fromSiteName: string,
  toSiteName: string,
  notificationId: number
) {
  return {
    type: 'flex' as const,
    altText: `【配置変更】${date} ${fromSiteName}→${toSiteName}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#4A90D9',
        paddingAll: 'lg',
        contents: [
          {
            type: 'text',
            text: '配置変更',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'sm',
          },
          {
            type: 'text',
            text: date,
            weight: 'bold',
            size: 'xl',
            color: '#FFFFFF',
            margin: 'md',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🔄 現場が変更になりました',
            weight: 'bold',
            color: '#4A90D9',
            size: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '変更前',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: fromSiteName,
                    wrap: true,
                    size: 'sm',
                    flex: 5,
                    decoration: 'line-through',
                    color: '#999999',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '変更後',
                    color: '#aaaaaa',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: toSiteName,
                    wrap: true,
                    size: 'sm',
                    flex: 5,
                    weight: 'bold',
                    color: '#4A90D9',
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#4A90D9',
            action: {
              type: 'postback',
              label: '確認しました',
              data: `action=confirm_change&notification_id=${notificationId}`,
            },
          },
        ],
      },
    },
  }
}

// 日報リマインド用Flex Message
export function createNippoReminder(siteName: string, reportUrl: string) {
  return {
    type: 'flex' as const,
    altText: '【日報リマインド】日報を入力してください',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '日報リマインド',
            weight: 'bold',
            color: '#FF6B6B',
            size: 'sm',
          },
          {
            type: 'text',
            text: siteName,
            weight: 'bold',
            size: 'lg',
            margin: 'md',
          },
          {
            type: 'text',
            text: '本日の日報がまだ提出されていません。',
            wrap: true,
            color: '#666666',
            size: 'sm',
            margin: 'lg',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '日報を入力する',
              uri: reportUrl,
            },
          },
        ],
      },
    },
  }
}
