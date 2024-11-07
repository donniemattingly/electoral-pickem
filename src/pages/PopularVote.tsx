import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type CandidateData = {
  name: string
  votes: {
    counted: number
    estimated: number
    remaining: number
  }
  party: string
}

type PopularVoteData = {
  candidates: CandidateData[]
  eevp: number
  timestamp: string
  totalVotes: number
  totalExpectedVotes: number
  resultsUpdatedAt: string
}

function PopularVote() {
  const [voteData, setVoteData] = useState<PopularVoteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date()
        const url = `https://static01.nyt.com/elections-assets/pages/data/2024-11-05/results-president.json`
        console.log('Fetching from:', url)
        
        const response = await fetch(url)
        const data = await response.json()
        
        // Get all races
        const races = data.races
        if (!races?.length) throw new Error("No race data found")

        console.log('Raw races data:', races)

        // Get the official timestamp from metadata
        const resultsUpdatedAt = data.resultsMeta?.resultsUpdatedAt || new Date().toISOString()

        // Sum up votes across all races
        const totalsByCandidate: Record<string, {
          counted: number,
          estimated: number,
          remaining: number
        }> = {}

        // Initialize totals for each candidate using metadata from first race
        const candidateMetadata = races[0].candidate_metadata
        Object.keys(candidateMetadata).forEach(candidateId => {
          totalsByCandidate[candidateId] = {
            counted: 0,
            estimated: 0,
            remaining: 0
          }
        })

        // Sum up votes from each race (state)
        races.forEach(race => {
          if (!race.reporting_units?.[0]?.candidates) return
          
          race.reporting_units[0].candidates.forEach(candidate => {
            if (!totalsByCandidate[candidate.nyt_id]) return
            
            totalsByCandidate[candidate.nyt_id].counted += candidate.votes?.total || 0
            if (candidate.nyt_model_estimates) {
              totalsByCandidate[candidate.nyt_id].estimated += candidate.nyt_model_estimates.votes_estimated || candidate.votes?.total || 0
              totalsByCandidate[candidate.nyt_id].remaining += candidate.nyt_model_estimates.votes_remaining || 0
            }
          })
        })

        console.log('Final totals by candidate:', totalsByCandidate)

        // Get only the top two candidates (usually Dem and Rep)
        const candidates = Object.entries(totalsByCandidate)
          .map(([nyt_id, votes]) => ({
            name: `${candidateMetadata[nyt_id].first_name} ${candidateMetadata[nyt_id].last_name}`,
            votes,
            party: candidateMetadata[nyt_id].party.abbreviation
          }))
          .sort((a, b) => b.votes.counted - a.votes.counted)
          .slice(0, 2) // Only keep top 2

        console.log('Processed candidate data:', candidates)

        // Get the first reporting unit for overall stats (usually national)
        const nationalRace = races.find(race => race.reporting_units?.[0]?.level === "national")
        const topUnit = nationalRace?.reporting_units[0] || races[0].reporting_units[0]

        setVoteData({
          candidates,
          eevp: topUnit.eevp || 0,
          timestamp: resultsUpdatedAt,
          totalVotes: topUnit.total_votes || 0,
          totalExpectedVotes: topUnit.total_expected_vote || 0
        })
      } catch (err) {
        console.error('Error fetching NYT results:', err)
        setError("Unable to load popular vote data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    // Refresh every minute
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num)

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">National Popular Vote</h1>
        <p className="text-muted-foreground">Live vote totals and estimates</p>
      </div>

      {isLoading || !voteData ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {voteData.candidates.map(candidate => (
            <Card key={candidate.name} className={`border-2 ${
              candidate.party === "Dem." ? "border-blue-100" : "border-red-100"
            }`}>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <img 
                      src={candidate.party === "Dem." ? 
                        "https://static01.nyt.com/elections-assets/2024/headshots/AK-G-P-2024-11-05-harris-k-44992.png" :
                        "https://static01.nyt.com/elections-assets/2024/headshots/NV-R-P-president-2024-02-08-trump-d-18284.png"
                      }
                      alt={candidate.name}
                      className="w-32 h-32 rounded-full border-4 border-background shadow-lg"
                    />
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${
                        candidate.party === "Dem." ? "text-blue-600" : "text-red-600"
                      }`}>
                        {candidate.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {candidate.party === "Dem." ? "Democratic" : "Republican"} Candidate
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">
                          Counted Votes
                        </div>
                        <div className="text-2xl font-bold font-mono">
                          {formatNumber(candidate.votes.counted)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">
                          Estimated Total
                        </div>
                        <div className="text-2xl font-bold font-mono">
                          {formatNumber(candidate.votes.estimated)}
                        </div>
                      </div>
                    </div>

                    {candidate.votes.remaining > 0 && (
                      <div className="space-y-1 pt-2 border-t">
                        <div className="text-sm font-medium text-muted-foreground">
                          Estimated Remaining
                        </div>
                        <div className="text-xl font-bold font-mono text-muted-foreground">
                          {formatNumber(candidate.votes.remaining)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-sm text-center text-muted-foreground">
        Last updated: {voteData?.timestamp ? new Date(voteData.timestamp).toLocaleString() : '...'}
      </div>
    </div>
  )
}

export default PopularVote