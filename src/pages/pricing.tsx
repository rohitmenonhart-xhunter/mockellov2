import { motion } from 'framer-motion';
import Link from 'next/link';
import Footer from '../components/Footer';
import SEO from '../components/shared/SEO';

export default function PricingPage() {
  return (
    <>
      <SEO 
        title="Pricing Plans"
        description="Choose from our flexible pricing plans for Mockello's AI-powered candidate evaluation platform. From startups to enterprises, find the perfect plan for your recruitment needs."
        keywords="mockello pricing, AI interview pricing, recruitment platform cost, candidate evaluation plans, HR tech pricing"
      />

      <main className="bg-black min-h-screen text-white overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#BE185D_0%,_transparent_25%)] opacity-20 animate-pulse"></div>
          <div className="absolute inset-0 bg-black bg-opacity-90"></div>
        </div>

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-[#BE185D]/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">Mockello</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="relative pt-32 px-4">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#BE185D] to-white">
                Pricing Plans
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Choose the perfect plan for your recruitment needs
              </p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {[
                {
                  name: "Starter",
                  description: "Perfect for small businesses",
                  features: [
                    "15 pre-interviews",
                    "Candidate evaluation",
                    "5 students per session",
                    "Email support"
                  ],
                  formLink: "https://forms.gle/gS8nJnyf2Yip436G8"
                },
                {
                  name: "Pro",
                  description: "Ideal for growing companies",
                  features: [
                    "30 pre-interviews",
                    "Advanced candidate evaluation",
                    "5 students per session",
                    "Priority support"
                  ],
                  popular: true,
                  formLink: "https://forms.gle/gS8nJnyf2Yip436G8"
                },
                {
                  name: "Pro Plus",
                  description: "For medium organizations",
                  features: [
                    "40 pre-interviews",
                    "Advanced candidate evaluation",
                    "10 students per session",
                    "24/7 priority support"
                  ],
                  formLink: "https://forms.gle/gS8nJnyf2Yip436G8"
                },
                {
                  name: "Custom",
                  description: "For large organizations",
                  features: [
                    "50+ pre-interviews",
                    "Enterprise-grade evaluation",
                    "15+ students per session",
                    "Dedicated support",
                    "Custom integration"
                  ],
                  formLink: "https://forms.gle/gS8nJnyf2Yip436G8"
                }
              ].map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative bg-gradient-to-br from-gray-900/50 to-[#BE185D]/5 p-8 rounded-2xl border ${plan.popular ? 'border-[#BE185D]' : 'border-[#BE185D]/20'} backdrop-blur-sm`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#BE185D] text-white px-4 py-1 rounded-full text-sm">
                      Most Popular
                    </div>
                  )}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                    <div className="text-xl font-bold text-[#BE185D] mb-2">Contact Us</div>
                    <p className="text-gray-300 mt-4">{plan.description}</p>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-gray-300">
                        <span className="text-[#BE185D] mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="text-center">
                    <a
                      href={plan.formLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center px-6 py-3 font-semibold rounded-full transition-all duration-300 ${
                        plan.popular
                          ? 'bg-gradient-to-r from-[#BE185D] to-[#BE185D]/80 text-white hover:shadow-[0_0_30px_-5px_#BE185D]'
                          : 'border border-[#BE185D] text-[#BE185D] hover:bg-[#BE185D] hover:text-white'
                      }`}
                    >
                      Get Started
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
} 