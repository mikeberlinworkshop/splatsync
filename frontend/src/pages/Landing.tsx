import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Zap, Heart, BarChart3, ExternalLink, ArrowRight } from 'lucide-react';
import { OtfLoginModal } from '@/components/OtfLoginModal';
import { api } from '@/lib/api';

export function Landing() {
  const [showOtfModal, setShowOtfModal] = useState(false);
  const navigate = useNavigate();

  const handleOtfLogin = async (email: string, password: string) => {
    await api.otfLogin(email, password);
    navigate('/dashboard');
  };


  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Zap size={24} className="text-otf-orange" />
          <span className="text-xl font-bold text-text-primary">SplatSync</span>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
        >
          <ExternalLink size={16} />
          Open Source
        </a>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6">
        <div className="max-w-3xl text-center pt-12 sm:pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-otf-orange/10 border border-otf-orange/20 rounded-full text-sm text-otf-orange mb-8">
            <Flame size={14} />
            Free &amp; open source
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-text-primary leading-tight mb-6">
            Your OTF workouts
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-otf-orange to-strava-orange">
              deserve real data
            </span>
            <br />
            on Strava
          </h1>

          <p className="text-base sm:text-lg text-text-secondary max-w-xl mx-auto mb-8 sm:mb-10">
            Your Strava says you ran 1.2 miles. OTF says 1.8.
            SplatSync replaces your Strava activity with the real
            distance, speed, calories, and heart rate from OTF.
          </p>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setShowOtfModal(true)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-otf-orange to-strava-orange hover:from-otf-orange-dark hover:to-otf-orange text-white font-semibold rounded-xl transition-all duration-150 text-lg shadow-lg shadow-otf-orange/25 hover:shadow-otf-orange/40 hover:-translate-y-0.5"
            >
              <Flame size={20} />
              Get Started — Connect OTF
            </button>
            <p className="text-sm text-text-muted">
              Sign in with your Orangetheory account, then connect Strava
            </p>
          </div>
        </div>

        {/* Before / After visual */}
        <div className="max-w-2xl w-full mt-16 sm:mt-20">
          <h2 className="text-center text-xs uppercase tracking-widest text-text-muted mb-6 font-semibold">See the difference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 sm:gap-0 items-center">
            {/* Before */}
            <div className="bg-red-500/[0.06] border border-red-500/15 rounded-xl p-5 opacity-75">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-red-400/80">Strava says</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Distance</span>
                  <span className="text-red-400/80 font-medium">1.2 mi</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Calories</span>
                  <span className="text-red-400/80 font-medium">412 cal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Avg HR</span>
                  <span className="text-red-400/80 font-medium">138 bpm</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden sm:flex items-center justify-center px-4">
              <ArrowRight size={24} className="text-otf-orange" />
            </div>
            <div className="flex sm:hidden items-center justify-center">
              <ArrowRight size={20} className="text-otf-orange rotate-90" />
            </div>

            {/* After */}
            <div className="bg-green-500/[0.08] border border-green-500/20 rounded-xl p-5 shadow-lg shadow-green-500/5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-green-400">SplatSync fixes</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Distance</span>
                  <span className="text-green-400 font-semibold">1.8 mi</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Calories</span>
                  <span className="text-green-400 font-semibold">520 cal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Avg HR</span>
                  <span className="text-green-400 font-semibold">152 bpm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature cards with colored left borders */}
        <div className="max-w-3xl w-full grid md:grid-cols-3 gap-4 sm:gap-6 mt-16 sm:mt-20">
          <div className="bg-surface border border-surface-lighter rounded-xl p-6 text-left border-l-4 border-l-otf-orange hover:border-l-otf-orange-light transition-colors duration-150">
            <div className="p-2 bg-otf-orange/10 rounded-lg w-fit mb-3">
              <Heart size={20} className="text-otf-orange" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Correct Distance &amp; Speed</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              The treadmill knows exactly how far you ran. Your Apple Watch guesses
              from wrist motion. Get the real numbers.
            </p>
          </div>
          <div className="bg-surface border border-surface-lighter rounded-xl p-6 text-left border-l-4 border-l-zone-red hover:border-l-red-400 transition-colors duration-150">
            <div className="p-2 bg-zone-red/10 rounded-lg w-fit mb-3">
              <Flame size={20} className="text-zone-red" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Real Calories &amp; HR</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              OTF's chest monitor samples 4x/sec with a precise calorie formula.
              Your Watch samples every 5 seconds and guesses.
            </p>
          </div>
          <div className="bg-surface border border-surface-lighter rounded-xl p-6 text-left border-l-4 border-l-zone-green hover:border-l-green-400 transition-colors duration-150">
            <div className="p-2 bg-zone-green/10 rounded-lg w-fit mb-3">
              <BarChart3 size={20} className="text-zone-green" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Zone Data + Splats</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              See your full 5-zone breakdown and splat points preserved
              in your Strava activity description.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-3xl w-full mt-16 sm:mt-24 mb-16">
          <h2 className="text-center text-2xl font-bold text-text-primary mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-otf-orange/15 border border-otf-orange/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-otf-orange font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Connect OTF</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Sign in with your Orangetheory email and password. We fetch your workout data securely.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-strava-orange/15 border border-strava-orange/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-strava-orange font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Connect Strava</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Authorize Strava with one click. We match your OTF workouts to Strava activities automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Sync your workouts</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Review the differences and sync with one click. Your Strava gets the real OTF data.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-text-muted/60 py-6 border-t border-surface-lighter/30">
        SplatSync is not affiliated with Orangetheory Fitness or Strava.
      </footer>

      <OtfLoginModal
        open={showOtfModal}
        onClose={() => setShowOtfModal(false)}
        onLogin={handleOtfLogin}
      />
    </div>
  );
}
