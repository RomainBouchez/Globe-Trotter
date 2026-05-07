import React, { useEffect, useState } from 'react';
import { SubCity } from '../types';

interface SubCityPickerProps {
  countryName: string;
  subCities: SubCity[];
  onSelect: (subCity: SubCity) => void;
}

const SubCityPicker: React.FC<SubCityPickerProps> = ({ countryName, subCities, onSelect }) => {
  const [visible, setVisible] = useState(false);
  // API-fetched first photo per sub-city: { [subCityName]: url }
  const [apiPreviews, setApiPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Fetch first photo for each sub-city
  useEffect(() => {
    subCities.forEach(async (sc) => {
      try {
        const res = await fetch(`/api/photos/${encodeURIComponent(sc.name)}`);
        const data = await res.json();
        if (data.photos?.length) {
          const pick = data.photos.find((p: any) => p.isPreview) ?? data.photos[0];
          setApiPreviews(prev => ({ ...prev, [sc.name]: pick.url }));
        }
      } catch {
        // No photos yet — placeholder shown
      }
    });
  }, [subCities]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col items-center justify-center" style={{ zIndex: 100 }}>
      {/* Country title */}
      <div className={`transition-all duration-700 delay-100 mb-8 text-center ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}`}>
        <h2 className="text-5xl font-semibold" style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--text-primary)' }}>
          {countryName}
        </h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Choisis une ville</p>
      </div>

      {/* City cards */}
      <div className="pointer-events-auto flex flex-wrap gap-4 justify-center px-8 max-w-3xl">
        {subCities.map((city, i) => {
          const preview = apiPreviews[city.name] ?? city.images?.[0];
          return (
            <button
              key={city.name}
              onClick={() => onSelect(city)}
              className="flex flex-col rounded-2xl overflow-hidden transition-all duration-700 hover:scale-[1.03] active:scale-[0.98] text-left"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                width: '180px',
                transitionDelay: `${150 + i * 80}ms`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-dim)'; }}
            >
              {/* Photo preview */}
              <div className="w-full h-[120px] overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
                {preview ? (
                  <img
                    src={preview}
                    alt={city.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-faint)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* City info */}
              <div className="p-3">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Fredoka, sans-serif' }}>
                  {city.name}
                </p>
                {city.description && (
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                    {city.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubCityPicker;
