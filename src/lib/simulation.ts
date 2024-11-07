import { ElectionData } from "@/types"

export type WinningScenario = {
  winAmount: number;
  frequency: number;
  picks: Record<string, boolean>; // state name -> won/lost
}

export type UserPicks = {
  email: string;
  displayName: string;
  selections: Record<string, "red" | "blue">;
  updatedAt: string;
  potentialWinnings: number;
  numPicks: number;
}

export type VictoryPath = {
  probability: number;
  neededOutcomes: {
    blue: string[];  // States that need to go Democratic
    red: string[];   // States that need to go Republican
  };
  potentialWinnings: number;
}

export type UserPicksWithProbability = UserPicks & {
  winProbability: number;
  victoryPaths: VictoryPath[];  // Add victory paths
}

export type StateImpact = {
  state: string;
  blueOutcome: {
    helps: string[];  // displayNames of players this helps
    hurts: string[];  // displayNames of players this hurts
  };
  redOutcome: {
    helps: string[];
    hurts: string[];
  };
  importance: number;  // How often this state determines the winner
}

export type UserPicksWithProbability = UserPicks & {
  winProbability: number;
  criticalStates: {
    needsBlue: string[];  // States that need to be blue for this user to win
    needsRed: string[];   // States that need to be red for this user to win
  };
}

const calculatePayout = (probability: number): number => {
  return Math.round(100 / (probability / 100))
}

export function simulateWinners(
  picks: UserPicks[], 
  electionData: ElectionData[],
  numSimulations: number = 10000
): { users: UserPicksWithProbability[], stateImpacts: StateImpact[] } {
  const winCounts = new Map<string, number>()
  const stateInfluence = new Map<string, {
    blueHelps: Map<string, number>,
    blueHurts: Map<string, number>,
    redHelps: Map<string, number>,
    redHurts: Map<string, number>,
    decisive: number
  }>()

  // Initialize state influence tracking
  electionData.forEach(state => {
    stateInfluence.set(state.state_full, {
      blueHelps: new Map(),
      blueHurts: new Map(),
      redHelps: new Map(),
      redHurts: new Map(),
      decisive: 0
    })
  })

  // Run simulations
  for (let i = 0; i < numSimulations; i++) {
    let maxWinnings = -Infinity
    let winner = ''
    const stateOutcomes: Record<string, boolean> = {}
    const playerWinnings: Record<string, number> = {}
    
    // First simulate all state outcomes
    electionData.forEach(state => {
      const blueProb = state.winstate_inc / 100
      stateOutcomes[state.state_full] = Math.random() < blueProb
    })

    // Calculate each player's winnings
    picks.forEach(user => {
      let simulatedWinnings = 0
      Object.entries(user.selections).forEach(([stateName, pick]) => {
        const stateData = electionData.find(d => d.state_full === stateName)
        if (!stateData) return

        const won = (pick === "blue" && stateOutcomes[stateName]) || 
                   (pick === "red" && !stateOutcomes[stateName])
        
        if (won) {
          const probability = pick === "red" ? 
            stateData.winstate_chal : 
            stateData.winstate_inc
          simulatedWinnings += calculatePayout(probability) - 100
        } else {
          simulatedWinnings -= 100  // Lose the bet
        }
      })

      playerWinnings[user.displayName] = simulatedWinnings
      if (simulatedWinnings > maxWinnings) {
        maxWinnings = simulatedWinnings
        winner = user.displayName
      }
    })
    
    winCounts.set(winner, (winCounts.get(winner) || 0) + 1)
  }

  // Process state impacts
  const stateImpacts: StateImpact[] = Array.from(stateInfluence.entries())
    .map(([state, influence]) => ({
      state,
      blueOutcome: {
        helps: Array.from(influence.blueHelps.entries())
          .sort((a, b) => b[1] - a[1])
          .filter(([_, count]) => count > numSimulations * 0.1)
          .map(([name]) => name),
        hurts: Array.from(influence.blueHurts.entries())
          .sort((a, b) => b[1] - a[1])
          .filter(([_, count]) => count > numSimulations * 0.1)
          .map(([name]) => name)
      },
      redOutcome: {
        helps: Array.from(influence.redHelps.entries())
          .sort((a, b) => b[1] - a[1])
          .filter(([_, count]) => count > numSimulations * 0.1)
          .map(([name]) => name),
        hurts: Array.from(influence.redHurts.entries())
          .sort((a, b) => b[1] - a[1])
          .filter(([_, count]) => count > numSimulations * 0.1)
          .map(([name]) => name)
      },
      importance: influence.decisive / numSimulations
    }))
    .sort((a, b) => b.importance - a.importance)

  // Process user results
  const users = picks.map(user => ({
    ...user,
    winProbability: (winCounts.get(user.displayName) || 0) / numSimulations * 100,
    criticalStates: {
      needsBlue: stateImpacts
        .filter(impact => impact.blueOutcome.helps.includes(user.displayName))
        .map(impact => impact.state),
      needsRed: stateImpacts
        .filter(impact => impact.redOutcome.helps.includes(user.displayName))
        .map(impact => impact.state)
    }
  }))

  return { users, stateImpacts }
}

// Function to simulate a single user's picks
export function simulateUserPicks(
  selections: Record<string, "red" | "blue">,
  electionData: ElectionData[],
  numSimulations: number = 10000
): { 
  winningScenarios: WinningScenario[], 
  riskMetrics: {
    volatility: number,
    winFrequency: number,
    avgWinningPicks: number,
    riskRating: "Conservative" | "Balanced" | "Aggressive" | "Highly Speculative"
  }
} {
  const scenarios: WinningScenario[] = []
  let totalWinningRounds = 0
  let totalWinningPicks = 0
  let sumSquaredReturns = 0

  for (let i = 0; i < numSimulations; i++) {
    let simulatedWinnings = 0
    let picksWon = 0
    const currentScenario: Record<string, boolean> = {}
    const totalRisk = Object.keys(selections).length * 100 // $100 per pick

    Object.entries(selections).forEach(([stateName, pick]) => {
      const stateData = electionData.find(d => d.state_full === stateName)
      if (!stateData) return

      const winProb = pick === "red" ? 
        stateData.winstate_chal / 100 : 
        stateData.winstate_inc / 100

      const won = Math.random() < winProb
      currentScenario[stateName] = won
      if (won) {
        const payout = calculatePayout(winProb * 100) - 100
        simulatedWinnings += payout
        picksWon++
      }
    })

    // Only count as a winning round if total return is positive
    if (simulatedWinnings > 0) {
      totalWinningRounds++
      totalWinningPicks += picksWon
    }
    sumSquaredReturns += simulatedWinnings * simulatedWinnings

    scenarios.push({
      winAmount: simulatedWinnings,
      frequency: 1,
      picks: currentScenario
    })
  }

  // Calculate risk metrics
  const volatility = Math.sqrt(sumSquaredReturns / numSimulations)
  const winFrequency = (totalWinningRounds / numSimulations) * 100
  const avgWinningPicks = totalWinningPicks / totalWinningRounds || 0

  // Adjust risk rating thresholds for positive returns
  let riskRating: "Conservative" | "Balanced" | "Aggressive" | "Highly Speculative"
  if (winFrequency > 40) {
    riskRating = "Conservative"
  } else if (winFrequency > 25) {
    riskRating = "Balanced"
  } else if (winFrequency > 15) {
    riskRating = "Aggressive"
  } else {
    riskRating = "Highly Speculative"
  }

  // Process scenarios to find most common ones
  const grouped = scenarios.reduce((acc, scenario) => {
    const key = JSON.stringify(scenario.picks)
    if (!acc[key]) {
      acc[key] = { ...scenario, frequency: 1 }
    } else {
      acc[key].frequency++
    }
    return acc
  }, {} as Record<string, WinningScenario>)

  const topScenarios = Object.values(grouped)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3)

  return {
    winningScenarios: topScenarios,
    riskMetrics: {
      volatility,
      winFrequency,
      avgWinningPicks,
      riskRating
    }
  }
} 