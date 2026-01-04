'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  DollarSign,
  Calendar,
  Building2,
  Heart,
  BarChart3,
  ArrowRight,
  Menu,
  X,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Scroll animation component
function AnimateOnScroll({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [ref, setRef] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 100)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref, delay])

  return (
    <div
      ref={setRef}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-10',
        className
      )}
    >
      {children}
    </div>
  )
}

const features = [
  {
    icon: Users,
    title: 'Guest Management',
    description:
      'Track RSVPs, manage seating arrangements, and keep your guest list organized in one place.',
  },
  {
    icon: DollarSign,
    title: 'Budget Tracking',
    description:
      'Set your budget, track expenses, and stay on top of payments with smart alerts.',
  },
  {
    icon: Calendar,
    title: 'Timeline & Tasks',
    description:
      'Never miss a deadline with customizable timelines and task reminders.',
  },
  {
    icon: Building2,
    title: 'Vendor Coordination',
    description:
      'Store contracts, track payments, and keep all vendor details in one place.',
  },
  {
    icon: Heart,
    title: 'Collaborate Together',
    description:
      'Plan together with your partner. Share access and make decisions as a team.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Insights',
    description:
      'Get a clear overview of your wedding progress at a glance.',
  },
]

const processSteps = [
  {
    number: '01',
    title: 'Create Your Wedding',
    description:
      'Set up your wedding details, date, and budget in minutes. Our guided setup makes it easy.',
  },
  {
    number: '02',
    title: 'Build Your Plan',
    description:
      'Add guests, vendors, and tasks. Our templates and tools help you stay organized.',
  },
  {
    number: '03',
    title: 'Enjoy Your Day',
    description:
      'Stay organized and stress-free, knowing everything is under control.',
  },
]

const testimonials = [
  {
    quote:
      "We couldn't have planned our wedding without this app. Everything was in one place, and we never missed a single detail!",
    author: 'Sarah & Michael',
    detail: 'Married October 2024',
  },
  {
    quote:
      'The budget tracker saved us from overspending. We knew exactly where every dollar went. Highly recommend!',
    author: 'Emily & James',
    detail: 'Married June 2024',
  },
]

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased overflow-x-hidden noise-overlay">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />

      {/* Navigation */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 px-6 py-5 transition-all duration-300',
          scrolled && 'bg-background/80 backdrop-blur-xl border-b border-border'
        )}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-display italic text-foreground tracking-tight animate-fade-in"
          >
            Wedding Planner
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Features
            </a>
            <a
              href="#process"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              How It Works
            </a>
            <a
              href="#testimonials"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Stories
            </a>
          </div>

          <Link href="/login" className="hidden md:inline-flex">
            <Button
              variant="outline"
              className="rounded-full border-primary/30 text-primary hover:bg-primary/10"
            >
              Sign In
            </Button>
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border/50">
            <div className="flex flex-col gap-4 pt-4">
              <a
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#process"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Stories
              </a>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full rounded-full">Sign In</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main headline */}
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tight animate-fade-up">
            Plan your perfect day
            <span className="block mt-2">
              <em className="text-gradient">with confidence</em>
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="mt-8 md:mt-10 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up"
            style={{ animationDelay: '0.2s' }}
          >
            The all-in-one wedding planning platform that keeps you organized,
            on budget, and stress-free from engagement to &ldquo;I do.&rdquo;
          </p>

          {/* CTA buttons */}
          <div
            className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
            style={{ animationDelay: '0.3s' }}
          >
            <Link href="/signup">
              <Button
                size="lg"
                className="btn-shine rounded-full px-8 py-6 text-base w-full sm:w-auto"
              >
                Start Planning
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="ghost"
                size="lg"
                className="group rounded-full px-8 py-6 text-base text-muted-foreground hover:text-foreground w-full sm:w-auto"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Trust indicator */}
          <div
            className="mt-16 md:mt-20 animate-fade-up"
            style={{ animationDelay: '0.4s' }}
          >
            <p className="text-sm text-muted-foreground mb-4">
              Trusted by couples everywhere
            </p>
            <div className="flex items-center justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-primary text-primary"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <AnimateOnScroll className="max-w-2xl">
            <span className="text-primary text-sm font-medium tracking-wider uppercase">
              Features
            </span>
            <h2 className="mt-4 font-display text-4xl md:text-5xl leading-tight">
              Everything you need to{' '}
              <em className="text-gradient">plan your day</em>
            </h2>
          </AnimateOnScroll>

          {/* Features grid */}
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <AnimateOnScroll key={feature.title} delay={index}>
                <div className="card-hover-gold group p-8 bg-card border border-border rounded-2xl h-full">
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-6">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-xl mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-24 md:py-32 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <AnimateOnScroll className="text-center max-w-2xl mx-auto">
            <span className="text-primary text-sm font-medium tracking-wider uppercase">
              How It Works
            </span>
            <h2 className="mt-4 font-display text-4xl md:text-5xl leading-tight">
              Simple steps to your <em>perfect wedding</em>
            </h2>
          </AnimateOnScroll>

          {/* Process steps */}
          <div className="mt-20 grid lg:grid-cols-3 gap-12 lg:gap-8">
            {processSteps.map((step, index) => (
              <AnimateOnScroll key={step.number} delay={index} className="relative">
                <div className="text-8xl font-display text-primary/10 absolute -top-8 left-0">
                  {step.number}
                </div>
                <div className="relative pt-12">
                  <h3 className="font-display text-2xl mb-4">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 md:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <AnimateOnScroll className="text-center max-w-2xl mx-auto">
            <span className="text-primary text-sm font-medium tracking-wider uppercase">
              Love Stories
            </span>
            <h2 className="mt-4 font-display text-4xl md:text-5xl leading-tight">
              Couples who said <em className="text-gradient">&ldquo;I do&rdquo;</em>
            </h2>
          </AnimateOnScroll>

          {/* Testimonials grid */}
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <AnimateOnScroll key={testimonial.author} delay={index}>
                <div className="p-8 md:p-10 bg-card border border-border rounded-2xl">
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <blockquote className="font-display text-xl md:text-2xl italic leading-relaxed mb-8">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 px-6">
        <AnimateOnScroll className="max-w-4xl mx-auto text-center">
          {/* Gold accent line */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-12" />

          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl leading-tight">
            Ready to start planning
            <br className="hidden sm:block" />
            <em className="text-gradient">your perfect day?</em>
          </h2>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            Join couples who have planned their dream weddings with our platform.
            Start your journey today.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="btn-shine rounded-full px-8 py-6 text-base w-full sm:w-auto"
              >
                Create Your Wedding
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Free to get started. No credit card required.
          </p>
        </AnimateOnScroll>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link
              href="/"
              className="text-xl font-display italic text-foreground tracking-tight"
            >
              Wedding Planner
            </Link>

            <div className="flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#process"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </a>
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Wedding Planner. Made with love.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
