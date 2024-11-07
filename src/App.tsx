import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Picks from './pages/Picks'
import Rules from './pages/Rules'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './App.css'
import { Button } from './components/ui/button'
import { Toaster } from "@/components/ui/toaster"
import Admin from './pages/Admin'
import Simulations from './pages/Simulations'
import Probabilities from './pages/Probabilities'
import PopularVote from './pages/PopularVote'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  
  if (!user) return <Navigate to="/login" />
  
  return <>{children}</>
}

function NavBar() {
  const { user, logout } = useAuth()

  return (
    <nav className="border-b">
      <div className="flex h-12 sm:h-16 items-center px-2 sm:px-4 justify-between">
        <div className="mx-2 sm:mx-6 flex gap-4 sm:gap-6 font-medium">
          <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground">
            Home
          </Link>
          <Link to="/picks" className="transition-colors hover:text-foreground/80 text-foreground">
            Picks
          </Link>
          <Link to="/rules" className="transition-colors hover:text-foreground/80 text-foreground">
            Rules
          </Link>
          <Link to="/simulations" className="transition-colors hover:text-foreground/80 text-foreground">
            Simulate
          </Link>
          <Link to="/probabilities" className="transition-colors hover:text-foreground/80 text-foreground">
            Odds
          </Link>
          <Link to="/popular-vote" className="transition-colors hover:text-foreground/80 text-foreground">
            Popular Vote
          </Link>
        </div>
        {user && (
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <span className="text-sm text-muted-foreground sm:hidden">
              {user.email?.split('@')[0]}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <NavBar />
          <main className="container mx-auto py-2 sm:py-6 px-2 sm:px-4">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Home />} />
              <Route path="/rules" element={<Rules />} />
              <Route 
                path="/picks" 
                element={
                  <PrivateRoute>
                    <Picks />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <PrivateRoute>
                    <Admin />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/simulations" 
                element={
                  <PrivateRoute>
                    <Simulations />
                  </PrivateRoute>
                } 
              />
              <Route path="/probabilities" element={<Probabilities />} />
              <Route path="/popular-vote" element={<PopularVote />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </Router>
    </AuthProvider>
  )
}

export default App
