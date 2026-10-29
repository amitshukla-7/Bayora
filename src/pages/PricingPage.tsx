import React from 'react';
import { Sparkles, Check, Info } from 'lucide-react';
import type { PageId } from '../types';

interface PricingPageProps {
  onNavigate: (page: PageId) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const tiers = [
    {
      name: 'Starter',
      price: '$0',
      period: 'forever',
      description: 'Ideal for individual AI security researchers and open source model evaluation.',
      features: [
        'Up to 3 local model adapters',
        'Quick Demo preset scenarios',
        'Core prompt injection & jailbreak checks',
        'Local SQLite audit ledger',
        'Community documentation'
      ],
      buttonText: 'Current Plan',
      isPopular: false
    },
    {
      name: 'Pro Security',
      price: '$490',
      period: 'per month',
      description: 'For growing AI engineering teams requiring continuous red teaming and compliance monitoring.',
      features: [
        'Unlimited registered models',
        'All 7 Red Team preset scenarios',
        'All 9 attack surface categories',
        'Automated CI/CD security pipelines',
        'SHA-256 cryptographic evidence exports',
        'Priority AI Assistant Copilot'
      ],
      buttonText: 'Coming Soon',
      isPopular: true
    },
    {
      name: 'Enterprise Shield',
      price: 'Custom',
      period: 'annual contract',
      description: 'Dedicated air-gapped security platform with custom guardrails and regulatory compliance assurance.',
      features: [
        'Dedicated on-premise or VPC cluster',
        'Custom proprietary attack datasets',
        'EU AI Act & NIST AI RMF compliance reports',
        'Custom defense guardrail integrations',
        '24/7 dedicated security engineering support',
        'Enterprise SLA & custom legal guarantees'
      ],
      buttonText: 'Contact Security Team',
      isPopular: false
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4efff] border border-[#e5d9fd] text-[#7952D8] text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Plans & Pricing — Coming Soon</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Calm, Transparent Enterprise Safety Plans
        </h1>

        <p className="text-sm text-slate-500 leading-relaxed font-normal">
          Evaluate, secure, and govern your production AI models at scale. Workspace subscriptions and automated billing will be introduced in future releases.
        </p>
      </div>

      {/* Prototype Notice Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            <strong>Local Interactive Prototype:</strong> Billing is not enabled in this prototype. All core features, models, datasets, and red team evaluations remain 100% free and functional offline.
          </span>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`bayora-card p-6 flex flex-col justify-between space-y-6 relative ${
              tier.isPopular ? 'border-2 border-[#9B7DE8] shadow-lg ring-2 ring-[#9B7DE8]/10 bg-white' : ''
            }`}
          >
            {tier.isPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#9B7DE8] text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                Most Popular
              </span>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{tier.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tier.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">{tier.price}</span>
                <span className="text-xs text-slate-400">/{tier.period}</span>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                  What's Included:
                </span>
                <ul className="space-y-2 text-xs text-slate-600">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => onNavigate('dashboard')}
              className={`w-full py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                tier.isPopular
                  ? 'bayora-btn-primary'
                  : 'bayora-btn-secondary'
              }`}
            >
              {tier.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
