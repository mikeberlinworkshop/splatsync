import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Zap, Heart, BarChart3, ExternalLink } from 'lucide-react';
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
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ExternalLink size={16} />
          Open Source
        </a>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center">
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
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-otf-orange hover:bg-otf-orange-dark text-white font-semibold rounded-xl transition-colors text-lg"
            >
              <Flame size={20} />
              Get Started — Connect OTF
            </button>
            <p className="text-sm text-text-muted">
              Sign in with your Orangetheory account, then connect Strava
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-20">
            <div className="bg-surface border border-surface-lighter rounded-xl p-6 text-left">
              <div className="p-2 bg-otf-orange/10 rounded-lg w-fit mb-3">
                <Heart size={20} className="text-otf-orange" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Correct Distance &amp; Speed</h3>
              <p className="text-sm text-text-secondary">
                The treadmill knows exactly how far you ran. Your Apple Watch guesses
                from wrist motion. Get the real numbers.
              </p>
            </div>
            <div className="bg-surface border border-surface-lighter rounded-xl p-6 text-left">
              <div className="p-2 bg-otf-orange/10 rounded-lg w-fit mb-3">
                <Flame size={20} className="text-otf-orange" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Real Calories &amp; HR</h3>
              <p className="text-sm text-text-secondary">
                OTF's chest monitor samples 4x/sec with a precise calorie formula.
                Your Watch samples every 5 seconds and guesses.
              </p>
            </div>
            <div className="bg-surface border border-surface-lighter rounded-xl p-6 text-left">
              <div className="p-2 bg-otf-orange/10 rounded-lg w-fit mb-3">
                <BarChart3 size={20} className="text-otf-orange" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Zone Data + Splats</h3>
              <p className="text-sm text-text-secondary">
                See your full 5-zone breakdown and splat points preserved
                in your Strava activity description.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-text-muted py-8">
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
