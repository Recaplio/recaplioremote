import Link from 'next/link';

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={`w-5 h-5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const MinusIcon = ({ className }: { className?: string }) => (
    <svg className={`w-5 h-5 ${className}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const plansData = [
  {
    name: "Free",
    price: "$0",
    priceDetails: "/ forever",
    description: "Dip your toes into intelligent reading.",
    features: [
      { text: "1 book in library at a time", included: true },
      { text: "Basic summaries", included: true },
      { text: "Basic Q&A with AI", included: true },
      { text: "Enhanced Reading Analytics", included: false },
      { text: "Customizable Reader Themes", included: false },
      { text: "Ad-free Experience", included: false },
      { text: "10 books in library", included: false },
      { text: "Knowledge Map", included: false },
      { text: "Timeline & Flow Mode", included: false },
      { text: "Flashcards & Advanced Study Tools", included: false },
      { text: "Summary Exports (PDF, .doc, etc.)", included: false },
      { text: "Top Tier AI (GPT-4.5 Level)", included: false },
      { text: "Priority Support", included: false },
      { text: "Early Access to Beta Features", included: false },
      { text: "AI Memory Extension", included: false },
    ],
    cta: "Continue with Free",
    ctaLink: "/", 
    isCurrent: true, // Example
  },
  {
    name: "Premium", // New Mid-tier
    price: "$2.99",
    priceDetails: "/ month",
    description: "For consistent readers seeking more insights.",
    features: [
      { text: "10 books in library", included: true },
      { text: "Advanced summaries", included: true },
      { text: "Advanced Q&A with AI", included: true },
      { text: "Enhanced Reading Analytics", included: true },
      { text: "Customizable Reader Themes", included: true },
      { text: "Ad-free Experience", included: true },
      { text: "Knowledge Map", included: false },
      { text: "Timeline & Flow Mode", included: false },
      { text: "Flashcards & Advanced Study Tools", included: false },
      { text: "Summary Exports (PDF, .doc, etc.)", included: false },
      { text: "Top Tier AI (GPT-4.5 Level)", included: false },
      { text: "Priority Support", included: false },
      { text: "Early Access to Beta Features", included: false },
      { text: "AI Memory Extension", included: false },
    ],
    cta: "Upgrade to Premium",
    ctaLink: "#", 
    isCurrent: false,
    highlight: true, // Highlight this new mid-tier
  },
  {
    name: "Pro", // New Top-tier
    price: "$9.99",
    priceDetails: "/ month",
    description: "The ultimate Recaplio experience for power users.",
    features: [
      { text: "Unlimited books in library", included: true },
      { text: "Professional-grade summaries", included: true },
      { text: "Professional-grade Q&A with AI", included: true },
      { text: "Enhanced Reading Analytics", included: true },
      { text: "Customizable Reader Themes", included: true },
      { text: "Ad-free Experience", included: true },
      { text: "Knowledge Map", included: true },
      { text: "Timeline & Flow Mode", included: true },
      { text: "Flashcards & Advanced Study Tools", included: true },
      { text: "Summary Exports (PDF, .doc, etc.)", included: true },
      { text: "Top Tier AI (GPT-4.5 Level)", included: true },
      { text: "Priority Support", included: true },
      { text: "Early Access to Beta Features", included: true },
      { text: "AI Memory Extension", included: true },
    ],
    cta: "Go Pro",
    ctaLink: "#", 
    isCurrent: false,
  },
];

export default function PlansPage() {
  return (
    <div className="bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose Your Recaplio Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Unlock features that match your reading and learning style.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plansData.map((plan) => (
            <div 
              key={plan.name} 
              className={`bg-white rounded-xl shadow-xl p-8 flex flex-col ${plan.highlight ? 'border-4 border-indigo-500' : 'border border-gray-200'}`}
            >
              <h2 className="text-2xl font-semibold text-gray-900">{plan.name}</h2>
              <p className="mt-1 text-gray-500 min-h-[3rem]">{plan.description}</p> {/* min-h for consistent description height */}
              <div className="mt-4 mb-6">
                <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                <span className="text-lg font-medium text-gray-500">{plan.priceDetails}</span>
              </div>
              
              <ul className="space-y-3 mb-8 text-sm text-gray-600 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    {feature.included ? 
                        <CheckIcon className="text-green-500 mr-2 mt-0.5 flex-shrink-0" /> : 
                        <MinusIcon className="text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    }
                    <span className={`${!feature.included ? 'text-gray-400' : ''} leading-tight`}>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.ctaLink} passHref>
                <button 
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-colors duration-150 
                    ${plan.isCurrent ? 'bg-gray-200 text-gray-700 cursor-default' : 
                    (plan.highlight ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md')}
                    `}
                    disabled={plan.isCurrent}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-gray-500">
            All prices are in USD. You can upgrade, downgrade, or cancel anytime.
        </p>
      </div>
    </div>
  );
} 