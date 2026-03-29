import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const TOKENS_FILE = '.data/youtube-tokens.json'

export interface YoutubeTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string // ISO
  channelId?: string
  channelTitle?: string
}

function getTokensPath(): string {
  return join(process.cwd(), TOKENS_FILE)
}

export async function getYoutubeTokens(): Promise<YoutubeTokens | null> {
  try {
    const path = getTokensPath()
    const raw = await readFile(path, 'utf-8')
    const data = JSON.parse(raw) as YoutubeTokens
    if (!data.accessToken || !data.refreshToken || !data.expiresAt) return null
    return data
  } catch {
    return null
  }
}

export async function setYoutubeTokens(tokens: YoutubeTokens): Promise<void> {
  const path = getTokensPath()
  const dir = join(process.cwd(), '.data')
  await mkdir(dir, { recursive: true })
  await writeFile(path, JSON.stringify(tokens, null, 0), 'utf-8')
}

export async function clearYoutubeTokens(): Promise<void> {
  try {
    const path = getTokensPath()
    await writeFile(path, '{}', 'utf-8')
  } catch {
    // ignore
  }
}
