import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, TrophyIcon, DollarSignIcon, MapIcon, LockIcon } from "lucide-react"

function Rules() {
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="h-6 w-6" />
            Game Overview
          </CardTitle>
          <CardDescription>
            Compete to build the most profitable election prediction portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Each player gets 10 picks and $1,000 to allocate ($100 per pick). The winner is the player who would have won the most money if their predictions were correct.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Grid of Rule Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Betting Rules Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSignIcon className="h-5 w-5" />
              How Betting Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Fixed Wager Amount</p>
              <p className="text-sm text-muted-foreground">Each pick costs exactly $100 from your $1,000 budget</p>
            </div>
            <div>
              <p className="font-medium">Payouts Based on Probability</p>
              <p className="text-sm text-muted-foreground">Lower probability picks pay more. Example: a 20% chance pays $500 on a $100 bet</p>
            </div>
            <div>
              <p className="font-medium">No Vigorish</p>
              <p className="text-sm text-muted-foreground">This is a simplified game with no house edge - payouts are based on pure probability</p>
            </div>
          </CardContent>
        </Card>

        {/* Odds Locking Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockIcon className="h-5 w-5" />
              Odds Locking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All odds will be locked based on Nate Silver's final projections before polls close on Tuesday, November 5th. These final odds will determine all payouts. Additionally, no new picks or changes can be made after 6:00 PM Eastern Time on Election Day.
            </p>
          </CardContent>
        </Card>

        {/* Map Interface Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="h-5 w-5" />
              Using the Map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">State Colors</p>
              <p className="text-sm text-muted-foreground">Blue states lean Democratic, red states lean Republican. Darker colors indicate stronger leads.</p>
            </div>
            <div>
              <p className="font-medium">Making Selections</p>
              <p className="text-sm text-muted-foreground">Click a state to cycle through: No Pick → R → D → No Pick. Selected states show an R or D label.</p>
            </div>
            <div>
              <p className="font-medium">Tracking Picks</p>
              <p className="text-sm text-muted-foreground">Your picks and potential winnings are tracked in real-time in the ledger beside the map.</p>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InfoIcon className="h-5 w-5" />
              Strategy Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Risk vs. Reward</p>
              <p className="text-sm text-muted-foreground">Balance safe picks with longshots. A mix of probabilities often yields the best results.</p>
            </div>
            <div>
              <p className="font-medium">Budget Management</p>
              <p className="text-sm text-muted-foreground">Use all 10 picks to maximize your potential winnings. Each unused pick is a missed opportunity.</p>
            </div>
            <div>
              <p className="font-medium">Stay Informed</p>
              <p className="text-sm text-muted-foreground">Probabilities update regularly based on new polling data until they lock on election day.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Rules 