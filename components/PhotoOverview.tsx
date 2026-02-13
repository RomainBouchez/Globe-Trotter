import React, { useEffect, useState } from 'react';
import { City } from '../types';

interface PhotoOverviewProps {
    city: City;
    onClose: () => void;
}

const PhotoOverview: React.FC<PhotoOverviewProps> = ({ city, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Petit délai pour l'animation d'entrée
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 500); // Attendre la fin de l'animation de sortie
    };

    return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden`} style={{ zIndex: 100 }}>
            {/* Title - Top Center */}
            <div className={`absolute top-8 left-0 w-full text-center transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
                <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                    {city.name}
                </h2>
            </div>

            {/* Close Button - Top Right (Fixed) */}
            <button
                onClick={handleClose}
                className="absolute top-8 right-8 pointer-events-auto bg-black/40 hover:bg-black/60 text-white rounded-full p-2 w-12 h-12 flex items-center justify-center transition-all border border-white/20 backdrop-blur-md z-50 hover:scale-110"
            >
                <span className="text-2xl leading-none">&times;</span>
            </button>


            {/* Image 1 - Middle Left (Large) */}
            {city.images?.[0] && (
                <div className={`absolute left-8 top-1/2 -translate-y-1/2 w-[500px] h-[380px] bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20 shadow-2xl rotate-[-2deg] transition-all duration-700 delay-200 pointer-events-auto hover:scale-105 hover:rotate-0 hover:z-10 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'}`}>
                    <div className="w-full h-full rounded overflow-hidden relative">
                        <img
                            src={city.images[0]}
                            alt={`${city.name} 1`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}

            {/* Image 2 - Top Right (Medium) */}
            {city.images?.[1] && (
                <div className={`absolute right-12 top-32 w-[400px] h-[300px] bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20 shadow-2xl rotate-[3deg] transition-all duration-700 delay-300 pointer-events-auto hover:scale-105 hover:rotate-0 hover:z-10 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}>
                    <div className="w-full h-full rounded overflow-hidden relative">
                        <img
                            src={city.images[1]}
                            alt={`${city.name} 2`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}

            {/* Image 3 - Bottom Right (Medium) */}
            {city.images?.[2] && (
                <div className={`absolute right-24 bottom-24 w-[420px] h-[320px] bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20 shadow-2xl rotate-[-1deg] transition-all duration-700 delay-400 pointer-events-auto hover:scale-105 hover:rotate-0 hover:z-10 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
                    <div className="w-full h-full rounded overflow-hidden relative">
                        <img
                            src={city.images[2]}
                            alt={`${city.name} 3`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}

        </div>
    );
};

export default PhotoOverview;
