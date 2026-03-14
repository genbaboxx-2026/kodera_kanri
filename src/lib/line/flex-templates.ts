// LINE Flex Message テンプレート

interface AssignmentInfo {
  siteName: string
  clientCompany: string
  contractType: '常用' | '請負'
  shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
  memo?: string
  assignmentWorkerId: number
}

// 配置通知用Flex Message
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
