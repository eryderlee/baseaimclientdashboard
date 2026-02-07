import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileText,
  MessageSquare,
  TrendingUp,
  CreditCard,
  BarChart3,
  CheckCircle,
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl font-bold tracking-tight">
            Client Dashboard
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Your centralized hub for managing projects, documents, communication, and tracking progress with your team.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 py-6">
                Access Your Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Access and share project documents securely with your team
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Real-time Communication</CardTitle>
              <CardDescription>
                Stay connected with instant messaging and notifications
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Progress Tracking</CardTitle>
              <CardDescription>
                Monitor project milestones and track progress in real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Billing & Invoices</CardTitle>
              <CardDescription>
                View invoices and manage payments in one place
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Analytics & Insights</CardTitle>
              <CardDescription>
                Visualize project data and track key metrics
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>
                Get a complete view of all your projects and activities
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-4">
              Ready to manage your projects?
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 text-lg mb-6">
              Access your dashboard to view projects, documents, and communicate with your team
            </CardDescription>
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                  Access Dashboard
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-neutral-600 dark:text-neutral-400">
          <p>&copy; 2026 Client Dashboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
