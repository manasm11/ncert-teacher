import Link from "next/link";
import { BookOpen, Sparkles, Map, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="z-10 max-w-4xl max-auto text-center space-y-8">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-primary/20 text-primary font-medium text-sm animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span>Interactive NCERT Learning</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-foreground tracking-tight font-outfit">
          Meet <span className="text-primary inline-block transform hover:scale-105 transition-transform cursor-default">Gyanu</span>, your <br className="hidden md:block" />
          friendly <span className="text-secondary">AI Tutor!</span> 🐘
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Embark on a magical journey through the forest of knowledge. Master your NCERT curriculum with interactive chats, fun quizzes, and your personal AI companion.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold text-lg rounded-full shadow-playful hover:brightness-110 border-2 border-primary-foreground/20 transition-all flex items-center justify-center gap-2 group">
            Start the Journey
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/about" className="w-full sm:w-auto px-8 py-4 bg-white text-foreground font-bold text-lg rounded-full shadow-md hover:shadow-lg hover:-translate-y-1 border-2 border-transparent hover:border-border transition-all flex items-center justify-center gap-2">
            <BookOpen className="w-5 h-5 text-secondary" />
            Explore Curriculum
          </Link>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
          <div className="p-6 bg-white/60 backdrop-blur-md rounded-3xl border border-white/40 shadow-xl shadow-black/5 text-left transform hover:-translate-y-2 transition-transform">
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">🐘</span>
            </div>
            <h3 className="font-outfit font-bold text-xl mb-2 text-foreground">Interactive Chat</h3>
            <p className="text-muted-foreground text-sm">Talk to Gyanu like a real teacher. Ask questions, get hints, and learn concepts deeply.</p>
          </div>
          <div className="p-6 bg-white/60 backdrop-blur-md rounded-3xl border border-white/40 shadow-xl shadow-black/5 text-left transform hover:-translate-y-2 transition-transform">
            <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-outfit font-bold text-xl mb-2 text-foreground">NCERT Aligned</h3>
            <p className="text-muted-foreground text-sm">Every chat and quiz is routed directly through your official textbook curriculum.</p>
          </div>
          <div className="p-6 bg-white/60 backdrop-blur-md rounded-3xl border border-white/40 shadow-xl shadow-black/5 text-left transform hover:-translate-y-2 transition-transform">
            <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center mb-4">
              <Map className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-outfit font-bold text-xl mb-2 text-foreground">Journey Map</h3>
            <p className="text-muted-foreground text-sm">Track your mastery of topics as you travel through the forest and earn exciting badges.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
