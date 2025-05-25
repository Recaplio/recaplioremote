'use client'; // If we add any client-side interactions later, like smooth scroll

import Link from 'next/link';
import {
  ArrowRightIcon,
  BookOpenIcon,
  LightBulbIcon,
  SparklesIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon, // Using ShareIcon for knowledge maps, can be changed if a more specific one is found
  PuzzlePieceIcon,
  DocumentPlusIcon,
  CursorArrowRippleIcon,
  MagnifyingGlassCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'; // Primarily using outline icons for a cleaner look
import { useAuth } from '@/app/components/auth/AuthProvider'; // Added useAuth import

// Placeholder for a more elaborate icon or illustration component
const ReadingIllustration = () => (
  <div className="relative aspect-[4/3] max-w-xl lg:max-w-none group">
    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-300 to-blue-300 opacity-20 rounded-3xl transform -rotate-3 group-hover:rotate-0 group-hover:scale-105 transition-transform duration-300 ease-in-out"></div>
    <div className="relative bg-white p-6 sm:p-8 rounded-2xl shadow-xl transform rotate-1 group-hover:rotate-0 group-hover:scale-105 transition-transform duration-300 ease-in-out">
        <BookOpenIcon className="w-3/4 h-3/4 mx-auto text-indigo-500 opacity-70" />
        <div className="absolute bottom-4 right-4 bg-indigo-600 p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform duration-200 ease-in-out">
            <LightBulbIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
         <div className="absolute top-4 left-4 bg-green-500 p-2 rounded-full shadow-lg transform group-hover:scale-110 transition-transform duration-200 ease-in-out">
            <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
    </div>
  </div>
);

// Updated Placeholder for Feature Spotlight Visuals
const FeatureVisualPlaceholder = ({ title, icon: Icon, iconBgColor = 'bg-indigo-500', bgColorClass = 'bg-slate-100' }: { title: string, icon: React.ElementType, iconBgColor?: string, bgColorClass?: string }) => (
  <div className={`relative aspect-video ${bgColorClass} rounded-xl shadow-lg flex flex-col items-center justify-center p-8 transform transition-all duration-300 hover:shadow-2xl group overflow-hidden`}>
    <div className={`absolute -top-8 -right-8 w-32 h-32 ${iconBgColor} opacity-20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 ease-in-out`}></div>
    <div className={`p-4 sm:p-5 rounded-full ${iconBgColor} text-white mb-4 sm:mb-6 shadow-md group-hover:scale-110 transition-transform duration-300 ease-in-out`}>
      <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
    </div>
    <p className="text-slate-700 text-base sm:text-lg font-semibold text-center">{title}</p>
    <p className="text-xs text-slate-500 mt-1">Visual Representation</p>
  </div>
);

// Placeholder for a testimonial avatar (can stay simple)
const AvatarPlaceholder = ({ initial }: { initial: string }) => (
  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-lg shadow-md ring-2 ring-white">
    {initial}
  </div>
);

export default function HomePage() {
  const { session } = useAuth(); // Get session state
  const features = [
    {
      name: 'AI-Powered Summaries & Q&A',
      description: 'Get concise summaries of chapters or entire books, and ask clarifying questions to deepen your understanding, tailored for fiction and non-fiction.',
      icon: ChatBubbleLeftRightIcon,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Interactive Knowledge Maps',
      description: 'Visualize connections between concepts, characters, and themes with dynamic, auto-generated maps that link directly to text passages.',
      icon: ShareIcon,
      iconColor: 'text-sky-500',
      bgColor: 'bg-sky-50'
    },
    {
      name: 'Personalized Study Tools',
      description: 'Create flashcards from highlights, generate quizzes, and recap your learning to solidify knowledge and prepare for exams.',
      icon: PuzzlePieceIcon,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50'
    },
     {
      name: 'Focus on Understanding',
      description: 'Recaplio helps you actively engage with texts, identify key takeaways, and build lasting knowledge, making every reading session more productive.',
      icon: AcademicCapIcon, 
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50'
    },
  ];
  const howItWorksSteps = [
    {
      id: 1,
      name: 'Add Your Book',
      description: 'Easily upload your PDFs and EPUBs, or search and add classic titles from Project Gutenberg to build your personal library.',
      icon: DocumentPlusIcon,
    },
    {
      id: 2,
      name: 'Read & Interact Intelligently',
      description: 'Engage with your texts using our AI assistant for summaries and Q&A, highlight key passages, and make annotations as you read.',
      icon: CursorArrowRippleIcon,
    },
    {
      id: 3,
      name: 'Unlock & Retain Knowledge',
      description: 'Transform your reading into learning with concept maps, timelines, flashcards, quizzes, and insightful recaps, all designed to boost retention.',
      icon: MagnifyingGlassCircleIcon,
    },
  ];

  return (
    <div className="bg-white text-gray-800 overflow-x-hidden antialiased">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 bg-gradient-to-br from-indigo-50 via-white to-sky-50 overflow-hidden">
        <div className="absolute inset-0 opacity-50 mix-blend-multiply">
          {/* Subtle pattern or blurred shapes could be added here if desired */}
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-gray-900 leading-tight">
                Unlock Deeper Understanding from
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-500 to-green-500 mt-1 sm:mt-2">Every Book You Read.</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Recaplio is your intelligent reading companion, transforming your reading into active learning with AI-powered summaries, interactive knowledge maps, and personalized study tools.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-5">
                <Link
                  href={session ? "/discover" : "/signup"}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 sm:px-8 sm:py-4 border border-transparent text-base font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  {session ? "Discover New Books" : "Get Started for Free"}
                  <ArrowRightIcon className="ml-2.5 h-5 w-5" />
                </Link>
                <Link
                  href="/#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 sm:px-8 sm:py-4 border border-indigo-200 text-base font-semibold rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex justify-center items-center mt-8 lg:mt-0">
              <ReadingIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview Section */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-indigo-600 font-semibold tracking-wide uppercase">Why Recaplio?</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900 sm:leading-tight">
              Elevate Your Reading Experience
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Recaplio isn&apos;t just another e-reader. It&apos;s a powerful suite of tools designed to help you learn more effectively from what you read.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.name} className={`p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ${feature.bgColor} group`}>
                <div className={`flex items-center justify-center h-12 w-12 rounded-lg ${feature.iconColor} ${feature.bgColor.replace('bg-','bg-opacity-50')} mb-5 ring-2 ring-inset ring-current group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`h-7 w-7 ${feature.iconColor}`} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1.5">{feature.name}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Spotlight: AI Assistant */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <FeatureVisualPlaceholder title="AI Assistant in Action" icon={ChatBubbleLeftRightIcon} iconBgColor="bg-indigo-500" bgColorClass="bg-indigo-100" />
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-block px-3.5 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-full mb-4">Intelligent Guidance</span>
              <h3 className="text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900 mb-5">
                Your AI Reading Partner
              </h3>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Navigate complex texts with ease. Our AI assistant, with distinct modes for fiction and non-fiction, helps you summarize chapters, define terms, explore themes, and understand intricate arguments, all within your reading flow.
              </p>
              <ul className="space-y-3.5 text-gray-700">
                <li className="flex items-start">
                  <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-green-500 mr-2.5 mt-0.5" />
                  <span>Contextual summaries and Q&A.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-green-500 mr-2.5 mt-0.5" />
                  <span>Toggle between Fiction & Non-Fiction modes for tailored insights.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-green-500 mr-2.5 mt-0.5" />
                  <span>Reduces reading friction and boosts comprehension.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Spotlight: Knowledge Maps */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-1 lg:order-1">
               <span className="inline-block px-3.5 py-1.5 text-sm font-semibold text-sky-700 bg-sky-100 rounded-full mb-4">Visualize Connections</span>
              <h3 className="text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900 mb-5">
                See the Bigger Picture with Knowledge Maps
              </h3>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Don&apos;t just read words, understand relationships. Recaplio automatically generates interactive knowledge maps that visually connect characters, concepts, arguments, and themes, helping you grasp complex structures at a glance.
              </p>
              <ul className="space-y-3.5 text-gray-700">
                <li className="flex items-start">
                  <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-green-500 mr-2.5 mt-0.5" />
                  <span>Auto-generated visual networks of ideas.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-green-500 mr-2.5 mt-0.5" />
                  <span>Clickable nodes linking directly to text.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-green-500 mr-2.5 mt-0.5" />
                  <span>Ideal for both fiction (character/plot) and non-fiction (arguments/concepts).</span>
                </li>
              </ul>
            </div>
            <div className="order-2 lg:order-2">
              <FeatureVisualPlaceholder title="Interactive Knowledge Map" icon={ShareIcon} iconBgColor="bg-sky-500" bgColorClass="bg-sky-100" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
             <span className="text-indigo-600 font-semibold tracking-wide uppercase">Get Started</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900 sm:leading-tight">
              Simple Steps to Smarter Reading
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Getting started with Recaplio is quick and easy. Transform your reading habits in just a few clicks.
            </p>
          </div>
          <div className="relative max-w-5xl mx-auto">
            {/* Decorative line connecting step icons - for medium screens and up */}
            <div className="hidden md:block absolute top-8 left-1/2 right-0 h-0.5 bg-gradient-to-r from-indigo-200 via-sky-200 to-transparent w-full" style={{ transform: 'translateX(-25%)', width: 'calc(50% - 4rem)' }}></div>
            <div className="hidden md:block absolute top-8 right-1/2 left-0 h-0.5 bg-gradient-to-l from-indigo-200 via-sky-200 to-transparent w-full" style={{ transform: 'translateX(25%)', width: 'calc(50% - 4rem)' }}></div>

            <div className="grid md:grid-cols-3 gap-x-8 gap-y-16 md:gap-y-12 relative">
              {howItWorksSteps.map((step, index) => (
                <div key={step.id} className="relative flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 group">
                  <div className="absolute -top-7 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg ring-4 ring-slate-50 group-hover:scale-110 transition-transform">
                       <step.icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="mt-10 text-xl font-semibold text-gray-900">Step {index + 1}: {step.name}</h3>
                  <p className="mt-2.5 text-sm text-gray-600 leading-relaxed flex-grow">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Social Proof / Testimonial Placeholder Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-indigo-600 font-semibold tracking-wide uppercase">Don&apos;t Just Take Our Word</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900 sm:leading-tight">
              Loved by Readers & Learners Like You
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              See what others are saying about how Recaplio has transformed their reading.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((testimonialId) => (
              <div key={testimonialId} className="bg-slate-50/70 p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <SparklesIcon className="w-7 h-7 text-amber-400 mb-3" /> {/* Decorative icon */}
                <p className="text-gray-700 leading-relaxed mb-6 flex-grow">
                  &quot;This is a placeholder testimonial. Recaplio has genuinely changed the way I approach complex texts. The AI summaries and concept maps are game-changers! Highly recommended for students and lifelong learners.&quot;
                </p>
                <div className="flex items-center mt-auto pt-4 border-t border-slate-200">
                  <AvatarPlaceholder initial={['A','B','C'][testimonialId-1]} />
                  <div className="ml-4">
                    <p className="font-semibold text-gray-900">User Name {testimonialId}</p>
                    <p className="text-sm text-gray-500">Student / Avid Reader</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-indigo-600 via-sky-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SparklesIcon className="w-10 h-10 text-amber-300 mx-auto mb-4"/>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter mb-5">
            Ready to Supercharge Your Reading?
          </h2>
          <p className="text-lg sm:text-xl text-indigo-100 max-w-3xl mx-auto mb-10 leading-relaxed">
            Recaplio offers a range of plans to suit your needs, from casual readers to dedicated learners. Explore our features and find the perfect fit to unlock your full reading potential.
          </p>
          <Link
            href="/plans"
            className="inline-block px-10 py-4 border-2 border-white text-base sm:text-lg font-semibold rounded-lg hover:bg-white hover:text-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl"
          >
            Explore Our Plans & Features
          </Link>
        </div>
      </section>

      {/* Final Call to Action Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AcademicCapIcon className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-gray-900 mb-4">
            Transform Your Reading Today
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto mb-10 leading-relaxed">
            Join Recaplio and start understanding more from every book you open. {session ? "Continue exploring or manage your library." : "It's free to get started and explore the core features!"}
          </p>
          <Link
            href={session ? "/library" : "/signup"}
            className="inline-flex items-center justify-center px-8 py-4 sm:px-10 sm:py-4 border border-transparent text-base sm:text-lg font-semibold rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            {session ? "Go to Your Library" : "Sign Up for Free Now"}
            <ArrowRightIcon className="ml-3 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
