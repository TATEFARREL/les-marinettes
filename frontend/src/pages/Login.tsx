import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/useAuth'

export default function Login() {
  const { user, login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (ex) {
      toast.error(
        ex instanceof Error && ex.message !== 'Invalid credentials'
          ? ex.message
          : 'Adresse e-mail ou mot de passe incorrect.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-primary via-primary to-[#001a44] p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl text-primary">Les Marinettes</CardTitle>
          <CardDescription>Espace d’administration — connectez-vous pour continuer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                type="email"
                placeholder="admin@lesmarinettes.org"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Votre mot de passe"
                required
              />
            </div>
            <Button type="submit" className="w-full" variant="accent" size="lg" disabled={loading || submitting}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
