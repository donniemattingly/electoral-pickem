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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { ElectionData } from "@/types"

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

// Add state center coordinates
const stateCenters: Record<string, [number, number]> = {
    "Alabama": [-86.7509, 32.8067],
    "Alaska": [-151.6051, 63.3355],
    "Arizona": [-111.6602, 34.2744],
    "Arkansas": [-92.4426, 34.8938],
    "California": [-119.4696, 36.7783],
    "Colorado": [-105.5478, 39.0646],
    "Connecticut": [-72.7273, 41.6219],
    "Delaware": [-75.5277, 39.1582],
    "Florida": [-82.4497, 28.6305],
    "Georgia": [-83.4428, 32.6415],
    "Hawaii": [-157.5311, 21.0945],
    "Idaho": [-114.6130, 44.2394],
    "Illinois": [-89.1965, 40.0417],
    "Indiana": [-86.2816, 39.8942],
    "Iowa": [-93.5000, 42.0751],
    "Kansas": [-98.3804, 38.4937],
    "Kentucky": [-84.2700, 37.8393],
    "Louisiana": [-92.0574, 30.9843],
    "Maine": [-69.2428, 45.3695],
    "Maryland": [-76.6413, 39.0458],
    "Massachusetts": [-71.5314, 42.2373],
    "Michigan": [-84.5603, 44.3148],
    "Minnesota": [-93.3649, 46.2807],
    "Mississippi": [-89.3985, 32.7364],
    "Missouri": [-92.4580, 38.3566],
    "Montana": [-109.6333, 46.8797],
    "Nebraska": [-99.7951, 41.4925],
    "Nevada": [-117.0554, 38.8026],
    "New Hampshire": [-71.5724, 43.1939],
    "New Jersey": [-74.4057, 40.0583],
    "New Mexico": [-106.1126, 34.4071],
    "New York": [-74.2179, 43.2994],
    "North Carolina": [-79.0193, 35.5557],
    "North Dakota": [-100.4659, 47.5515],
    "Ohio": [-82.7937, 40.4173],
    "Oklahoma": [-97.5164, 35.5376],
    "Oregon": [-120.5542, 43.9336],
    "Pennsylvania": [-77.1945, 41.2033],
    "Rhode Island": [-71.5101, 41.6762],
    "South Carolina": [-80.9066, 33.8361],
    "South Dakota": [-100.2263, 44.2998],
    "Tennessee": [-86.3505, 35.8580],
    "Texas": [-99.3312, 31.9686],
    "Utah": [-111.8535, 39.3210],
    "Vermont": [-72.6658, 44.0687],
    "Virginia": [-78.6569, 37.4316],
    "Washington": [-120.4472, 47.7511],
    "West Virginia": [-80.6227, 38.6409],
    "Wisconsin": [-89.6385, 44.2563],
    "Wyoming": [-107.2903, 42.7559],
    "District of Columbia": [-77.0369, 38.9072]
}

const DEADLINE = new Date('2024-11-05T15:00:00Z') // 10 AM ET = 15:00 UTC

function Picks() {
    const [electionData, setElectionData] = useState<ElectionData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selections, setSelections] = useState<Record<string, "red" | "blue" | "none">>({})
    const { user } = useAuth()
    const { toast } = useToast()
    const [isSaving, setIsSaving] = useState(false)
    const [blah, setIsLocked] = useState(false)
    const isLocked = true;

    const MAX_WAGERS = 10
    const WAGER_AMOUNT = 100

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
            .catch(error => {
                console.error('Error loading CSV:', error)
                setIsLoading(false)
            })
    }, [])

    useEffect(() => {
        if (user) {
            const loadSavedPicks = async () => {
                const docRef = doc(db, 'picks', user.uid)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    setSelections(docSnap.data().selections)
                    setIsLocked(docSnap.data().locked || false)
                }
            }

            loadSavedPicks()
        }
    }, [user])

    // Check if we're past the deadline
    useEffect(() => {
        const checkLockStatus = () => {
            const now = new Date()
            setIsLocked(now >= DEADLINE)
        }

        // Check immediately
        checkLockStatus()

        // Set up an interval to check every minute
        const interval = setInterval(checkLockStatus, 60000)

        return () => clearInterval(interval)
    }, [])

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

    const handleStateClick = (stateName: string) => {
        setSelections(prev => {
            const currentSelection = prev[stateName] || "none"
            if (totalWagers >= MAX_WAGERS && currentSelection === "none") {
                return prev
            }

            const newSelection: "red" | "blue" | "none" =
                currentSelection === "none" ? "red" :
                    currentSelection === "red" ? "blue" : "none"

            // Create new selections object
            const newSelections = { ...prev }

            // If new selection is "none", remove the key entirely
            if (newSelection === "none") {
                delete newSelections[stateName]
            } else {
                newSelections[stateName] = newSelection
            }

            return newSelections
        })
    }

    const formatProbability = (prob: number) => `${prob.toFixed(1)}%`

    const calculatePayout = (probability: number): number => {
        // Convert probability to decimal odds and calculate $100 bet payout
        return Math.round(100 / (probability / 100))
    }

    const totalWagers = Object.entries(selections)
        .filter(([_, selection]) => selection !== "none")
        .length

    const remainingWagers = MAX_WAGERS - totalWagers
    const remainingMoney = remainingWagers * WAGER_AMOUNT

    const savePicks = async () => {
        if (!user) return

        // Validate number of picks
        const activePicks = Object.values(selections).filter(selection => selection !== "none").length
        if (activePicks > MAX_WAGERS) {
            toast({
                title: "Too many picks",
                description: `You can only have ${MAX_WAGERS} picks. Please remove some before saving.`,
                variant: "destructive",
                duration: 3000,
            })
            return
        }

        setIsSaving(true)

        try {
            await setDoc(doc(db, 'picks', user.uid), {
                selections,
                updatedAt: new Date().toISOString(),
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous'
            })

            toast({
                title: "Picks saved",
                description: "Your selections have been saved successfully.",
                duration: 2000,
            })
        } catch (error) {
            console.error('Error saving picks:', error)
            toast({
                title: "Error saving picks",
                description: "There was a problem saving your selections. Please try again.",
                variant: "destructive",
                duration: 3000,
            })
        } finally {
            setIsSaving(false)
        }
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
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg sm:text-xl">State Predictions & Probabilities</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {isLocked ?
                                    "Picks are locked for the election" :
                                    "Click states to toggle your prediction. Darker colors indicate stronger leads."
                                }
                            </CardDescription>
                        </div>
                        {!isLocked && (
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
                                <div className="text-right">
                                    <div className="text-sm font-medium">
                                        Wagers: {remainingWagers}/{MAX_WAGERS}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        ${remainingMoney} available
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="hidden sm:inline ml-2">Clear All</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Clear all picks?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will remove all your current picks. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => {
                                                        setSelections({});
                                                        toast({
                                                            title: "Picks cleared",
                                                            description: "All picks have been removed.",
                                                            duration: 2000,
                                                        });
                                                    }}
                                                    className="bg-destructive hover:bg-destructive/90"
                                                >
                                                    Clear All
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button
                                        onClick={savePicks}
                                        size="sm"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="hidden sm:inline ml-2">Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <SaveIcon className="h-4 w-4" />
                                                <span className="hidden sm:inline ml-2">Save</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                    <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
                        {/* Map Section */}
                        <div className="lg:w-3/5">
                            <div className="w-full aspect-[4/3] relative">
                                <ComposableMap projection="geoAlbersUsa">
                                    <Geographies geography={geoUrl}>
                                        {({ geographies }) =>
                                            geographies.map((geo) => {
                                                const stateName = geo.properties.name
                                                const stateData = electionData.find(d => d.state_full === stateName)
                                                const selection = selections[stateName]
                                                const baseColor = getStateColor(stateName)

                                                return (
                                                    <Geography
                                                        key={geo.rsmKey}
                                                        geography={geo}
                                                        style={{
                                                            default: {
                                                                fill: baseColor,
                                                                stroke: "#FFFFFF",
                                                                strokeWidth: selection ? 3 : 0.5,
                                                                outline: "none",
                                                            },
                                                            hover: {
                                                                fill: baseColor,
                                                                stroke: "#FFFFFF",
                                                                strokeWidth: selection ? 3 : 2,
                                                                outline: "none",
                                                                cursor: isLocked ? "default" : "pointer",
                                                            },
                                                        }}
                                                        onClick={() => !isLocked && handleStateClick(stateName)}
                                                    />
                                                )
                                            })
                                        }
                                    </Geographies>
                                    {Object.entries(selections)
                                        .filter(([_, selection]) => selection !== "none")
                                        .map(([stateName, selection]) => {
                                            const coords = stateCenters[stateName]
                                            if (!coords) return null

                                            return (
                                                <g
                                                    key={stateName}
                                                    onClick={() => handleStateClick(stateName)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <Annotation
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
                                                            }}
                                                        >
                                                            {selection === "blue" ? "D" : "R"}
                                                        </text>
                                                    </Annotation>
                                                </g>
                                            )
                                        })}
                                </ComposableMap>
                            </div>

                            <div className="mt-2 sm:mt-4 flex justify-center items-center gap-4 sm:gap-8 text-xs sm:text-sm">
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <div className="w-16 sm:w-24 h-3 sm:h-4 bg-gradient-to-r from-[#cce5ff] to-[#0039a6]"></div>
                                    <span>Democratic Lead</span>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <div className="w-16 sm:w-24 h-3 sm:h-4 bg-gradient-to-r from-[#ffcccb] to-[#cc0000]"></div>
                                    <span>Republican Lead</span>
                                </div>
                            </div>
                        </div>

                        {/* Ledger Section */}
                        <div className="lg:w-2/5 space-y-3 sm:space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-medium text-sm sm:text-base">Your Picks Ledger</h3>
                                {!isLocked && (
                                    <div className="text-sm text-muted-foreground">
                                        ${WAGER_AMOUNT} per pick
                                    </div>
                                )}
                            </div>

                            {/* Summary boxes */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                <div className="p-2 sm:p-4 rounded-lg bg-muted">
                                    <div className="text-xs sm:text-sm text-muted-foreground">Selections Made</div>
                                    <div className="text-lg sm:text-2xl font-bold">
                                        {totalWagers} of {MAX_WAGERS}
                                    </div>
                                </div>
                                <div className="p-2 sm:p-4 rounded-lg bg-muted">
                                    <div className="text-xs sm:text-sm text-muted-foreground">Max Potential Win</div>
                                    <div className="text-lg sm:text-2xl font-bold">
                                        ${Object.entries(selections)
                                            .filter(([_, selection]) => selection !== "none")
                                            .reduce((total, [stateName, selection]) => {
                                                const stateData = electionData.find(d => d.state_full === stateName)
                                                if (!stateData) return total
                                                const probability = selection === "red" ?
                                                    stateData.winstate_chal :
                                                    stateData.winstate_inc
                                                return total + (calculatePayout(probability) - 100)
                                            }, 0)}
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Wagers List */}
                            <div className="space-y-2 max-h-[300px] sm:max-h-[500px] overflow-y-auto border-t pt-3">
                                {Object.entries(selections)
                                    .filter(([_, selection]) => selection !== "none")
                                    .map(([stateName, selection]) => {
                                        const stateData = electionData.find(d => d.state_full === stateName)
                                        if (!stateData) return null

                                        const probability = selection === "red" ?
                                            stateData.winstate_chal :
                                            stateData.winstate_inc

                                        const payout = calculatePayout(probability)
                                        const risk = 100

                                        return (
                                            <div
                                                key={stateName}
                                                className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border-2 ${selection === "red"
                                                        ? "border-red-600 bg-red-50"
                                                        : "border-blue-600 bg-blue-50"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 sm:gap-4">
                                                    <div>
                                                        <div className="font-medium text-sm sm:text-base">{stateName}</div>
                                                        <div className="text-xs sm:text-sm text-muted-foreground">
                                                            Betting on {selection.toUpperCase()} ({formatProbability(probability)} chance)
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium text-sm sm:text-base">
                                                        To win: ${payout - risk}
                                                    </div>
                                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                                        Risk: ${risk}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default Picks