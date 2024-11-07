import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Papa from 'papaparse'
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { scaleLinear } from "d3-scale"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { ElectionData } from "@/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

type UserPick = {
  email: string;
  displayName: string;
  selections: Record<string, "red" | "blue">;
  updatedAt: string;
  potentialWinnings: number;
  numPicks: number;
}

function Home() {
  const { user, signInWithGoogle } = useAuth()
  const [userPicks, setUserPicks] = useState<UserPick[]>([])
  const [electionData, setElectionData] = useState<ElectionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [results, setResults] = useState<Record<string, "red" | "blue">>({})
  const [hasResults, setHasResults] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const blueScale = scaleLinear<string>()
    .domain([50, 100])
    .range(["#cce5ff", "#0039a6"])
    .clamp(true)

  const redScale = scaleLinear<string>()
    .domain([50, 100])
    .range(["#ffcccb", "#cc0000"])
    .clamp(true)

  const getStateColor = (stateName: string) => {
    const stateData = electionData.find(d => d.state_full === stateName)
    if (!stateData) return "#e2e8f0"
    
    const incProb = stateData.winstate_inc
    const chalProb = stateData.winstate_chal

    if (incProb > chalProb) {
      return blueScale(incProb)
    } else {
      return redScale(chalProb)
    }
  }

  // Load election data
  useEffect(() => {
    setIsLoading(true) // Set loading when starting to fetch
    fetch('/projections.csv')
      .then(response => response.text())
      .then(csv => {
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
      })
      .catch(error => {
        console.error('Error loading CSV:', error)
      })
  }, [])

  // Calculate payout for a probability
  const calculatePayout = (probability: number): number => {
    return Math.round(100 / (probability / 100))
  }

  // Load picks
  useEffect(() => {
    if (!electionData.length || !user) return;

    const loadAllPicks = async () => {
      try {
        const picksSnapshot = await getDocs(collection(db, 'picks'))
        let picksData = picksSnapshot.docs.map(doc => {
          const data = doc.data()
          const selections = data.selections || {}
          
          return {
            email: data.email,
            displayName: data.displayName || data.email?.split('@')[0] || 'Anonymous',
            selections,
            updatedAt: data.updatedAt,
            potentialWinnings: Object.entries(selections).reduce((total, [stateName, selection]) => {
              const stateData = electionData.find(d => d.state_full === stateName)
              if (!stateData) return total
              const probability = selection === "red" ? 
                stateData.winstate_chal : 
                stateData.winstate_inc
              return total + (calculatePayout(probability) - 100)
            }, 0),
            numPicks: Object.keys(selections).length
          }
        })

        // Sort by actual returns if results are available, otherwise by potential winnings
        picksData = picksData.sort((a, b) => {
          if (hasResults) {
            // Only count positive returns for sorting
            const aReturns = Math.max(0, calculateActualReturns(a.selections))
            const bReturns = Math.max(0, calculateActualReturns(b.selections))
            return bReturns - aReturns
          }
          return b.potentialWinnings - a.potentialWinnings
        })
        
        setUserPicks(picksData)
      } catch (error) {
        console.error('Error loading picks:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadAllPicks()
  }, [electionData, user, hasResults])

  // Add effect to load results
  useEffect(() => {
    const loadResults = async () => {
      const docRef = doc(db, 'results', 'election2024')
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setResults(docSnap.data().results)
        setHasResults(true)
      }
    }
    loadResults()
  }, [])

  // Function to calculate actual returns
  const calculateActualReturns = (selections: Record<string, "red" | "blue">) => {
    return Object.entries(selections).reduce((total, [stateName, pick]) => {
      const stateData = electionData.find(d => d.state_full === stateName)
      if (!stateData || !results[stateName]) return total

      const won = (pick === results[stateName])
      if (won) {
        const probability = pick === "red" ? 
          stateData.winstate_chal : 
          stateData.winstate_inc
        return total + calculatePayout(probability)
      }
      return total // Don't subtract for losses
    }, 0)
  }

  // Add new useEffect for fetching NYT data
  useEffect(() => {
    const fetchNYTResults = async () => {
      try {
        const response = await fetch('https://static01.nyt.com/elections-assets/pages/data/2024-11-05/results-president.json');
        const data = await response.json();
        console.log('NYT Results:', data);
      } catch (error) {
        console.error('Error fetching NYT results:', error);
      }
    };

    fetchNYTResults();
  }, []); // Empty dependency array means this runs once on mount

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Election Prediction Game</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Put your political forecasting skills to the test. Pick winners in key states, 
            calculate your odds, and compete for the highest potential payout.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">🎯 Make Your Picks</h3>
                <p className="text-sm text-muted-foreground">
                  Choose winners in 10 states. Each pick costs $100 from your virtual $1,000 budget.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">📊 Real Probabilities</h3>
                <p className="text-sm text-muted-foreground">
                  Odds based on Nate Silver's election projections. Riskier picks pay more!
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">🏆 Compete to Win</h3>
                <p className="text-sm text-muted-foreground">
                  The player with the highest potential payout from correct predictions wins.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <div className="w-full aspect-[4/3]">
              <ComposableMap projection="geoAlbersUsa">
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const stateName = geo.properties.name
                      const stateData = electionData.find(d => d.state_full === stateName)
                      const baseColor = stateData ? getStateColor(stateName) : "#e2e8f0"
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: {
                              fill: baseColor,
                              stroke: "#FFFFFF",
                              strokeWidth: 0.5,
                              outline: "none",
                            },
                            hover: {
                              fill: baseColor,
                              stroke: "#FFFFFF",
                              strokeWidth: 0.5,
                              outline: "none",
                            },
                          }}
                        />
                      )
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end justify-center pb-8">
              <Card className="w-[350px] bg-background/95 backdrop-blur">
                <CardHeader>
                  <CardTitle>Ready to Play?</CardTitle>
                  <CardDescription>Sign in to start making your predictions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={signInWithGoogle}
                    className="w-full"
                  >
                    Sign in with Google
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
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
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          {hasResults ? 
            "Final results and actual returns" :
            "Current standings based on potential winnings"
          }
        </p>
      </div>

      {hasResults && (
        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Election Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full aspect-[4/3]">
                <ComposableMap projection="geoAlbersUsa">
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const stateName = geo.properties.name
                        const result = results[stateName]
                        const baseColor = result === "blue" ? "#0039a6" : 
                                        result === "red" ? "#cc0000" : 
                                        "#e2e8f0"
                        
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            style={{
                              default: {
                                fill: baseColor,
                                stroke: "#FFFFFF",
                                strokeWidth: 0.5,
                                outline: "none",
                              },
                              hover: {
                                fill: baseColor,
                                stroke: "#FFFFFF",
                                strokeWidth: 0.5,
                                outline: "none",
                              },
                            }}
                          />
                        )
                      })
                    }
                  </Geographies>
                </ComposableMap>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-background">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="font-semibold">Player</TableHead>
                    <TableHead className="text-right font-semibold w-[150px]">Wins</TableHead>
                    <TableHead className="text-right font-semibold w-[150px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userPicks.map((user, index) => (
                    <>
                      <TableRow 
                        key={user.email}
                        className="group cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => setExpandedUser(
                          expandedUser === user.email ? null : user.email
                        )}
                      >
                        <TableCell className="py-3">
                          {expandedUser === user.email ? 
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground" /> : 
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground" />
                          }
                        </TableCell>
                        <TableCell className="font-medium py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span className="font-semibold">{user.displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className="font-mono text-lg text-green-600">
                            ${hasResults ? 
                              calculateActualReturns(user.selections) :
                              user.potentialWinnings
                            }
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span className={`font-mono text-lg ${
                            hasResults ? 
                              calculateActualReturns(user.selections) - (user.numPicks * 100) > 0 
                                ? "text-green-600" 
                                : "text-red-600" :
                              "text-green-600"
                          }`}>
                            ${hasResults ? 
                              calculateActualReturns(user.selections) - (user.numPicks * 100) :
                              user.potentialWinnings - (user.numPicks * 100)
                            }
                          </span>
                        </TableCell>
                      </TableRow>
                      {expandedUser === user.email && (
                        <TableRow>
                          <TableCell colSpan={3} className="bg-muted/50 border-t border-b">
                            <div className="space-y-4 p-4">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(user.selections).map(([state, pick]) => {
                                  const isCorrect = hasResults && results[state] === pick
                                  return (
                                    <div
                                      key={state}
                                      className={`px-2 py-1 rounded-full text-sm transition-all
                                        ${pick === 'red' 
                                          ? 'bg-red-100 text-red-700 border border-red-200'
                                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                                        } ${
                                          hasResults ? (
                                            isCorrect 
                                              ? 'ring-2 ring-green-500 ring-offset-2'
                                              : 'opacity-50'
                                          ) : 'hover:scale-105'
                                        }`}
                                    >
                                      <span className="font-medium">{state}</span>
                                      <span className="ml-1 opacity-75">({pick === 'red' ? 'R' : 'D'})</span>
                                      {hasResults && (
                                        <span className="ml-1">
                                          {isCorrect ? '✓' : '✗'}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="w-full aspect-[4/3]">
                                <ComposableMap projection="geoAlbersUsa">
                                  <Geographies geography={geoUrl}>
                                    {({ geographies }) =>
                                      geographies.map((geo) => {
                                        const stateName = geo.properties.name
                                        const pick = user.selections[stateName]
                                        const baseColor = pick === "blue" ? "#0039a6" : 
                                                        pick === "red" ? "#cc0000" : 
                                                        "#e2e8f0"
                                        const isCorrect = hasResults && results[stateName] === pick
                                        
                                        return (
                                          <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            style={{
                                              default: {
                                                fill: baseColor,
                                                stroke: "#FFFFFF",
                                                strokeWidth: 0.5,
                                                outline: "none",
                                                opacity: hasResults && pick && !isCorrect ? 0.5 : 1
                                              },
                                              hover: {
                                                fill: baseColor,
                                                stroke: "#FFFFFF",
                                                strokeWidth: 0.5,
                                                outline: "none",
                                                opacity: hasResults && pick && !isCorrect ? 0.5 : 1
                                              },
                                            }}
                                          />
                                        )
                                      })
                                    }
                                  </Geographies>
                                </ComposableMap>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
      
      {userPicks.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No picks have been made yet. Be the first to make your predictions!
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Home 