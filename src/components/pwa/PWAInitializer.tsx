'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { registerServiceWorker, isRunningAsPWA, requestNotificationPermission } from '@/lib/pwa';
import { initializeFCM, listenForForegroundMessages } from '@/lib/fcm';
import { getAuth } from 'firebase/auth';
import { InstallationGuide } from './InstallationGuide';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Download, WifiOff, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PWAStatus {
  isPWA: boolean;
  swRegistered: boolean;
  notificationPermission: NotificationPermission;
  fcmToken: string | null;
  isOnline: boolean;
  showInstallPrompt: boolean;
}

export function PWAInitializer() {
  const { toast } = useToast();
  const [status, setStatus] = useState<PWAStatus>({
    isPWA: false,
    swRegistered: false,
    notificationPermission: 'default',
    fcmToken: null,
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    showInstallPrompt: false
  });

  // Enhanced diagnostic function with synchronous SW check and manifest validation
  const performPWADiagnostic = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        hasManifest: false,
        manifestUrl: null,
        manifestValid: false,
        manifestError: 'Client-only function',
        hasServiceWorker: false,
        serviceWorkerRegistered: false,
        serviceWorkerInfo: 'Client-only function',
        serviceWorkerActive: false,
        serviceWorkerInstalling: false,
        isHTTPS: false,
        isLocalhost: false,
        isSecure: false,
        isInBrowser: false,
        isStandalone: false,
        isMinimalUI: false,
        isFullscreen: false,
        supportsBeforeInstallPrompt: false,
        supportsAppInstalled: false,
        userEngagement: false,
        isPWAInstalled: false,
        deferredPromptAvailable: false,
        showInstallPrompt: false,
        userAgent: '',
        browserName: 'Unknown',
        platform: ''
      };
    }
    
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const manifestUrl = manifestLink?.getAttribute('href');
    let manifestValid = false;
    let manifestError = '';
    let manifestData: any = null;
    
    // Try to fetch and validate manifest
    const validateManifest = async () => {
      if (manifestUrl) {
        try {
          const response = await fetch(manifestUrl);
          if (response.ok) {
            manifestData = await response.json();
            manifestValid = true;
            console.log('[PWA] Manifest loaded successfully:', manifestData);
            
            // Check required manifest fields
            const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
            const missingFields = requiredFields.filter(field => !manifestData[field]);
            if (missingFields.length > 0) {
              manifestError = `Missing required fields: ${missingFields.join(', ')}`;
              manifestValid = false;
            }
          } else {
            manifestError = `Failed to fetch manifest: ${response.status} ${response.statusText}`;
          }
        } catch (e: any) {
          manifestError = `Failed to load manifest: ${e.message}`;
        }
      } else {
        manifestError = 'No manifest URL found';
      }
    };
    
    // Run manifest validation (we'll call it but not await in synchronous function)
    validateManifest();
    
    // Synchronous Service Worker check
    let swRegistrationInfo = 'Not checked';
    let swActive = false;
    let swInstalling = false;
    let swState = 'unknown';
    
    if ('serviceWorker' in navigator) {
      try {
        // Check controller
        swActive = !!navigator.serviceWorker.controller;
        swRegistrationInfo = swActive ? 'Controller active' : 'No active controller';
        
        // Check registration state
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) {
            swState = reg.active?.state || 'unknown';
            console.log('[PWA] Service Worker registration details:', {
              active: reg.active?.state,
              installing: reg.installing?.state,
              waiting: reg.waiting?.state,
              scope: reg.scope
            });
          }
        }).catch(e => {
          console.error('[PWA] Error checking SW registration:', e);
        });
      } catch (e: any) {
        swRegistrationInfo = `Error: ${e.message}`;
      }
    } else {
      swRegistrationInfo = 'Service Worker not supported';
    }
    
    const diagnostic = {
      // Core PWA requirements
      hasManifest: !!manifestLink,
      manifestUrl,
      manifestValid,
      manifestError,
      
      hasServiceWorker: 'serviceWorker' in navigator,
      serviceWorkerRegistered: status.swRegistered,
      serviceWorkerInfo: swRegistrationInfo,
      serviceWorkerActive: swActive,
      serviceWorkerInstalling: swInstalling,
      
      isHTTPS: window.location.protocol === 'https:',
      isLocalhost: window.location.hostname === 'localhost',
      isSecure: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
      
      // Browser state
      isInBrowser: window.matchMedia('(display-mode: browser)').matches,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      isMinimalUI: window.matchMedia('(display-mode: minimal-ui)').matches,
      isFullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
      
      // Event support
      supportsBeforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
      supportsAppInstalled: 'onappinstalled' in window,
      
      // User engagement (heuristic)
      userEngagement: 'matchMedia' in window && window.matchMedia('(display-mode: browser)').matches,
      
      // Current state
      isPWAInstalled: status.isPWA,
      deferredPromptAvailable: !!deferredPrompt,
      showInstallPrompt: status.showInstallPrompt,
      
      // Browser info
      userAgent: navigator.userAgent,
      browserName: (() => {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('chrome')) return 'Chrome';
        if (ua.includes('firefox')) return 'Firefox';
        if (ua.includes('safari')) return 'Safari';
        if (ua.includes('edge')) return 'Edge';
        return 'Unknown';
      })(),
      platform: navigator.platform
    };
    
    console.log('[PWA] Full Diagnostic:', diagnostic);
    return diagnostic;
  };
  const [isInitializing, setIsInitializing] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [userEngagement, setUserEngagement] = useState({
    clickCount: 0,
    pageVisits: 1,
    firstVisitTime: Date.now(),
    lastInteraction: Date.now()
  });
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showDebugDetails, setShowDebugDetails] = useState(false);

  // Comprehensive PWA installation test function
  const runPWAInstallationTest = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.warn('[PWA] runPWAInstallationTest called on server side');
      return {
        allPassed: false,
        tests: [],
        recommendations: ['Function called on server side']
      };
    }
    
    console.log('[PWA] ====== Running Comprehensive PWA Installation Test ======');
    
    const testResults = {
      allPassed: false,
      tests: [] as Array<{name: string, passed: boolean, details: string, critical: boolean}>,
      recommendations: [] as string[]
    };
    
    // Test 1: HTTPS / Localhost security
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    testResults.tests.push({
      name: 'Secure Context (HTTPS or localhost)',
      passed: isSecure,
      details: `Protocol: ${window.location.protocol}, Hostname: ${window.location.hostname}`,
      critical: true
    });
    
    if (!isSecure) {
      testResults.recommendations.push('Use HTTPS or localhost for PWA installation');
    }
    
    // Test 2: Manifest existence
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const hasManifest = !!manifestLink;
    const manifestUrl = manifestLink?.getAttribute('href');
    testResults.tests.push({
      name: 'Manifest Link Present',
      passed: hasManifest,
      details: hasManifest ? `Manifest URL: ${manifestUrl}` : 'No manifest link found',
      critical: true
    });
    
    // Test 3: Manifest validation
    let manifestValid = false;
    let manifestDetails = 'Not checked';
    if (manifestUrl) {
      try {
        const response = await fetch(manifestUrl);
        if (response.ok) {
          const manifest = await response.json();
          manifestValid = true;
          
          // Check required fields
          const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
          const missingFields = requiredFields.filter(field => !manifest[field]);
          
          if (missingFields.length === 0) {
            manifestDetails = `Valid manifest with ${manifest.icons?.length || 0} icons`;
          } else {
            manifestDetails = `Missing fields: ${missingFields.join(', ')}`;
            manifestValid = false;
          }
        } else {
          manifestDetails = `Failed to fetch: ${response.status}`;
        }
      } catch (e: any) {
        manifestDetails = `Error: ${e.message}`;
      }
    }
    
    testResults.tests.push({
      name: 'Manifest Valid and Complete',
      passed: manifestValid,
      details: manifestDetails,
      critical: true
    });
    
    // Test 4: Service Worker support
    const hasServiceWorker = 'serviceWorker' in navigator;
    testResults.tests.push({
      name: 'Service Worker API Supported',
      passed: hasServiceWorker,
      details: hasServiceWorker ? 'navigator.serviceWorker available' : 'Browser does not support Service Workers',
      critical: true
    });
    
    // Test 5: Service Worker registration
    let swRegistered = false;
    let swDetails = 'Not checked';
    if (hasServiceWorker) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          swRegistered = true;
          swDetails = `Registered at scope: ${registration.scope}`;
          
          // Check if active
          if (registration.active) {
            swDetails += `, Active: ${registration.active.state}`;
          }
        } else {
          swDetails = 'No service worker registration found';
        }
      } catch (e: any) {
        swDetails = `Error checking registration: ${e.message}`;
      }
    }
    
    testResults.tests.push({
      name: 'Service Worker Registered',
      passed: swRegistered,
      details: swDetails,
      critical: true
    });
    
    // Test 6: Browser PWA support
    const supportsBeforeInstallPrompt = 'BeforeInstallPromptEvent' in window;
    testResults.tests.push({
      name: 'Browser PWA Installation Support',
      passed: supportsBeforeInstallPrompt,
      details: supportsBeforeInstallPrompt ? 'Supports beforeinstallprompt event' : 'Browser does not support PWA installation API',
      critical: false
    });
    
    // Test 7: Current display mode
    const isInBrowser = window.matchMedia('(display-mode: browser)').matches;
    testResults.tests.push({
      name: 'Running in Browser Mode (not already installed)',
      passed: isInBrowser,
      details: isInBrowser ? 'In browser mode - ready for installation' : 'Already in standalone/fullscreen mode (may be already installed)',
      critical: false
    });
    
    // Test 8: Chrome-specific checks
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
    const isLocalhost = window.location.hostname === 'localhost';
    
    if (isChrome) {
      // Chrome specific heuristic check
      const timeSinceFirstVisit = Date.now() - userEngagement.firstVisitTime;
      const minutesSinceFirstVisit = Math.floor(timeSinceFirstVisit / 60000);
      
      testResults.tests.push({
        name: 'Chrome User Engagement Heuristic',
        passed: userEngagement.clickCount >= 5 && minutesSinceFirstVisit >= 1,
        details: `Clicks: ${userEngagement.clickCount}/5+, Time: ${minutesSinceFirstVisit}min/1min+`,
        critical: false
      });
      
      if (isLocalhost) {
        testResults.recommendations.push('Chrome on localhost may have limited PWA support - try deploying to HTTPS for full testing');
      }
    }
    
    // Calculate overall result
    const criticalTests = testResults.tests.filter(test => test.critical);
    const passedCriticalTests = criticalTests.filter(test => test.passed);
    
    testResults.allPassed = passedCriticalTests.length === criticalTests.length;
    
    if (testResults.allPassed) {
      testResults.recommendations.push(
        'All critical PWA requirements met!',
        'Try clicking around the page more to satisfy Chrome engagement heuristic',
        'Refresh the page to trigger beforeinstallprompt event',
        'Check Chrome address bar for install icon (📱)'
      );
    } else {
      testResults.recommendations.push(
        'Fix critical issues first (marked in red)',
        'Ensure manifest.json is accessible and valid',
        'Check Service Worker registration in browser DevTools',
        'Use HTTPS or localhost for development'
      );
    }
    
    console.log('[PWA] Test Results:', testResults);
    return testResults;
  };

  // Function to increase user engagement (Chrome heuristic)
  const increaseUserEngagement = (type: 'click' | 'scroll' | 'visit' = 'click') => {
    setUserEngagement(prev => ({
      ...prev,
      clickCount: type === 'click' ? prev.clickCount + 1 : prev.clickCount,
      pageVisits: type === 'visit' ? prev.pageVisits + 1 : prev.pageVisits,
      lastInteraction: Date.now()
    }));
    
    // Log engagement for debugging
    if (type === 'click') {
      console.log(`[PWA] User engagement: ${userEngagement.clickCount + 1} clicks`);
    }
  };

  // Track user interactions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleUserInteraction = () => {
      increaseUserEngagement('click');
    };
    
    // Track clicks on document
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Initialize PWA and FCM
  useEffect(() => {
    // Global variable to capture beforeinstallprompt event if it fires before component mounts
    if (typeof window !== 'undefined') {
      (window as any).__luna_pwa_deferredPrompt = null;
      (window as any).__luna_pwa_captureBeforeInstallPrompt = (e: Event) => {
        console.log('[PWA] Global capture: beforeinstallprompt event', e);
        (window as any).__luna_pwa_deferredPrompt = e;
        e.preventDefault();
      };
      
      // Listen early to capture any early events
      window.addEventListener('beforeinstallprompt', (window as any).__luna_pwa_captureBeforeInstallPrompt);
    }

    const init = async () => {
      try {
        // Check if running as PWA
        const isPWA = isRunningAsPWA();
        console.log('[PWA] Running as PWA:', isPWA);
        
        // Check for early captured event
        if ((window as any).__luna_pwa_deferredPrompt) {
          console.log('[PWA] Found early captured beforeinstallprompt event');
          setDeferredPrompt((window as any).__luna_pwa_deferredPrompt);
        }
        
        // Register service worker with detailed logging
        console.log('[PWA] Starting service worker registration...');
        console.log('[PWA] Navigator supports serviceWorker:', 'serviceWorker' in navigator);
        
        if (!('serviceWorker' in navigator)) {
          console.warn('[PWA] Service Worker not supported by browser');
          // Don't show toast, just log warning
          setStatus(prev => ({ ...prev, swRegistered: false }));
          return; // Exit early if SW not supported
        } else {
          // Check existing registration first
          const existingReg = await navigator.serviceWorker.getRegistration();
          console.log('[PWA] Existing service worker registration:', existingReg);
          
          if (existingReg) {
            console.log('[PWA] Found existing service worker registration');
            console.log('[PWA] Active worker:', existingReg.active?.state);
            console.log('[PWA] Installing worker:', existingReg.installing?.state);
            console.log('[PWA] Waiting worker:', existingReg.waiting?.state);
          }
        }
        
        const registration = await registerServiceWorker();
        
        // Initialize FCM with error handling
        let fcmResult = {
          token: null as string | null,
          permission: Notification.permission as NotificationPermission,
          isSupported: true
        };
        let fcmUnsubscribe = () => {};

        try {
          fcmResult = await initializeFCM();
          
          // Listen for foreground FCM messages
          fcmUnsubscribe = listenForForegroundMessages((payload) => {
            console.log('[PWA] Foreground FCM message:', payload);
            toast({
              title: payload.notification?.title || 'New Message',
              description: payload.notification?.body || 'You have a new notification',
              variant: 'default'
            });
          });

          if (fcmResult.token) {
            console.log('[PWA] FCM initialized with token');
            toast({
              title: '🔔 Notifications Enabled',
              description: 'You will receive notifications for new messages and orders.',
              variant: 'default'
            });
          }
        } catch (fcmError) {
          console.warn('[PWA] FCM initialization failed (non-critical):', fcmError);
          // FCM failure is non-critical - PWA can still work without push notifications
        }

        // Check PWA installation criteria
        const isInBrowser = window.matchMedia('(display-mode: browser)').matches;
        const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
        const hasServiceWorker = 'serviceWorker' in navigator;
        const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        
        console.log('[PWA] Installation criteria:', {
          isPWA,
          isInBrowser,
          hasManifest,
          hasServiceWorker,
          isHTTPS,
          registration: !!registration
        });

        setStatus({
          isPWA,
          swRegistered: !!registration,
          notificationPermission: fcmResult.permission,
          fcmToken: fcmResult.token,
          isOnline: navigator.onLine,
          showInstallPrompt: !isPWA && isInBrowser && hasManifest && hasServiceWorker && isHTTPS
        });

        if (registration) {
          console.log('[PWA] Service Worker registered successfully');
        } else {
          console.warn('[PWA] Service Worker registration failed');
        }

        return () => fcmUnsubscribe();
      } catch (error) {
        console.error('[PWA] Initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event received', e);
      console.log('[PWA] Event type:', e.type);
      console.log('[PWA] Event details:', {
        platforms: (e as any).platforms,
        userChoice: (e as any).userChoice
      });
      
      e.preventDefault();
      setDeferredPrompt(e);
      setStatus(prev => ({ ...prev, showInstallPrompt: true }));
      
      console.log('[PWA] Deferred prompt set, showInstallPrompt: true');
      
      toast({
        title: 'PWA Available',
        description: 'You can install LUNA as a standalone app.',
        variant: 'default'
      });
    };

    // Listen for appinstalled event
    const handleAppInstalled = (e: Event) => {
      console.log('[PWA] App installed event:', e);
      setStatus(prev => ({ ...prev, isPWA: true, showInstallPrompt: false }));
      toast({
        title: '🎉 App Installed Successfully',
        description: 'LUNA has been installed to your home screen.',
        variant: 'default'
      });
    };

    // Listen for online/offline status
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);



  // Handle install button click
  const handleInstallClick = async () => {
    console.log('[PWA] === Install button clicked ===');
    console.log('[PWA] Deferred prompt available:', !!deferredPrompt);
    console.log('[PWA] Current status:', status);
    
    // Increase user engagement (important for Chrome heuristic)
    increaseUserEngagement('click');
    
    // Run full diagnostic
    const diagnostic = performPWADiagnostic();
    console.log('[PWA] Diagnostic result:', diagnostic);
    
    // Check if PWA is already installed
    if (diagnostic.isPWAInstalled || diagnostic.isStandalone) {
      console.log('[PWA] App already installed as PWA');
      toast({
        title: 'Already Installed',
        description: 'LUNA is already installed as a standalone app.',
        variant: 'default'
      });
      return;
    }
    
    // Special handling for Chrome on localhost
    const isChrome = diagnostic.browserName === 'Chrome';
    const isLocalhost = diagnostic.isLocalhost;
    
    if (!deferredPrompt) {
      console.warn('[PWA] No deferred prompt available, analyzing...');
      console.log('[PWA] Is Chrome on localhost:', isChrome && isLocalhost);
      
      // For Chrome on localhost, we can try to trigger manual installation
      if (isChrome && isLocalhost) {
        console.log('[PWA] Chrome on localhost detected. Trying manual installation flow.');
        
        // Check Chrome address bar for install icon
        const hasAddressBarInstallIcon = () => {
          // This is a heuristic - we can't actually detect the icon
          // But we can guide the user to look for it
          return diagnostic.hasManifest && diagnostic.hasServiceWorker && diagnostic.serviceWorkerRegistered;
        };
        
        if (hasAddressBarInstallIcon()) {
          console.log('[PWA] Chrome should show install icon in address bar');
          toast({
            title: 'Chrome Installation Guide',
            description: 'Look for the install icon (📱) in Chrome address bar, or click Chrome menu (⋮) → "Install LUNA".',
            variant: 'default',
            duration: 10000,
            action: (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowInstallGuide(true)}
              >
                View Detailed Guide
              </Button>
            )
          });
        } else {
          // Try to programmatically trigger installation in Chrome
          console.log('[PWA] Attempting to trigger Chrome PWA installation programmatically');
          
          // Method 1: Show install guide modal
          setShowInstallGuide(true);
          
          // Method 2: Provide clear instructions
          toast({
            title: 'Chrome PWA Installation',
            description: 'Chrome requires user interaction. Click around the page, then check address bar for install icon (📱).',
            variant: 'default',
            duration: 8000
          });
          
          // Method 3: Suggest page refresh (can help trigger events)
          setTimeout(() => {
            toast({
              title: 'Try Refreshing',
              description: 'Sometimes refreshing the page helps Chrome show the install prompt.',
              variant: 'default',
              duration: 6000
            });
          }, 3000);
        }
        
        return;
      }
      
      // For other browsers or environments, show detailed help
      console.log('[PWA] All requirements met but no prompt. Showing detailed help.');
      
      // Create detailed help message
      let helpTitle = 'How to Install LUNA';
      let helpDescription = '';
      
      if (isChrome) {
        helpDescription = `1. Click around the page to increase engagement
2. Look for install icon (📱) in Chrome address bar
3. Or click Chrome menu (⋮) → "Install LUNA"
4. Try refreshing the page and clicking more`;
      } else if (diagnostic.browserName === 'Safari') {
        helpDescription = `1. Tap Share button (□ with ↑ arrow)
2. Scroll down and tap "Add to Home Screen"
3. Name it "LUNA" and tap "Add"
4. Launch from home screen`;
      } else if (diagnostic.browserName === 'Firefox') {
        helpDescription = `1. Click Firefox menu (≡) 
2. Select "Install LUNA"
3. Or click address bar install icon if available`;
      } else if (diagnostic.browserName === 'Edge') {
        helpDescription = `1. Click Edge menu (⋯)
2. Go to "Apps" → "Install this site as an app"
3. Name it "LUNA" and install`;
      } else {
        helpDescription = `Use your browser's "Add to Home Screen" or "Install" feature. 
        Look for install icon in address bar or browser menu.`;
      }
      
      // Show detailed toast with installation steps
      toast({
        title: helpTitle,
        description: helpDescription,
        variant: 'default',
        duration: 15000,
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowInstallGuide(true)}
          >
            View Full Guide
          </Button>
        )
      });
      
      // Also log detailed instructions to console
      console.log('[PWA] Installation instructions:', helpDescription);
      console.log('[PWA] Full diagnostic data:', diagnostic);
      
      return;
    }

    try {
      console.log('[PWA] Showing install prompt');
      // Cast to any to access prompt method
      const installPrompt = deferredPrompt as any;
      
      if (typeof installPrompt.prompt !== 'function') {
        console.error('[PWA] prompt() method not available on deferredPrompt');
        toast({
          title: 'Installation Error',
          description: 'Installation prompt not available. Try manual installation from browser menu.',
          variant: 'destructive'
        });
        return;
      }
      
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      console.log('[PWA] User choice:', outcome);
      
      if (outcome === 'accepted') {
        setStatus(prev => ({ ...prev, showInstallPrompt: false }));
        toast({
          title: '🎉 App Installed',
          description: 'LUNA has been installed to your home screen.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Installation Cancelled',
          description: 'You can install LUNA later from your browser menu.',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      toast({
        title: 'Installation Failed',
        description: 'There was an error showing the installation prompt. Try manual installation.',
        variant: 'destructive'
      });
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Request notification permission
  const handleRequestNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        const fcmResult = await initializeFCM();
        setStatus(prev => ({
          ...prev,
          notificationPermission: permission,
          fcmToken: fcmResult.token
        }));
        
        toast({
          title: '🔔 Notifications Enabled',
          description: 'You will now receive notifications for new messages.',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Notifications Blocked',
          description: 'You can enable notifications in your browser settings.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[PWA] Failed to request notifications:', error);
      toast({
        title: 'Notification Setup Failed',
        description: 'There was an error setting up notifications. You can still use the app.',
        variant: 'destructive'
      });
    }
  };

  // Show offline indicator
  if (!status.isOnline && !isInitializing) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-black/90 backdrop-blur-sm border border-white/10 rounded-full">
          <WifiOff className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-white/70">Offline Mode</span>
          <Badge variant="outline" className="text-xs">Syncing when online</Badge>
        </div>
      </div>
    );
  }

  // Show install prompt for non-PWA users
  if (status.showInstallPrompt && !isInitializing) {
    // Check current PWA requirements for display
    const checkCurrentRequirements = () => {
      return {
        hasManifest: document.querySelector('link[rel="manifest"]') !== null,
        hasServiceWorker: 'serviceWorker' in navigator,
        isHTTPS: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        isInBrowser: window.matchMedia('(display-mode: browser)').matches,
        userAgent: navigator.userAgent.toLowerCase()
      };
    };
    
    const requirements = checkCurrentRequirements();
    const allRequirementsMet = requirements.hasManifest && 
                               requirements.hasServiceWorker && 
                               requirements.isHTTPS && 
                               requirements.isInBrowser &&
                               status.swRegistered;
    
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="glass-morphism p-4 rounded-2xl border border-white/10 shadow-2xl max-w-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">INSTALL MESSAGES SYSTEM</h3>
              <p className="text-sm text-white/60 mb-3">
                Get faster access, push notifications, and work offline.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {deferredPrompt ? (
                  // Auto-install available
                  <Button
                    size="sm"
                    onClick={handleInstallClick}
                    className="bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-[0_0_20px_rgba(255,0,255,0.5)]"
                  >
                    Install Now
                  </Button>
                ) : (
                  // Manual installation required
                  <Button
                    size="sm"
                    onClick={() => setShowInstallGuide(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  >
                    📱 Manual Installation
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Try to trigger installation anyway
                    handleInstallClick();
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Try Auto-Install
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    // Run comprehensive PWA installation test
                    toast({
                      title: 'Running PWA Test',
                      description: 'Testing all PWA installation requirements...',
                      variant: 'default'
                    });
                    
                    const testResults = await runPWAInstallationTest();
                    console.log('[PWA] Installation Test Results:', testResults);
                    
                    // Show results to user
                    toast({
                      title: testResults.allPassed ? '✅ PWA Ready!' : '⚠️ PWA Issues Found',
                      description: `Check console for detailed results`,
                      variant: testResults.allPassed ? 'default' : 'destructive',
                      duration: 10000,
                      action: (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const resultsText = JSON.stringify(testResults, null, 2);
                            navigator.clipboard.writeText(resultsText).then(() => {
                              toast({
                                title: 'Test Results Copied',
                                description: 'Detailed test results copied to clipboard',
                                variant: 'default'
                              });
                            });
                          }}
                        >
                          Copy Results
                        </Button>
                      )
                    });
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  🔍 Run PWA Test
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Refresh page to potentially trigger beforeinstallprompt
                    toast({
                      title: 'Refreshing Page',
                      description: 'Refreshing to try triggering PWA installation prompt...',
                      variant: 'default'
                    });
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  🔄 Refresh Page
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Run diagnostic and copy to clipboard
                    const diagnostic = performPWADiagnostic();
                    const diagnosticText = JSON.stringify(diagnostic, null, 2);
                    navigator.clipboard.writeText(diagnosticText).then(() => {
                      toast({
                        title: 'Diagnostic Copied',
                        description: 'PWA diagnostic data copied to clipboard. Check console for details.',
                        variant: 'default'
                      });
                    });
                    console.log('[PWA] Detailed diagnostic:', diagnostic);
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Copy Diagnostics
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus(prev => ({ ...prev, showInstallPrompt: false }))}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Later
                </Button>
              </div>
              
              {/* Requirements Status */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">PWA Status:</span>
                  <span className={`font-medium ${allRequirementsMet ? 'text-green-400' : 'text-yellow-400'}`}>
                    {allRequirementsMet ? 'Ready to install' : 'Requirements check'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${requirements.hasManifest ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-white/50">Manifest</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${requirements.hasServiceWorker ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-white/50">Service Worker</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${requirements.isHTTPS ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-white/50">HTTPS</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${requirements.isInBrowser ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-white/50">Browser Mode</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${status.swRegistered ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-white/50">SW Registered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${!status.isPWA ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <span className="text-white/50">{status.isPWA ? 'Installed' : 'Not Installed'}</span>
                  </div>
                </div>
                
                {/* Chrome on localhost specific advice */}
                {requirements.userAgent.includes('chrome') && requirements.isLocalhost && !deferredPrompt && (
                  <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-400 text-xs font-medium mb-1">Chrome on Localhost Detected</p>
                    <p className="text-yellow-500/80 text-[10px]">
                      Chrome may not show auto-install prompt on localhost. Try:
                      1. Click around the page more
                      2. Refresh the page
                      3. Use "Manual Installation" button
                      4. Check Chrome address bar for install icon (📱)
                    </p>
                  </div>
                )}
              </div>
              
              {/* Direct Chrome Debug Commands */}
              {requirements.userAgent.includes('chrome') && (
                <div className="border-t border-white/10 pt-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/40">Chrome Debug Commands:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary hover:text-primary/80"
                      onClick={() => {
                        const debugCode = `// Run in Chrome DevTools Console
console.log('[PWA Debug] Checking installation status...');
console.log('1. Manifest:', document.querySelector('link[rel="manifest"]'));
console.log('2. Service Worker:', navigator.serviceWorker?.controller);
console.log('3. Display Mode:', window.matchMedia('(display-mode: browser)').matches);
console.log('4. isSecure:', window.location.protocol === 'https:' || window.location.hostname === 'localhost');

// Try to trigger installation check
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then(reg => {
    console.log('5. SW Registration:', reg);
    console.log('6. SW Active:', reg?.active?.state);
    console.log('7. SW Scope:', reg?.scope);
  });
}

// Check manifest
fetch('/manifest.json')
  .then(r => r.json())
  .then(manifest => {
    console.log('8. Manifest loaded:', manifest.name);
    console.log('9. Manifest icons:', manifest.icons?.length);
  })
  .catch(e => console.log('8. Manifest error:', e));

// Try to manually trigger beforeinstallprompt
window.dispatchEvent(new Event('beforeinstallprompt'));
console.log('10. Manual event triggered');`;
                        
                        navigator.clipboard.writeText(debugCode).then(() => {
                          toast({
                            title: 'Debug Code Copied',
                            description: 'Paste in Chrome DevTools Console (F12)',
                            variant: 'default'
                          });
                        });
                      }}
                    >
                      Copy Debug Code
                    </Button>
                  </div>
                  <p className="text-white/60 text-xs mb-2">
                    Paste in Chrome DevTools (F12 → Console) to diagnose PWA issues
                  </p>
                </div>
              )}
              
              {/* Manual Installation Guide */}
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40">
                    {allRequirementsMet 
                      ? 'If installation fails:'
                      : 'Installation guide:'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary hover:text-primary/80"
                    onClick={() => window.open('https://web.dev/install-criteria/', '_blank')}
                  >
                    📚 Learn More
                  </Button>
                </div>
                
                <div className="space-y-2 text-xs">
                  {requirements.userAgent.includes('chrome') && (
                    <div className="text-white/60">
                      <span className="text-white">Chrome:</span> Click menu (⋮) → "Install LUNA" or address bar install icon 📱
                    </div>
                  )}
                  {requirements.userAgent.includes('firefox') && (
                    <div className="text-white/60">
                      <span className="text-white">Firefox:</span> Click menu (≡) → "Install LUNA"
                    </div>
                  )}
                  {requirements.userAgent.includes('safari') && (
                    <div className="text-white/60">
                      <span className="text-white">Safari:</span> Share (□ with ↑) → "Add to Home Screen"
                    </div>
                  )}
                  {requirements.userAgent.includes('edge') && (
                    <div className="text-white/60">
                      <span className="text-white">Edge:</span> Click menu (⋯) → "Apps" → "Install this site as an app"
                    </div>
                  )}
                  
                  {/* Video guide link */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-white/20 text-white hover:bg-white/10"
                      onClick={() => window.open('https://youtube.com/search?q=pwa+install+tutorial', '_blank')}
                    >
                      🎬 Watch Installation Tutorial
                    </Button>
                  </div>
                  
                  {/* Common issues */}
                  {!allRequirementsMet && (
                    <div className="bg-white/5 p-2 rounded-lg mt-2">
                      <p className="text-white/70 text-[10px] font-medium mb-1">Common Issues:</p>
                      <ul className="text-white/50 text-[10px] space-y-0.5">
                        {!requirements.isHTTPS && <li>• Use HTTPS or localhost for development</li>}
                        {!status.swRegistered && <li>• Allow Service Worker in browser settings</li>}
                        {!requirements.hasManifest && <li>• Check browser console for manifest errors</li>}
                        <li>• Visit site multiple times (Chrome heuristic)</li>
                        <li>• Clear site data and retry if previously dismissed</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show notification permission prompt
  if (status.notificationPermission === 'default' && !isInitializing) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
        <div className="glass-morphism p-4 rounded-2xl border border-white/10 shadow-2xl max-w-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Bell className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">Enable Notifications</h3>
              <p className="text-sm text-white/60 mb-3">
                Get instant alerts for new messages, orders, and updates.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRequestNotifications}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Enable
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus(prev => ({ ...prev, notificationPermission: 'denied' }))}
                >
                  Not Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Send test notification
  const sendTestNotification = async () => {
    try {
      const { sendPushNotification } = await import('@/lib/fcm');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const success = await sendPushNotification(
          user.uid,
          '🔔 LUNA Test Notification',
          'This is a test notification from the PWA system.',
          {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            type: 'test'
          }
        );
        
        if (success) {
          toast({
            title: 'Test Notification Sent',
            description: 'Check for a notification on your device.',
            variant: 'default'
          });
        }
      } else {
        toast({
          title: 'Not Logged In',
          description: 'Please log in to test notifications.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('[PWA] Failed to send test notification:', error);
      toast({
        title: 'Test Failed',
        description: 'Could not send test notification. Check console for errors.',
        variant: 'destructive'
      });
    }
  };

  // Debug panel (always show for debugging)
  if (!isInitializing) {
    // Determine if we should show detailed debug panel
    const isDevMode = process.env.NODE_ENV === 'development' || window.location.search.includes('debug=1');
    
    // Only show minimal debug panel in production unless debug flag is set
    if (!isDevMode && !window.location.search.includes('pwa-debug=1')) {
      return (
        <div className="fixed bottom-4 left-4 z-50 opacity-50 hover:opacity-100 transition-opacity">
          <div 
            className="glass-morphism p-2 rounded-xl border border-white/10 text-xs cursor-pointer hover:border-white/20"
            onClick={() => setShowDebugDetails(!showDebugDetails)}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                status.swRegistered ? "bg-green-500" : "bg-red-500"
              )} />
              <div className={cn(
                "w-2 h-2 rounded-full",
                status.notificationPermission === 'granted' ? "bg-green-500" : "bg-yellow-500"
              )} />
              <div className={cn(
                "w-2 h-2 rounded-full",
                status.isPWA ? "bg-green-500" : "bg-blue-500"
              )} />
              <span className="text-white/40 text-[10px]">PWA</span>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <div className="glass-morphism p-3 rounded-xl border border-white/10 shadow-lg max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                status.swRegistered ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-white/60 text-xs font-medium">PWA Debug</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDebugDetails(!showDebugDetails)}
              className="h-6 w-6 p-0 text-white/40 hover:text-white"
            >
              {showDebugDetails ? '−' : '+'}
            </Button>
          </div>
          
          {/* Quick status */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className={cn(
                "w-3 h-3 rounded-full mx-auto mb-1",
                status.swRegistered ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-white/50 text-[10px]">Service Worker</span>
            </div>
            <div className="text-center">
              <div className={cn(
                "w-3 h-3 rounded-full mx-auto mb-1",
                status.notificationPermission === 'granted' ? "bg-green-500" : 
                status.notificationPermission === 'denied' ? "bg-red-500" : "bg-yellow-500"
              )} />
              <span className="text-white/50 text-[10px]">Notifications</span>
            </div>
            <div className="text-center">
              <div className={cn(
                "w-3 h-3 rounded-full mx-auto mb-1",
                status.isPWA ? "bg-green-500" : "bg-blue-500"
              )} />
              <span className="text-white/50 text-[10px]">{status.isPWA ? 'Installed' : 'Browser'}</span>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-1 mb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={sendTestNotification}
              disabled={status.notificationPermission !== 'granted'}
              className="text-xs h-6 px-2 border-white/20 text-white hover:bg-white/10"
            >
              Test FCM
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const diagnostic = performPWADiagnostic();
                console.log('[PWA] Full diagnostic:', diagnostic);
                toast({
                  title: 'Diagnostic Logged',
                  description: 'Check browser console for full diagnostic data.',
                  variant: 'default'
                });
              }}
              className="text-xs h-6 px-2 border-white/20 text-white hover:bg-white/10"
            >
              Run Diag
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleInstallClick}
              className="text-xs h-6 px-2 border-white/20 text-white hover:bg-white/10"
            >
              Try Install
            </Button>
          </div>
          
          {/* Detailed debug info */}
          {showDebugDetails && (
            <div className="border-t border-white/10 pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-white/40">SW Registered:</div>
                <div className={cn(
                  "text-right",
                  status.swRegistered ? "text-green-400" : "text-red-400"
                )}>
                  {status.swRegistered ? 'Yes' : 'No'}
                </div>
                
                <div className="text-white/40">FCM Token:</div>
                <div className="text-right text-white/60 truncate">
                  {status.fcmToken ? `${status.fcmToken.substring(0, 10)}...` : 'None'}
                </div>
                
                <div className="text-white/40">Install Prompt:</div>
                <div className={cn(
                  "text-right",
                  status.showInstallPrompt ? "text-green-400" : "text-yellow-400"
                )}>
                  {status.showInstallPrompt ? 'Shown' : 'Hidden'}
                </div>
                
                <div className="text-white/40">Deferred Prompt:</div>
                <div className={cn(
                  "text-right",
                  deferredPrompt ? "text-green-400" : "text-red-400"
                )}>
                  {deferredPrompt ? 'Available' : 'Unavailable'}
                </div>
                
                <div className="text-white/40">Display Mode:</div>
                <div className="text-right text-white/60">
                  {window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 
                   window.matchMedia('(display-mode: minimal-ui)').matches ? 'Minimal UI' : 
                   window.matchMedia('(display-mode: fullscreen)').matches ? 'Fullscreen' : 'Browser'}
                </div>
                
                <div className="text-white/40">Online:</div>
                <div className={cn(
                  "text-right",
                  status.isOnline ? "text-green-400" : "text-red-400"
                )}>
                  {status.isOnline ? 'Yes' : 'No'}
                </div>
              </div>
              
              {/* Environment info */}
              <div className="text-xs">
                <div className="text-white/40 mb-1">Environment:</div>
                <div className="text-white/60 space-y-0.5">
                  <div className="truncate">NODE_ENV: {process.env.NODE_ENV}</div>
                  <div className="truncate">Protocol: {window.location.protocol}</div>
                  <div className="truncate">Host: {window.location.hostname}</div>
                </div>
              </div>
              
              {/* Quick links */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    window.open('chrome://serviceworker-internals', '_blank');
                  }}
                >
                  Chrome SW Internals
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show installation guide modal
  if (showInstallGuide) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-xl">
        <div className="min-h-screen p-4">
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              onClick={() => setShowInstallGuide(false)}
              className="text-white hover:bg-white/10"
            >
              Close Guide
            </Button>
          </div>
          <InstallationGuide />
        </div>
      </div>
    );
  }

  return null;
}