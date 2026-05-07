

export interface GalaxyConfig {
  rotationSpeed: number;
  reliefScale: number;
}

export interface SubCity {
  name: string;
  description?: string;
  images?: string[];
}

export interface City {
  name: string;
  lat: number;
  lng: number;
  type: 'eiffel' | 'windmill' | 'parthenon' | 'bigben' | 'pyramid' | 'generic';
  description?: string;
  images?: string[];
  subCities?: SubCity[];
}
