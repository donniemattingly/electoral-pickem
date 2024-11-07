import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ComposableMap, Geographies, Geography, Annotation } from "react-simple-maps"
import { scaleLinear } from "d3-scale"
import Papa from 'papaparse'
import { useEffect, useState } from "react"
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { SaveIcon } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { ElectionData } from "@/types"

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

// Add state center coordinates (reuse from Picks.tsx)
const stateCenters: Record<string, [number, number]> = {
  // ... (copy from Picks.tsx)
}

function Admin() {
  const [electionData, setElectionData] = useState<ElectionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [results, setResults] = useState<Record<string, "red" | "blue" | "none">>({})
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Load election data
  useEffect(() => {
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
        setIsLoading(false)
      })
  }, [])

  // Load existing results
  useEffect(() => {
    const loadResults = async () => {
      const docRef = doc(db, 'results', 'election2024')
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setResults(docSnap.data().results)
      }
    }
    loadResults()
  }, [])

  const handleStateClick = (stateName: string) => {
    setResults(prev => {
      const currentResult = prev[stateName] || "none"
      const newResult: "red" | "blue" | "none" = 
        currentResult === "none" ? "red" :
        currentResult === "red" ? "blue" : "none"
      
      const newResults = { ...prev }
      if (newResult === "none") {
        delete newResults[stateName]
      } else {
        newResults[stateName] = newResult
      }
      return newResults
    })
  }

  const saveResults = async () => {
    setIsSaving(true)
    try {
      await setDoc(doc(db, 'results', 'election2024'), {
        results,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email
      })
      
      toast({
        title: "Results saved",
        description: "Election results have been updated successfully.",
        duration: 2000,
      })
    } catch (error) {
      console.error('Error saving results:', error)
      toast({
        title: "Error saving results",
        description: "There was a problem saving the results. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!user?.email?.endsWith('donniewmattingly@gmail.com')) {  // Replace with your admin domain
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Access denied</div>
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
    <div className="space-y-4 sm:space-y-8">
      <Card className="sm:p-2">
        <CardHeader className="px-3 py-4 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg sm:text-xl">Record Election Results</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Click states to record actual winners
              </CardDescription>
            </div>
            <Button 
              onClick={saveResults} 
              size="sm" 
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Save Results
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="w-full aspect-[4/3] relative">
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
                            strokeWidth: result ? 3 : 0.5,
                            outline: "none",
                          },
                          hover: {
                            fill: baseColor,
                            stroke: "#FFFFFF",
                            strokeWidth: result ? 3 : 2,
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
              {Object.entries(results)
                .filter(([_, result]) => result !== "none")
                .map(([stateName, result]) => {
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
                        {result === "blue" ? "D" : "R"}
                      </text>
                    </Annotation>
                  )
                })}
            </ComposableMap>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Admin 