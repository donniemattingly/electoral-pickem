import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Papa from 'papaparse'
import { ComposableMap, Geographies, Geography, Annotation } from "react-simple-maps"
import { scaleLinear } from "d3-scale"
import { ElectionData } from "@/types"
import { Button } from "@/components/ui/button"
import { RefreshCcw, TrendingUp, ArrowLeftRight } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

// Add state center coordinates (copy from Picks.tsx)
const stateCenters: Record<string, [number, number]> = {
  // ... copy from Picks.tsx
}

type UserPick = {
  displayName: string;
  selections: Record<string, "red" | "blue">;
  potentialWinnings: number;
}

function Simulations() {
  const [electionData, setElectionData] = useState<ElectionData[]>([])
  const [userPicks, setUserPicks] = useState<UserPick[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [outcomes, setOutcomes] = useState<Record<string, "red" | "blue" | "none">>({})
  const [simulationResults, setSimulationResults] = useState<{
    winner: string;
    winnings: Record<string, number>;
  } | null>(null)
  const [currentShift, setCurrentShift] = useState(0)

  // Load election data and user picks
  useEffect(() => {
    Promise.all([
      fetch('/projections.csv').then(r => r.text()),
      getDocs(collection(db, 'picks'))
    ]).then(([csv, picksSnapshot]) => {
      // Parse CSV
      const results = Papa.parse<ElectionData>(csv, {
        header: true,
        transform: (value: string, field: string) => {
          if (['winstate_inc', 'winstate_chal', 'evs'].includes(field)) {
            return parseFloat(value)
          }
          return value
        }
      })
      setElectionData(results.data)

      // Process picks
      const picksData = picksSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          displayName: data.displayName,
          selections: data.selections,
          potentialWinnings: 0 // Will be calculated when outcomes are set
        }
      })
      setUserPicks(picksData)
      setIsLoading(false)
    })
  }, [])

  const handleStateClick = (stateName: string) => {
    setOutcomes(prev => {
      const currentOutcome = prev[stateName] || "none"
      const newOutcome: "red" | "blue" | "none" = 
        currentOutcome === "none" ? "red" :
        currentOutcome === "red" ? "blue" : "none"
      
      const newOutcomes = { ...prev }
      if (newOutcome === "none") {
        delete newOutcomes[stateName]
      } else {
        newOutcomes[stateName] = newOutcome
      }
      
      return newOutcomes
    })
  }

  // Calculate results whenever outcomes change
  useEffect(() => {
    if (Object.keys(outcomes).length === 0) {
      setSimulationResults(null)
      return
    }

    const winnings: Record<string, number> = {}
    let maxWinnings = -Infinity
    let winner = ''

    userPicks.forEach(user => {
      let totalWinnings = 0
      Object.entries(user.selections).forEach(([state, pick]) => {
        const stateOutcome = outcomes[state]
        if (!stateOutcome) return // Skip if state outcome not set

        const stateData = electionData.find(d => d.state_full === state)
        if (!stateData) return

        const won = (pick === stateOutcome)
        if (won) {
          const probability = pick === "red" ? 
            stateData.winstate_chal : 
            stateData.winstate_inc
          totalWinnings += Math.round(100 / (probability / 100)) - 100
        }
      })

      winnings[user.displayName] = totalWinnings
      if (totalWinnings > maxWinnings) {
        maxWinnings = totalWinnings
        winner = user.displayName
      }
    })

    setSimulationResults({ winner, winnings })
  }, [outcomes, userPicks, electionData])

  const getStateColor = (stateName: string) => {
    const outcome = outcomes[stateName]
    if (outcome === "blue") return "#0039a6"
    if (outcome === "red") return "#cc0000"
    
    const stateData = electionData.find(d => d.state_full === stateName)
    if (!stateData) return "#e2e8f0"
    
    const incProb = stateData.winstate_inc
    const chalProb = stateData.winstate_chal

    return incProb > chalProb ? "#cce5ff" : "#ffcccb"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Loading data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Outcome Simulator</h1>
        <p className="text-muted-foreground">
          Click states to set outcomes and see how it affects everyone's chances
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Set State Outcomes</CardTitle>
                <CardDescription>Click states to cycle through outcomes</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const likelyOutcomes = electionData.reduce((acc, state) => {
                      const isMoreLikelyBlue = state.winstate_inc > state.winstate_chal
                      acc[state.state_full] = isMoreLikelyBlue ? "blue" : "red"
                      return acc
                    }, {} as Record<string, "red" | "blue">)
                    setOutcomes(likelyOutcomes)
                    setCurrentShift(0)  // Reset slider
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Most Likely
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setOutcomes({})
                    setCurrentShift(0)  // Reset slider
                  }}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">National Shift</div>
                    <div className="text-xs text-muted-foreground">
                      {currentShift === 0 ? "No shift applied" :
                       currentShift > 0 ? `Democratic probability increased by ${currentShift} points` :
                                        `Republican probability increased by ${Math.abs(currentShift)} points`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {currentShift > 0 ? `+${currentShift}` : currentShift}
                    </span>
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <Slider
                  value={[currentShift]}
                  min={-20}
                  max={20}
                  step={1}
                  onValueChange={([value]) => {
                    setCurrentShift(value)
                    // Set each state to its shifted probability outcome
                    const shiftedOutcomes = electionData.reduce((acc, state) => {
                      // Add/subtract absolute points from probabilities
                      const shiftedIncProb = Math.min(Math.max(state.winstate_inc + value, 0), 100)
                      const shiftedChalProb = 100 - shiftedIncProb // Ensure probabilities sum to 100
                      const isMoreLikelyBlue = shiftedIncProb > 50 // Use 50 as the threshold
                      acc[state.state_full] = isMoreLikelyBlue ? "blue" : "red"
                      return acc
                    }, {} as Record<string, "red" | "blue">)
                    setOutcomes(shiftedOutcomes)
                  }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>R+20 points</span>
                  <span>D+20 points</span>
                </div>
              </div>

              <div className="w-full aspect-[4/3]">
                <ComposableMap projection="geoAlbersUsa">
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const stateName = geo.properties.name
                        const stateData = electionData.find(d => d.state_full === stateName)
                        const outcome = outcomes[stateName]
                        const baseColor = getStateColor(stateName)
                        
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            style={{
                              default: {
                                fill: baseColor,
                                stroke: "#FFFFFF",
                                strokeWidth: outcome ? 3 : 0.5,
                                outline: "none",
                              },
                              hover: {
                                fill: baseColor,
                                stroke: "#FFFFFF",
                                strokeWidth: outcome ? 3 : 2,
                                outline: "none",
                                cursor: "pointer",
                              },
                            }}
                            onClick={() => handleStateClick(stateName)}
                          />
                        )
                      })
                    }
                  </Geographies>
                  {Object.entries(outcomes)
                    .filter(([_, outcome]) => outcome !== "none")
                    .map(([stateName, outcome]) => {
                      const coords = stateCenters[stateName]
                      if (!coords) return null
                      
                      return (
                        <Annotation
                          key={stateName}
                          subject={coords}
                          dx={0}
                          dy={0}
                          connectorProps={{}}
                        >
                          <text
                            textAnchor="middle"
                            alignmentBaseline="middle"
                            fill="white"
                            fontSize={12}
                            fontWeight="bold"
                            style={{
                              textShadow: "0 0 3px rgba(0,0,0,0.5)",
                              pointerEvents: "none"
                            }}
                          >
                            {outcome === "blue" ? "D" : "R"}
                          </text>
                        </Annotation>
                      )
                    })}
                </ComposableMap>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              {simulationResults 
                ? `Based on ${Object.keys(outcomes).length} state outcomes`
                : "Set some state outcomes to see results"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {simulationResults ? (
              <>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Winner</div>
                  <div className="text-2xl font-bold">
                    {simulationResults.winner}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">Winnings</div>
                  {Object.entries(simulationResults.winnings)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, amount]) => (
                      <div 
                        key={name}
                        className="flex justify-between items-center"
                      >
                        <span className="font-medium">
                          {name}
                          {name === simulationResults.winner && 
                            <span className="text-yellow-500 ml-1">👑</span>
                          }
                        </span>
                        <span className={amount > 0 ? "text-green-600" : ""}>
                          ${amount}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Click states on the map to simulate outcomes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Simulations 