import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"

export default function Login() {
  const { signInWithGoogle, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/picks')
    }
  }, [user, navigate])

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to save and track your picks</CardDescription>
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
  )
} 