import { NextRequest } from 'next/server'
import type { ScrapedCreator } from '../scrape/route'

export const maxDuration = 60

export interface BusinessProfile {
  brandName: string
  industry: string
  product: string
  website: string
  campaignType: string
  budget: string
  duration: string
  minAge: number
  maxAge: number
  targetGender: string
  targetLocation: string
  nicheKeywords: string[]
  preferredPlatforms: string[]
  contentTone: string
  minFollowers: number
}

export interface MatchBreakdown {
  nicheMatch: number
  reachScore: number
  engagementScore: number
  platformMatch: number
  budgetFit: number
}

export interface RecommendedCreator extends ScrapedCreator {
  matchScore: number
  matchBreakdown: MatchBreakdown
  explanation: string
  whyGoodFit: string[]
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function scoreCreator(creator: ScrapedCreator, profile: BusinessProfile): RecommendedCreator {
  const nicheKeywordsLower = profile.nicheKeywords.map(k => k.toLowerCase())
  const industryWords = `${profile.industry} ${profile.product} ${profile.campaignType}`
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)

  const allTerms = [...new Set([...nicheKeywordsLower, ...industryWords])]
  const creatorText = `${creator.name} ${creator.description} ${creator.niche} ${creator.handle}`
    .toLowerCase()

  const matchedTerms = allTerms.filter(t => creatorText.includes(t))

  // 1. Niche Match (0–30)
  const nicheMatchRatio = nicheKeywordsLower.length > 0
    ? Math.min(matchedTerms.filter(t => nicheKeywordsLower.includes(t)).length / nicheKeywordsLower.length, 1)
    : 0.3
  const nicheMatch = Math.round(nicheMatchRatio * 30)

  // 2. Reach Score (0–20) — logarithmic so small and large creators both get fair scores
  const reachScore = Math.round(
    (Math.log10(Math.max(creator.subscribers, 1)) / Math.log10(10_000_001)) * 20
  )

  // 3. Engagement Score (0–25) — platform-normalized
  const benchmark = creator.platform === 'YouTube' ? 5 : 3
  const engNorm = Math.min(creator.engagementRate / benchmark, 2)
  const engagementScore = Math.round(engNorm * 12.5)

  // 4. Platform Match (0–10)
  const prefLower = profile.preferredPlatforms.map(p => p.toLowerCase())
  const platformMatch = prefLower.length === 0 || prefLower.includes(creator.platform.toLowerCase()) ? 10 : 2

  // 5. Budget / Audience Size Fit (0–15)
  const budgetRanges: Record<string, [number, number]> = {
    'under-5k':  [0,        100_000],
    '5k-20k':    [10_000,   750_000],
    '20k-100k':  [50_000, 3_000_000],
    '100k+':     [200_000, Infinity],
  }
  const [minSubs, maxSubs] = budgetRanges[profile.budget] ?? [0, Infinity]
  const budgetFit = creator.subscribers >= minSubs && creator.subscribers <= maxSubs ? 15 : 5

  const rawScore = nicheMatch + reachScore + engagementScore + platformMatch + budgetFit
  const matchScore = Math.min(Math.max(rawScore, 5), 100)

  // Generate reasons
  const reasons: string[] = []

  if (matchedTerms.length > 0) {
    const displayTerms = matchedTerms.slice(0, 3).map(t => `"${t}"`).join(', ')
    reasons.push(`Content naturally covers ${displayTerms} — directly aligned with your ${profile.industry} brand`)
  }

  if (creator.subscribers >= 1_000_000) {
    reasons.push(`Massive reach: ${formatNum(creator.subscribers)} subscribers deliver broad brand visibility`)
  } else if (creator.subscribers >= 100_000) {
    reasons.push(`Strong mid-tier audience of ${formatNum(creator.subscribers)} with high engagement potential`)
  } else {
    reasons.push(`Micro-influencer with ${formatNum(creator.subscribers)} followers — ideal for authentic niche campaigns`)
  }

  if (creator.engagementRate >= 6) {
    reasons.push(`Exceptional ${creator.engagementRate}% engagement rate — audience is highly active and loyal`)
  } else if (creator.engagementRate >= 3) {
    reasons.push(`Solid ${creator.engagementRate}% engagement shows genuine audience interaction`)
  }

  if (platformMatch === 10) {
    reasons.push(`Active on ${creator.platform} — one of your preferred campaign platforms`)
  }

  if (creator.country && profile.targetLocation) {
    const loc = profile.targetLocation.toLowerCase()
    const cntry = creator.country.toLowerCase()
    if (loc.includes(cntry) || cntry.includes(loc) || loc === 'global' || loc === 'worldwide') {
      reasons.push(`Audience geography (${creator.country}) aligns with your target location`)
    }
  }

  if (profile.contentTone && creator.description) {
    const toneMap: Record<string, string[]> = {
      educational: ['learn', 'tutorial', 'guide', 'how', 'tips', 'insights', 'analysis'],
      entertaining: ['fun', 'comedy', 'humor', 'challenge', 'game', 'entertainment'],
      inspirational: ['inspire', 'motivate', 'transform', 'journey', 'story', 'success'],
      authentic: ['real', 'honest', 'raw', 'genuine', 'personal', 'authentic', 'community'],
    }
    const toneWords = toneMap[profile.contentTone] ?? []
    if (toneWords.some(w => creatorText.includes(w))) {
      reasons.push(`Content tone aligns with your preferred "${profile.contentTone}" style`)
    }
  }

  // Build explanation
  let explanation: string
  if (matchScore >= 80) {
    explanation = `${creator.name} is an outstanding match for ${profile.brandName}. ${reasons[0] ?? ''} Their audience profile and content style are highly compatible with your ${profile.campaignType} objectives, making this a high-confidence collaboration opportunity.`
  } else if (matchScore >= 60) {
    explanation = `${creator.name} shows strong potential for ${profile.brandName}. ${reasons[0] ?? ''} This creator brings relevant reach and engagement that could deliver meaningful results for your campaign.`
  } else if (matchScore >= 40) {
    explanation = `${creator.name} has moderate alignment with ${profile.brandName}'s goals. ${reasons[0] ?? ''} Consider a test collaboration to gauge audience response before committing to a full campaign.`
  } else {
    explanation = `${creator.name} has limited direct overlap with ${profile.brandName}'s requirements but may offer unique access to niche audience segments worth exploring.`
  }

  return {
    ...creator,
    matchScore,
    matchBreakdown: { nicheMatch, reachScore, engagementScore, platformMatch, budgetFit },
    explanation,
    whyGoodFit: reasons.slice(0, 4),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { businessProfile, creators } = body as {
      businessProfile: BusinessProfile
      creators: ScrapedCreator[]
    }

    if (!businessProfile || !Array.isArray(creators)) {
      return Response.json({ error: 'Missing businessProfile or creators' }, { status: 400 })
    }

    // Removed the hard filter to guarantee 8 creators are always scored
    const filtered = creators;
    let scored: RecommendedCreator[] = []

    const grokKey = process.env.GROK_API_KEY
    if (grokKey) {
      try {
        const prompt = `You are an expert Influencer Marketing Strategist. Analyze the following creators against the brand's business profile and score them.
Business Profile: ${JSON.stringify(businessProfile)}
Creators: ${JSON.stringify(filtered.map(c => ({ id: c.id, name: c.name, niche: c.niche, desc: c.description, subscribers: c.subscribers, platform: c.platform, engagement: c.engagementRate })))}

For each creator, provide:
1. matchScore (number 0-100)
2. matchBreakdown (object with nicheMatch/30, reachScore/20, engagementScore/25, platformMatch/10, budgetFit/15)
3. whyGoodFit (array of exactly 4 strings explaining why they fit)
4. explanation (a short paragraph)

Return STRICTLY a JSON array of objects with keys: "id", "matchScore", "matchBreakdown", "whyGoodFit", "explanation". Do not include markdown \`\`\`json blocks.`

        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${grokKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [{ role: "system", content: "You are a JSON-only API. You must return only a valid JSON array of objects." }, { role: "user", content: prompt }],
            model: "grok-beta",
            temperature: 0.2
          })
        })

        if (res.ok) {
          const data = await res.json()
          let jsonStr = data.choices[0].message.content.trim()
          if (jsonStr.startsWith("\`\`\`json")) jsonStr = jsonStr.replace(/^\`\`\`json\n/, "").replace(/\n\`\`\`$/, "")
          if (jsonStr.startsWith("\`\`\`")) jsonStr = jsonStr.replace(/^\`\`\`\n/, "").replace(/\n\`\`\`$/, "")
          
          const llmResults = JSON.parse(jsonStr) as Array<{id: string, matchScore: number, matchBreakdown: MatchBreakdown, whyGoodFit: string[], explanation: string}>
          
          scored = filtered.map(c => {
            const llmData = llmResults.find(r => r.id === c.id)
            if (llmData) return { ...c, ...llmData }
            return scoreCreator(c, businessProfile)
          })
        } else {
          console.error("Grok API Error:", await res.text())
          throw new Error("Grok API failed")
        }
      } catch (err) {
        console.error("LLM scoring failed, falling back to heuristic", err)
        scored = filtered.map(c => scoreCreator(c, businessProfile))
      }
    } else {
      scored = filtered.map(c => scoreCreator(c, businessProfile))
    }

    const sorted = scored.sort((a, b) => b.matchScore - a.matchScore)

    return Response.json({ recommendations: sorted })
  } catch (err) {
    return Response.json({ error: 'Recommendation engine failed', details: String(err) }, { status: 500 })
  }
}
