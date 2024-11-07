import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import Papa from 'papaparse'
import { ElectionData } from "@/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

type SortConfig = {
  key: keyof ElectionData
  direction: 'asc' | 'desc'
}

function Probabilities() {
  const [electionData, setElectionData] = useState<ElectionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'winstate_inc', 
    direction: 'desc' 
  })

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

  const sortedData = [...electionData].sort((a, b) => {
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
    }
    return 0
  })

  const toggleSort = (key: keyof ElectionData) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }))
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
        <h1 className="text-3xl font-bold tracking-tight">State Probabilities</h1>
        <p className="text-muted-foreground">
          Current win probabilities for each state based on Nate Silver's projections
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>EVs</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleSort('winstate_inc')}
                    className="flex items-center gap-1"
                  >
                    Democratic
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleSort('winstate_chal')}
                    className="flex items-center gap-1"
                  >
                    Republican
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((state) => (
                <TableRow key={state.state}>
                  <TableCell className="font-medium">{state.state_full}</TableCell>
                  <TableCell>{state.evs}</TableCell>
                  <TableCell>
                    <div className={`font-mono ${state.winstate_inc > state.winstate_chal ? 'text-blue-600 font-bold' : ''}`}>
                      {state.winstate_inc.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-mono ${state.winstate_chal > state.winstate_inc ? 'text-red-600 font-bold' : ''}`}>
                      {state.winstate_chal.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-mono ${
                      state.winstate_inc > state.winstate_chal ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {state.winstate_inc > state.winstate_chal ? '+' : ''}
                      {(state.winstate_inc - state.winstate_chal).toFixed(2)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Probabilities 