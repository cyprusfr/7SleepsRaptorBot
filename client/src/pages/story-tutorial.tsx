import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

// Create the bot logo as SVG since we can't import the image directly
const BotLogo = () => (
  <div className="w-32 h-32 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse">
    <div className="text-6xl">⚡</div>
  </div>
);

export default function StoryTutorial() {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  const sections = [
    {
      id: 0,
      content: (
        <div className="min-h-screen flex flex-col items-center justify-center text-center">
          <BotLogo />
          <h1 className="text-6xl font-bold text-white mb-4 mt-8">Bot</h1>
          <h2 className="text-4xl font-bold text-gray-300">How we did it</h2>
          <div className="mt-12 text-gray-400 animate-bounce">
            <p>Scroll down</p>
            <ChevronRight className="w-6 h-6 mx-auto mt-2 rotate-90" />
          </div>
        </div>
      )
    },
    {
      id: 1,
      content: (
        <div className="min-h-screen flex items-center justify-start px-16">
          <div className="max-w-2xl">
            <blockquote className="text-5xl font-bold text-white leading-relaxed">
              "They said it was impossible"
            </blockquote>
            <cite className="text-2xl text-gray-400 mt-4 block">-Nexus40</cite>
          </div>
        </div>
      )
    },
    {
      id: 2,
      content: (
        <div className="min-h-screen flex items-center justify-end px-16">
          <div className="max-w-2xl text-right">
            <blockquote className="text-5xl font-bold text-white leading-relaxed">
              "They said I couldn't do it"
            </blockquote>
            <cite className="text-2xl text-gray-400 mt-4 block">-Nexus41</cite>
          </div>
        </div>
      )
    },
    {
      id: 3,
      content: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <blockquote className="text-6xl font-bold text-white leading-relaxed">
              "But I proved them all wrong."
            </blockquote>
            <cite className="text-3xl text-gray-400 mt-6 block">-Nexus42</cite>
          </div>
        </div>
      )
    },
    {
      id: 4,
      content: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-8">Here's how I did it.</h2>
          </div>
        </div>
      )
    },
    {
      id: 5,
      content: (
        <div className="min-h-screen flex items-center justify-center px-8">
          <div className="max-w-6xl">
            <h3 className="text-4xl font-bold text-white mb-12 text-center">The Technical Journey</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-white mb-3">Discord Bot Architecture</h4>
                  <p className="text-gray-300 text-sm">
                    Built with Discord.js v14, implementing 60+ slash commands with real-time database integration and MacSploit API connectivity.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-white mb-3">Authentication System</h4>
                  <p className="text-gray-300 text-sm">
                    Dual OAuth implementation with Google and Discord, featuring secure session management and role-based access control.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-white mb-3">Database Design</h4>
                  <p className="text-gray-300 text-sm">
                    PostgreSQL with Drizzle ORM, comprehensive schemas for users, keys, activity logs, and real-time candy economy system.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-white mb-3">API Integration</h4>
                  <p className="text-gray-300 text-sm">
                    Real MacSploit API integration for license key generation, payment processing, and whitelist management with admin controls.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-white mb-3">Frontend Dashboard</h4>
                  <p className="text-gray-300 text-sm">
                    React-based interface with Shadcn UI, real-time data updates, responsive design, and comprehensive admin controls.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold text-white mb-3">Production System</h4>
                  <p className="text-gray-300 text-sm">
                    Complete deployment with backup systems, activity logging, candy economy, and comprehensive server management tools.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 6,
      content: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-8xl font-bold text-white mb-8">The End.</h2>
            <p className="text-4xl text-gray-400">-Alex</p>
          </div>
        </div>
      )
    },
    {
      id: 7,
      content: (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-8">Ready to explore the dashboard?</h3>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-xl"
              size="lg"
            >
              <ChevronRight className="w-6 h-6 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    if (!isAutoScrolling) return;

    const interval = setInterval(() => {
      setCurrentSection(prev => {
        if (prev >= sections.length - 1) {
          setIsAutoScrolling(false);
          return prev;
        }
        return prev + 1;
      });
    }, 4000); // 4 seconds per section

    return () => clearInterval(interval);
  }, [isAutoScrolling, sections.length]);

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (!isAutoScrolling) {
        e.preventDefault();
        if (e.deltaY > 0 && currentSection < sections.length - 1) {
          setCurrentSection(prev => prev + 1);
        } else if (e.deltaY < 0 && currentSection > 0) {
          setCurrentSection(prev => prev - 1);
        }
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        setIsAutoScrolling(false);
      }
    };

    window.addEventListener('wheel', handleScroll, { passive: false });
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentSection, isAutoScrolling, sections.length]);

  return (
    <div className="bg-black text-white font-sans overflow-hidden">
      {/* Fixed controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAutoScrolling(!isAutoScrolling)}
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          {isAutoScrolling ? 'Pause' : 'Auto'}
        </Button>
        <div className="text-sm text-gray-400 flex items-center">
          {currentSection + 1} / {sections.length}
        </div>
      </div>

      {/* Content container with smooth transitions */}
      <div 
        className="transition-transform duration-1000 ease-in-out"
        style={{
          transform: `translateY(-${currentSection * 100}vh)`,
        }}
      >
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`w-full h-screen transition-opacity duration-500 ${
              index === currentSection ? 'opacity-100' : 'opacity-30'
            }`}
          >
            {section.content}
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {sections.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index === currentSection ? 'bg-white' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}