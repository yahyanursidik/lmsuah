import React, { useEffect, useState } from 'react';
import { BookOpen, PenTool, Map, HeartHandshake } from 'lucide-react';

export const KnowledgeJourney: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2500); // Change step every 2.5 seconds
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      id: 0,
      title: "Ilmu Berawal dari Niat",
      description: "Menghadirkan keikhlasan hanya untuk Allah Ta'ala semata.",
      icon: BookOpen,
      color: "text-emerald-100",
      bg: "bg-emerald-700",
      border: "border-emerald-600"
    },
    {
      id: 1,
      title: "Ilmu Ditulis",
      description: "Mencatat setiap faidah agar ilmu terikat erat di dalam ingatan.",
      icon: PenTool,
      color: "text-amber-100",
      bg: "bg-amber-600",
      border: "border-amber-500"
    },
    {
      id: 2,
      title: "Perjalanan Menuntut Ilmu",
      description: "Menempuh jalan panjang, bersabar di majelis-majelis para asatidzah.",
      icon: Map,
      color: "text-blue-100",
      bg: "bg-blue-600",
      border: "border-blue-500"
    },
    {
      id: 3,
      title: "Berupaya Diamalkan",
      description: "Buah dari ilmu adalah amal shalih dan akhlak yang mulia.",
      icon: HeartHandshake,
      color: "text-rose-100",
      bg: "bg-rose-600",
      border: "border-rose-500"
    }
  ];

  return (
    <section className="bg-white border-y border-stone-200">
      <div className="relative w-full max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 mb-4">
            Perjalanan Thalibul 'Ilmi
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Tiga Fase Menuntut Ilmu
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            "Barangsiapa menempuh suatu jalan untuk mencari ilmu, maka Allah akan mudahkan baginya jalan menuju Surga."
          </p>
        </div>

        <div className="relative flex flex-col md:flex-row items-start justify-between gap-12 md:gap-4 mt-12">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-1.5 bg-stone-100 rounded-full z-0 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000 ease-in-out" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === idx;
            const isPast = step > idx;

            return (
              <div 
                key={s.id} 
                className="relative z-10 flex flex-col items-center group w-full md:w-1/4 cursor-pointer"
                onClick={() => setStep(idx)}
              >
                {/* Icon Circle */}
                <div 
                  className={`
                    relative flex items-center justify-center w-20 h-20 rounded-full border-4 shadow-sm transition-all duration-700 ease-out
                    ${isActive ? `${s.bg} ${s.border} scale-110 shadow-xl` : isPast ? 'bg-emerald-500 border-emerald-400 scale-100' : 'bg-white border-stone-200 scale-90 hover:border-stone-300'}
                  `}
                >
                  <Icon 
                    className={`w-8 h-8 transition-colors duration-500 ${isActive ? s.color : isPast ? 'text-white' : 'text-stone-400 group-hover:text-stone-500'}`} 
                  />
                  
                  {/* Ping animation for active step */}
                  {isActive && (
                    <span className={`absolute inset-0 rounded-full animate-ping opacity-30 ${s.bg}`} />
                  )}
                </div>

                {/* Text Content */}
                <div className={`mt-6 text-center px-2 transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-2 group-hover:opacity-100'}`}>
                  <h3 className={`text-base font-bold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                    {s.title}
                  </h3>
                  <p className={`mt-2 text-sm leading-relaxed ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
