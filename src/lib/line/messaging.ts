// LINE Messaging API クライアント

const LINE_API_BASE = 'https://api.line.me/v2/bot'

interface LineMessage {
  type: 'text' | 'flex'
  text?: string
  altText?: string
  contents?: Record<string, unknown>
}

export async function sendPushMessage(
  userId: string,
  messages: LineMessage[]
): Promise<void> {
  const response = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LINE API error: ${error}`)
  }
}

export async function sendMulticast(
  userIds: string[],
  messages: LineMessage[]
): Promise<void> {
  if (userIds.length === 0) return

  const response = await fetch(`${LINE_API_BASE}/message/multicast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userIds,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LINE API error: ${error}`)
  }
}

export async function replyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  const response = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LINE API error: ${error}`)
  }
}

export async function getProfile(userId: string): Promise<{
  displayName: string
  userId: string
  pictureUrl?: string
  statusMessage?: string
}> {
  const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LINE API error: ${error}`)
  }

  return response.json()
}
