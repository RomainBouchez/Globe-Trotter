import React, { useEffect, useState } from 'react';
import { City } from '../types';

interface DestinationChoiceUIProps {
    city: City;
    onAccept: () => void;
    onReject: () => void;
}

const DestinationChoiceUI: React.FC<DestinationChoiceUIProps> = ({ city, onAccept, onReject }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    const handleAction = (action: () => void) => {
        setVisible(false);
        setTimeout(action, 500);
    };

    return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden`} style={{ zIndex: 100 }}>
            {/* Title - Top Center */}
            <div className={`absolute top-8 left-0 w-full text-center transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
                <h2 className="text-5xl font-semibold" style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--text-primary)' }}>
                    {city.name}
                </h2>
            </div>

            {/* Image 1 - Left center */}
            {city.images?.[0] && (
                <div
                    className={`absolute left-[6%] top-[30%] rotate-[-6deg] transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}
                    style={{ background: 'var(--photo-frame)', padding: '8px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                >
                    <img src={city.images[0]} alt={city.name} className="max-w-[25vw] max-h-[45vh] rounded block" />
                </div>
            )}

            {/* Image 2 - Top Right */}
            {city.images?.[1] && (
                <div
                    className={`absolute right-[15%] top-[8%] rotate-[3deg] transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}
                    style={{ background: 'var(--photo-frame)', padding: '8px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                >
                    <img src={city.images[1]} alt={city.name} className="max-w-[22vw] max-h-[35vh] rounded block" />
                </div>
            )}

            {/* Image 3 - Bottom right */}
            {city.images?.[2] && (
                <div
                    className={`absolute right-[6%] bottom-[10%] rotate-[-3deg] transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}
                    style={{ background: 'var(--photo-frame)', padding: '8px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                >
                    <img src={city.images[2]} alt={city.name} className="max-w-[22vw] max-h-[35vh] rounded block" />
                </div>
            )}

            {/* PROPOSAL CARD - Only for Generic (New) Destinations */}
            {(city.type === 'generic' || city.type === 'bigben' || city.type === 'pyramid') ? (
                <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                    <div
                        className="p-7 rounded-2xl text-center max-w-2xl w-full"
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-dim)',
                            boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                        }}
                    >
                        <h3 className="text-2xl font-semibold mb-2 leading-tight" style={{ color: 'var(--text-primary)' }}>
                            On choisit <span style={{ color: 'var(--accent)' }}>{city.name}</span> pour notre prochain voyage ?
                        </h3>
                        <p className="mb-6 italic" style={{ color: 'var(--text-muted)' }}>Prêts pour le décollage ?</p>

                        <div className="flex gap-6 justify-center">
                            <button
                                onClick={() => handleAction(onReject)}
                                className="px-8 py-3 rounded-full font-medium border transition-all duration-[220ms] hover:scale-[1.02]"
                                style={{
                                    background: 'transparent',
                                    borderColor: 'var(--border-dim)',
                                    color: 'var(--text-muted)',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-dim)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                                Peut-être plus tard…
                            </button>
                            <button
                                onClick={() => handleAction(onAccept)}
                                className="px-10 py-3 rounded-full font-semibold transition-all duration-[220ms] hover:scale-[1.04] active:scale-[0.97]"
                                style={{
                                    background: 'var(--accent)',
                                    color: 'var(--accent-text)',
                                    boxShadow: '0 4px 24px var(--accent-dim)',
                                }}
                            >
                                Oui, on y va ✈
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                    <div
                        className="p-5 rounded-xl text-center max-w-xl"
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <p className="text-base italic leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            "{city.description}"
                        </p>
                        <div className="text-xs tracking-wide mt-3" style={{ color: 'var(--text-muted)' }}>
                            Souvenirs précieux
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DestinationChoiceUI;
