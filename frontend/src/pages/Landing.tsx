import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, ArrowRight, Zap, Heart, BarChart3, ExternalLink } from 'lucide-react';
import { OtfLoginModal } from '@/components/OtfLoginModal';
import { api } from '@/lib/api';

export function Landing() {
  const [showOtfModal, setShowOtfModal] = useState(false);
  const navigate = useNavigate();

  const handleOtfLogin = async (email: string, password: string) => {
    await api.otfLogin(email, password);
    navigate('/dashboard');
  };

  const handleStravaConnect = async () => {
    try {
      const { url } = await api.stravaConnectUrl();
      window.location.href = url;
    } catch {
      // Not logged in yet — need to connect OTF first
      setShowOtfModal(true);
    }
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

          <h1 className="text-5xl md:text-6xl font-extrabold text-text-primary leading-tight mb-6">
            Your OTF workouts
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-otf-orange to-strava-orange">
              deserve real data
            </span>
            <br />
            on Strava
          </h1>

          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10">
            Apple Watch gets your OTF calories and heart rate wrong.
            SplatSync replaces your Strava activity with the real data
            from OTF's chest monitor — splat points and all.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowOtfModal(true)}
              className="flex items-center gap-2 px-8 py-3.5 bg-otf-orange hover:bg-otf-orange-dark text-white font-semibold rounded-xl transition-colors text-lg"
            >
              <Flame size={20} />
              Connect OTF
            </button>
            <button
              onClick={handleStravaConnect}
              className="flex items-center gap-2 px-8 py-3.5 bg-strava-orange hover:bg-strava-orange/90 text-white font-semibold rounded-xl transition-colors text-lg"
            >
              Connect Strava
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <div className="bg-surface border border-surface-lighter rounded-xl p-6 text-left">
              <div className="p-2 bg-otf-orange/10 rounded-lg w-fit mb-3">
                <Heart size={20} className="text-otf-orange" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Real Heart Rate</h3>
              <p className="text-sm text-text-secondary">
                OTF's chest/arm monitor samples 4x/sec. Your Apple Watch? Once every 5 seconds.
                Get the accurate data.
              </p>
            </div>
            <div className="bg-surface border border-surface-lighter rounded-xl p-6 text-left">
              <div className="p-2 bg-otf-orange/10 rounded-lg w-fit mb-3">
                <Flame size={20} className="text-otf-orange" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Correct Calories</h3>
              <p className="text-sm text-text-secondary">
                OTF's calorie formula uses their high-fidelity HR data. Stop
                seeing the wrong burn in Strava.
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
