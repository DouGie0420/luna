'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Chrome, Smartphone, ExternalLink, Copy, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BrowserGuide {
  id: string;
  name: string;
  icon: React.ReactNode;
  steps: string[];
  videoUrl?: string;
  tip?: string;
}

export function InstallationGuide() {
  const { toast } = useToast();
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  // Detect browser
  const userAgent = typeof window !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isChrome = userAgent.includes('chrome');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isFirefox = userAgent.includes('firefox');
  const isEdge = userAgent.includes('edge');
  
  const currentBrowser = isChrome ? 'chrome' : 
                        isSafari ? 'safari' : 
                        isFirefox ? 'firefox' : 
                        isEdge ? 'edge' : 'other';

  const browserGuides: Record<string, BrowserGuide> = {
    chrome: {
      id: 'chrome',
      name: 'Google Chrome',
      icon: <Chrome className="h-6 w-6 text-blue-500" />,
      steps: [
        'Open Chrome menu (⋮) in the top-right corner',
        'Look for "Install LUNA" option in the menu',
        'If not visible, click the install icon (📱) in the address bar',
        'Click "Install" when prompted',
        'LUNA will now appear in your app launcher'
      ],
      videoUrl: 'https://youtu.be/example-chrome-pwa',
      tip: 'Tip: Visit the site multiple times and interact with content for Chrome to show install prompt'
    },
    safari: {
      id: 'safari',
      name: 'Safari (iOS/macOS)',
      icon: <Globe className="h-6 w-6 text-blue-400" />,
      steps: [
        'Tap the Share button (□ with ↑ arrow)',
        'Scroll down and tap "Add to Home Screen"',
        'Name it "LUNA" (or your preferred name)',
        'Tap "Add" in the top-right corner',
        'Find LUNA on your home screen and tap to open'
      ],
      videoUrl: 'https://youtu.be/example-safari-pwa',
      tip: 'Tip: On iOS, you must use Safari to install PWAs. Chrome/Firefox on iOS cannot install PWAs.'
    },
    firefox: {
      id: 'firefox',
      name: 'Mozilla Firefox',
      icon: <Globe className="h-6 w-6 text-orange-500" />,
      steps: [
        'Click Firefox menu (≡) in the top-right corner',
        'Select "Install LUNA" from the menu',
        'Alternatively, look for install icon in address bar',
        'Click "Allow" when prompted for installation',
        'LUNA will install as a standalone app'
      ],
      videoUrl: 'https://youtu.be/example-firefox-pwa',
      tip: 'Tip: Firefox may require you to enable PWA installation in settings'
    },
    edge: {
      id: 'edge',
      name: 'Microsoft Edge',
      icon: <Globe className="h-6 w-6 text-blue-600" />,
      steps: [
        'Click Edge menu (⋯) in the top-right corner',
        'Go to "Apps" → "Install this site as an app"',
        'Name it "LUNA" and click "Install"',
        'The app will install and appear in your Start menu',
        'You can also pin it to taskbar for quick access'
      ],
      videoUrl: 'https://youtu.be/example-edge-pwa',
      tip: 'Tip: Edge provides excellent PWA integration with Windows'
    },
    other: {
      id: 'other',
      name: 'Other Browsers',
      icon: <Smartphone className="h-6 w-6 text-purple-500" />,
      steps: [
        'Look for "Add to Home Screen" or "Install" option',
        'Check browser menu for installation options',
        'Some browsers show install icon in address bar',
        'If unavailable, try Chrome, Edge, or Safari',
        'PWAs work best on modern browsers with PWA support'
      ],
      videoUrl: 'https://youtube.com/search?q=pwa+install+tutorial',
      tip: 'Tip: Chrome, Edge, and Safari have the best PWA support. Update your browser for best results.'
    }
  };

  const currentGuide = browserGuides[currentBrowser];
  const allGuides = Object.values(browserGuides);

  const copyStep = (stepIndex: number, stepText: string) => {
    navigator.clipboard.writeText(stepText).then(() => {
      setCopiedStep(stepIndex);
      setTimeout(() => setCopiedStep(null), 2000);
      toast({
        title: 'Copied!',
        description: 'Step copied to clipboard',
        variant: 'default'
      });
    });
  };

  const copyAllSteps = () => {
    const allSteps = currentGuide.steps.join('\n');
    navigator.clipboard.writeText(allSteps).then(() => {
      toast({
        title: 'All steps copied!',
        description: 'Installation guide copied to clipboard',
        variant: 'default'
      });
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-3xl mb-6">
          <Download className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">Install LUNA as an App</h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          Get faster access, push notifications, and work offline by installing LUNA as a Progressive Web App (PWA)
        </p>
      </div>

      {/* Current Browser Guide */}
      <Card className="glass-morphism border-white/10 rounded-3xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {currentGuide.icon}
            <div>
              <h2 className="text-2xl font-bold text-white">For {currentGuide.name}</h2>
              <p className="text-white/60">Detected browser: {currentBrowser}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={copyAllSteps}
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy All Steps
          </Button>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-6">
          {currentGuide.steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-primary font-bold">{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-white">{step}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyStep(index, step)}
                className="text-white/40 hover:text-white"
              >
                {copiedStep === index ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Tip */}
        {currentGuide.tip && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <p className="text-blue-400 text-sm">💡 {currentGuide.tip}</p>
          </div>
        )}

        {/* Video Guide */}
        {currentGuide.videoUrl && (
          <div className="mt-6">
            <Button
              onClick={() => window.open(currentGuide.videoUrl, '_blank')}
              className="w-full bg-gradient-to-r from-primary to-purple-600 text-white py-6 rounded-2xl"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Watch Video Tutorial for {currentGuide.name}
            </Button>
          </div>
        )}
      </Card>

      {/* Other Browsers */}
      <Card className="glass-morphism border-white/10 rounded-3xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Other Browser Guides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allGuides
            .filter(guide => guide.id !== currentBrowser)
            .map((guide) => (
              <div
                key={guide.id}
                className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  {guide.icon}
                  <h4 className="font-bold text-white">{guide.name}</h4>
                </div>
                <p className="text-white/60 text-sm mb-3">
                  {guide.steps.length} simple steps
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    // Scroll to this guide if we implement tabbed interface
                    toast({
                      title: `View ${guide.name} guide`,
                      description: `Switch to ${guide.name} to see specific instructions`,
                      variant: 'default'
                    });
                  }}
                >
                  View {guide.name} Guide
                </Button>
              </div>
            ))}
        </div>
      </Card>

      {/* Benefits */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-morphism border-white/10 rounded-2xl p-6">
          <div className="p-3 bg-green-500/20 rounded-xl w-fit mb-4">
            <span className="text-green-400">⚡</span>
          </div>
          <h4 className="font-bold text-white mb-2">Faster Loading</h4>
          <p className="text-white/60">
            PWAs load instantly, even on slow connections. No more waiting for web pages to load.
          </p>
        </Card>
        
        <Card className="glass-morphism border-white/10 rounded-2xl p-6">
          <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4">
            <span className="text-blue-400">📱</span>
          </div>
          <h4 className="font-bold text-white mb-2">Works Offline</h4>
          <p className="text-white/60">
            Access your messages, orders, and data even without an internet connection.
          </p>
        </Card>
        
        <Card className="glass-morphism border-white/10 rounded-2xl p-6">
          <div className="p-3 bg-purple-500/20 rounded-xl w-fit mb-4">
            <span className="text-purple-400">🔔</span>
          </div>
          <h4 className="font-bold text-white mb-2">Push Notifications</h4>
          <p className="text-white/60">
            Get instant notifications for new messages, orders, and important updates.
          </p>
        </Card>
      </div>

      {/* Technical Support */}
      <Card className="glass-morphism border-white/10 rounded-3xl p-6 mt-8">
        <h3 className="text-xl font-bold text-white mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-bold text-white">Common Issues:</h4>
            <ul className="text-white/60 space-y-1">
              <li>• Install option not showing? Try visiting the site multiple times</li>
              <li>• Using iOS? You must use Safari (not Chrome/Firefox)</li>
              <li>• On Android? Chrome works best for PWA installation</li>
              <li>• Try clearing site data and revisiting if previously dismissed</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white">Quick Links:</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                onClick={() => window.open('https://web.dev/install-criteria/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Official PWA Installation Guide
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                onClick={() => window.open('https://whatpwacando.today/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                What PWAs Can Do Today
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  // Copy diagnostic info
                  const diagnostic = {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    isSecure: window.location.protocol === 'https:',
                    isLocalhost: window.location.hostname === 'localhost',
                    timestamp: new Date().toISOString()
                  };
                  navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
                  toast({
                    title: 'Diagnostic info copied',
                    description: 'Share this with support if needed',
                    variant: 'default'
                  });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Diagnostic Info
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}