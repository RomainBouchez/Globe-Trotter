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
                <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                    {city.name}
                </h2>
            </div>

            {/* Photos Layout - Scattered background photos */}

            {/* Image 1 - Left */}
            {city.images?.[0] && (
                <div className={`absolute left-[15%] top-1/2 -translate-y-1/2 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20 shadow-2xl rotate-[-6deg] transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}>
                    <img src={city.images[0]} alt={city.name} className="max-w-96 max-h-80 rounded block" />
                </div>
            )}

            {/* Image 2 - Right Top */}
            {city.images?.[1] && (
                <div className={`absolute right-[15%] top-32 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20 shadow-2xl rotate-[3deg] transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}>
                    <img src={city.images[1]} alt={city.name} className="max-w-80 max-h-72 rounded block" />
                </div>
            )}

            {/* Image 3 - Right Bottom */}
            {city.images?.[2] && (
                <div className={`absolute right-[20%] bottom-24 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20 shadow-2xl rotate-[-3deg] transition-all duration-700 delay-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                    <img src={city.images[2]} alt={city.name} className="max-w-80 max-h-72 rounded block" />
                </div>
            )}

            {/* PROPOSAL CARD - Only for Generic (New) Destinations */}
            {(city.type === 'generic' || city.type === 'bigben' || city.type === 'pyramid') ? (
                <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                    <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] text-center max-w-2xl w-full">
                        <h3 className="text-3xl font-bold text-white mb-2 leading-tight">
                            Do you want to choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">{city.name}</span> for our next trip together?
                        </h3>
                        <p className="text-gray-400 mb-8 italic">Ready for takeoff?</p>

                        <div className="flex gap-6 justify-center">
                            <button
                                onClick={() => handleAction(onReject)}
                                className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold border border-white/30 transition-all hover:scale-105"
                            >
                                Maybe later...
                            </button>
                            <button
                                onClick={() => handleAction(onAccept)}
                                className="px-10 py-3 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold shadow-[0_0_20px_rgba(255,0,128,0.5)] transition-all hover:scale-110 active:scale-95"
                            >
                                Yes! 💖 Let's go!
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                    <div className="bg-black/60 backdrop-blur-lg border border-white/10 p-6 rounded-2xl shadow-2xl text-center max-w-xl">
                        <p className="text-xl text-white/90 italic font-medium leading-relaxed">
                            "{city.description}"
                        </p>
                        <div className="mt-4 text-sm text-cyan-400 font-bold tracking-widest uppercase">
                            Souvenirs précieux ✨
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DestinationChoiceUI;
