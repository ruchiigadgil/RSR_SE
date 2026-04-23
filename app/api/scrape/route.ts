import { NextRequest } from 'next/server'

export interface ScrapedCreator {
  id: string
  name: string
  handle: string
  platform: 'YouTube' | 'Instagram'
  profileUrl: string
  avatarUrl: string
  subscribers: number
  viewCount: number
  engagementRate: number
  totalLikes: number
  niche: string
  description: string
  country: string
}

function readEnv(name: string): string {
  const raw = process.env[name]
  if (!raw) return ''
  return raw.trim().replace(/^['\"]|['\"]$/g, '')
}

async function fetchYouTubeCreators(keywords: string[], maxResults: number): Promise<ScrapedCreator[]> {
  const apiKey = readEnv('YOUTUBE_API_KEY')
  if (!apiKey) return []

  const query = keywords.join(' ')

  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${maxResults}&relevanceLanguage=en&key=${apiKey}`,
    { signal: AbortSignal.timeout(15000) }
  )
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()

  const channelIds: string[] = (searchData.items ?? [])
    .map((item: { id?: { channelId?: string } }) => item.id?.channelId)
    .filter(Boolean)
  if (!channelIds.length) return []

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelIds.join(',')}&key=${apiKey}`,
    { signal: AbortSignal.timeout(15000) }
  )
  if (!statsRes.ok) return []
  const statsData = await statsRes.json()

  return (statsData.items ?? []).map((channel: {
    id: string
    statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string }
    snippet?: { title?: string; customUrl?: string; description?: string; country?: string; thumbnails?: { high?: { url: string }; default?: { url: string } } }
  }) => {
    const stats = channel.statistics ?? {}
    const snippet = channel.snippet ?? {}
    const subscribers = parseInt(stats.subscriberCount ?? '0', 10)
    const viewCount = parseInt(stats.viewCount ?? '0', 10)
    const videoCount = Math.max(parseInt(stats.videoCount ?? '1', 10), 1)
    const avgViews = viewCount / videoCount
    const engagementRate = subscribers > 0
      ? parseFloat(((avgViews / subscribers) * 100).toFixed(2))
      : 0

    return {
      id: channel.id,
      name: snippet.title ?? 'Unknown',
      handle: snippet.customUrl
        ? `@${snippet.customUrl.replace(/^@/, '')}`
        : `@${channel.id.slice(0, 12)}`,
      platform: 'YouTube' as const,
      profileUrl: `https://www.youtube.com/channel/${channel.id}`,
      avatarUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? '',
      subscribers,
      viewCount,
      engagementRate,
      totalLikes: 0,
      niche: keywords.join(', '),
      description: (snippet.description ?? '').slice(0, 200),
      country: snippet.country ?? '',
    }
  })
}

async function fetchInstagramCreators(keywords: string[], maxResults: number): Promise<ScrapedCreator[]> {
  const apifyToken = readEnv('APIFY_TOKEN')
  if (!apifyToken) return []

  try {
    // Step 1: Find relevant usernames via hashtag posts
    const hashtagRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=45`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hashtags: keywords.slice(0, 2),
          resultsLimit: (maxResults + 3) * 4,
          proxy: { useApifyProxy: true },
        }),
        signal: AbortSignal.timeout(55000),
      }
    )
    if (!hashtagRes.ok) return []

    const posts: Array<{
      ownerUsername?: string
      ownerId?: string
      likesCount?: number
      caption?: string
    }> = await hashtagRes.json()

    const seen = new Set<string>()
    const usernames: string[] = []
    for (const post of posts) {
      const u = post.ownerUsername?.trim()
      if (!u || seen.has(u)) continue
      seen.add(u)
      usernames.push(u)
      if (usernames.length >= maxResults + 2) break
    }
    if (usernames.length === 0) return []

    // Step 2: Get full profile data (followers, bio, profile picture) for each username
    const profileRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=60`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames }),
        signal: AbortSignal.timeout(75000),
      }
    )
    if (!profileRes.ok) return []

    const profiles: Array<{
      username?: string
      id?: string
      fullName?: string
      biography?: string
      followersCount?: number
      followingCount?: number
      postsCount?: number
      profilePicUrl?: string
      profilePicUrlHD?: string
      isVerified?: boolean
      latestPosts?: Array<{ likesCount?: number }>
    }> = await profileRes.json()

    const creators: ScrapedCreator[] = []
    for (const p of profiles) {
      const username = p.username ?? ''
      if (!username) continue

      // Estimate engagement from latest posts if available
      let avgLikes = 0
      if (p.latestPosts && p.latestPosts.length > 0) {
        avgLikes = Math.round(
          p.latestPosts.reduce((s, post) => s + (post.likesCount ?? 0), 0) / p.latestPosts.length
        )
      }
      const followers = p.followersCount ?? 0
      const engagementRate = followers > 0 && avgLikes > 0
        ? parseFloat(((avgLikes / followers) * 100).toFixed(2))
        : 0

      creators.push({
        id: p.id ?? username,
        name: p.fullName ?? username,
        handle: `@${username}`,
        platform: 'Instagram',
        profileUrl: `https://www.instagram.com/${username}`,
        avatarUrl: p.profilePicUrlHD ?? p.profilePicUrl ?? '',
        subscribers: followers,
        viewCount: 0,
        engagementRate,
        totalLikes: avgLikes,
        niche: keywords.join(', '),
        description: (p.biography ?? '').slice(0, 200),
        country: '',
      })

      if (creators.length >= maxResults) break
    }

    return creators
  } catch {
    return []
  }
}

function generateMockCreators(keywords: string[]): ScrapedCreator[] {
  const niche = keywords.join(', ')
  const seed = keywords[0]?.toLowerCase() ?? 'lifestyle'

  const pool: ScrapedCreator[] = [
    {
      id: 'mock_yt_1', name: 'Maya Thompson', handle: '@mayacreates',
      platform: 'YouTube', profileUrl: 'https://youtube.com/@mayacreates',
      avatarUrl: '', subscribers: 892000, viewCount: 28000000,
      engagementRate: 4.8, totalLikes: 0,
      niche, description: `Passionate creator covering ${niche}. Sharing authentic stories and reviews.`, country: 'US',
    },
    {
      id: 'mock_yt_2', name: 'Raj Krishnan', handle: '@rajinsights',
      platform: 'YouTube', profileUrl: 'https://youtube.com/@rajinsights',
      avatarUrl: '', subscribers: 1450000, viewCount: 62000000,
      engagementRate: 3.2, totalLikes: 0,
      niche, description: `Deep dives into ${niche} topics with data-backed analysis.`, country: 'IN',
    },
    {
      id: 'mock_yt_3', name: 'Sofia Martinez', handle: '@sofiacreator',
      platform: 'YouTube', profileUrl: 'https://youtube.com/@sofiacreator',
      avatarUrl: '', subscribers: 2100000, viewCount: 95000000,
      engagementRate: 6.1, totalLikes: 0,
      niche, description: `Award-winning creator in the ${niche} space. Trusted by millions.`, country: 'MX',
    },
    {
      id: 'mock_yt_4', name: 'James Park', handle: '@jamesparkcreates',
      platform: 'YouTube', profileUrl: 'https://youtube.com/@jamesparkcreates',
      avatarUrl: '', subscribers: 340000, viewCount: 9500000,
      engagementRate: 7.8, totalLikes: 0,
      niche, description: `Micro-niche expert focused on ${niche}. Highly engaged community.`, country: 'KR',
    },
    {
      id: 'mock_yt_5', name: 'Priya Nair', handle: '@priyanairofficial',
      platform: 'YouTube', profileUrl: 'https://youtube.com/@priyanairofficial',
      avatarUrl: '', subscribers: 560000, viewCount: 18000000,
      engagementRate: 5.4, totalLikes: 0,
      niche, description: `Authentic storyteller in the ${niche} community. 5+ years experience.`, country: 'IN',
    },
    {
      id: 'mock_ig_1', name: 'Arjun Mehta', handle: '@arjunmehta_',
      platform: 'Instagram', profileUrl: 'https://instagram.com/arjunmehta_',
      avatarUrl: '', subscribers: 285000, viewCount: 0,
      engagementRate: 8.2, totalLikes: 142000,
      niche, description: `${niche} enthusiast. Brand collaborations: 40+.`, country: 'IN',
    },
    {
      id: 'mock_ig_2', name: 'Elena Rossi', handle: '@elena.creates',
      platform: 'Instagram', profileUrl: 'https://instagram.com/elena.creates',
      avatarUrl: '', subscribers: 720000, viewCount: 0,
      engagementRate: 4.1, totalLikes: 380000,
      niche, description: `Lifestyle & ${niche} content. Based in Milan, global reach.`, country: 'IT',
    },
    {
      id: 'mock_ig_3', name: 'Kenji Tanaka', handle: '@kenji.digital',
      platform: 'Instagram', profileUrl: 'https://instagram.com/kenji.digital',
      avatarUrl: '', subscribers: 1350000, viewCount: 0,
      engagementRate: 3.7, totalLikes: 680000,
      niche: `${seed} ${niche}`,
      description: `Top ${niche} creator in APAC region. Official brand ambassador for 10+ brands.`, country: 'JP',
    },
  ]

  return pool
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      keywords = ['lifestyle'],
      platforms = ['youtube'],
      maxResults = 8,
      allowDemoFallback = false,
    } = body as { keywords: string[]; platforms: string[]; maxResults: number }

    const platformsLower = platforms.map((p: string) => p.toLowerCase())
    const runFetch = async (kw: string[], limit: number) => {
      const jobs: Promise<ScrapedCreator[]>[] = []
      if (platformsLower.includes('youtube')) {
        jobs.push(fetchYouTubeCreators(kw, limit))
      }
      if (platformsLower.includes('instagram')) {
        jobs.push(fetchInstagramCreators(kw, Math.min(limit, 5)))
      }

      const settled = await Promise.allSettled(jobs)
      const out: ScrapedCreator[] = []
      for (const r of settled) {
        if (r.status === 'fulfilled') out.push(...r.value)
      }
      return out
    }

    // Live first: initial query, then one broader retry before any fallback.
    let creators = await runFetch(keywords, maxResults)
    if (creators.length === 0) {
      const retryKeywords = keywords.slice(0, 1)
      creators = await runFetch(retryKeywords.length ? retryKeywords : keywords, maxResults + 2)
    }

    if (creators.length > 0) {
      return Response.json({ creators, source: 'live' })
    }

    const demoEnabled = allowDemoFallback || readEnv('ALLOW_DEMO_FALLBACK') === 'true'
    if (demoEnabled) {
      const mocks = generateMockCreators(keywords)
      const filtered = mocks.filter(m =>
        platformsLower.length === 0 ||
        platformsLower.includes(m.platform.toLowerCase())
      )
      return Response.json({ creators: filtered, source: 'demo', warning: 'Live providers returned no creators' })
    }

    return Response.json({ creators: [], source: 'live-empty', warning: 'Live providers returned no creators' })
  } catch (err) {
    return Response.json({ error: 'Scraping failed', details: String(err) }, { status: 500 })
  }
}
