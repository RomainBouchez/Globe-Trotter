import React, { useEffect, useRef, useState } from 'react';
import { City } from '../types';
import {
  extractGPS, reverseGeocode, flattenCities, findBestMatch,
  sleep, CityTarget, GeoResult,
} from '../utils/geoUtils';

const UNKNOWN_KEY = '— Lieu inconnu';

interface PhotoItem {
  file: File;
  thumbnail: string;
  geo: GeoResult | null;
  assigned: CityTarget | null;
  isNew: boolean;
  newCityName: string;
  newParentCityName: string; // parent country when creating a new sub-city
}

export interface ConfirmGroup {
  target: CityTarget | null;
  newCityName?: string;
  newParentCityName?: string; // which existing city to nest the new sub-city under
  files: File[];
}

interface Props {
  files: File[];
  cities: City[];
  onConfirm: (groups: ConfirmGroup[]) => void;
  onCancel: () => void;
}

// ── City selector (group or per-photo) ─────────────────────────────────────
const CitySelector: React.FC<{
  targets: CityTarget[];
  topLevelCities: City[];      // for parent-country dropdown
  assigned: CityTarget | null;
  isNew: boolean;
  newCityName: string;
  newParentCityName: string;
  onChange: (assigned: CityTarget | null, isNew: boolean, newCityName?: string, newParentCityName?: string) => void;
}> = ({ targets, topLevelCities, assigned, isNew, newCityName, newParentCityName, onChange }) => {
  const selectValue = isNew
    ? '__new__'
    : assigned
    ? `${assigned.cityName}::${assigned.subCityName ?? ''}`
    : '__skip__';

  const handleSelect = (val: string) => {
    if (val === '__skip__') {
      onChange(null, false);
    } else if (val === '__new__') {
      onChange(null, true);
    } else {
      const [cn, scn] = val.split('::');
      const found = targets.find(t => t.cityName === cn && (t.subCityName ?? '') === scn);
      onChange(found ?? null, false);
    }
  };

  return (
    <div className="flex flex-col gap-1" style={{ minWidth: 180 }}>
      <select
        className="text-xs rounded-lg px-2 py-1.5"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          color: 'var(--text-primary)',
          fontFamily: 'Fredoka, sans-serif',
        }}
        value={selectValue}
        onChange={e => handleSelect(e.target.value)}
      >
        <option value="__skip__">— Ignorer</option>
        <option value="__new__">✦ Nouvelle ville…</option>
        <optgroup label="Villes existantes">
          {targets.map(t => (
            <option key={t.display} value={`${t.cityName}::${t.subCityName ?? ''}`}>
              {t.display}
            </option>
          ))}
        </optgroup>
      </select>

      {isNew && (
        <>
          {/* Parent country */}
          <select
            className="text-xs rounded-lg px-2 py-1.5"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--accent)',
              color: 'var(--text-primary)',
              fontFamily: 'Fredoka, sans-serif',
            }}
            value={newParentCityName}
            onChange={e => onChange(null, true, newCityName, e.target.value)}
          >
            <option value="">Pays / région…</option>
            {topLevelCities.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Sub-city name */}
          <input
            type="text"
            placeholder="Nom de la ville…"
            value={newCityName}
            onChange={e => onChange(null, true, e.target.value, newParentCityName)}
            className="text-xs rounded-lg px-2 py-1.5"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--accent)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'Fredoka, sans-serif',
            }}
          />
        </>
      )}
    </div>
  );
};

// ── Main dialog ─────────────────────────────────────────────────────────────
const SmartUploadDialog: React.FC<Props> = ({ files, cities, onConfirm, onCancel }) => {
  const [items, setItems]           = useState<PhotoItem[]>([]);
  const [processing, setProcessing] = useState(true);
  const [progress, setProgress]     = useState(0);
  const targets       = flattenCities(cities);
  const cancelled     = useRef(false);

  // ── Process: GPS + reverse geocode ───────────────────────────────────────
  useEffect(() => {
    cancelled.current = false;
    let done = 0;

    const process = async () => {
      const result: PhotoItem[] = [];

      for (const file of files) {
        if (cancelled.current) return;

        const thumbnail = URL.createObjectURL(file);
        const coords = await extractGPS(file);
        let geo: GeoResult | null = null;

        if (coords) {
          await sleep(1100);
          if (!cancelled.current) geo = await reverseGeocode(coords);
        }

        const match = geo ? findBestMatch(geo, targets) : null;
        result.push({
          file,
          thumbnail,
          geo,
          assigned: match,
          isNew: false,
          newCityName: geo?.city ?? '',
          newParentCityName: '',
        });

        done++;
        setProgress(Math.round((done / files.length) * 100));
      }

      if (!cancelled.current) {
        setItems(result);
        setProcessing(false);
      }
    };

    process();
    return () => { cancelled.current = true; };
  }, []);

  // ── Groups ────────────────────────────────────────────────────────────────
  const groups = React.useMemo(() => {
    const map = new Map<string, PhotoItem[]>();
    for (const item of items) {
      const key = item.geo?.display ?? UNKNOWN_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  // ── Updaters ─────────────────────────────────────────────────────────────
  const setGroupAssignment = (
    geoKey: string,
    assigned: CityTarget | null,
    isNew: boolean,
    newCityName?: string,
    newParentCityName?: string,
  ) => {
    setItems(prev => prev.map(item => {
      const key = item.geo?.display ?? UNKNOWN_KEY;
      if (key !== geoKey) return item;
      return {
        ...item,
        assigned,
        isNew,
        newCityName: newCityName ?? item.newCityName,
        newParentCityName: newParentCityName ?? item.newParentCityName,
      };
    }));
  };

  const setItemAssignment = (
    file: File,
    assigned: CityTarget | null,
    isNew: boolean,
    newCityName?: string,
    newParentCityName?: string,
  ) => {
    setItems(prev => prev.map(item => {
      if (item.file !== file) return item;
      return {
        ...item,
        assigned,
        isNew,
        newCityName: newCityName ?? item.newCityName,
        newParentCityName: newParentCityName ?? item.newParentCityName,
      };
    }));
  };

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const grouped = new Map<string, ConfirmGroup>();

    for (const item of items) {
      let key: string;
      let entry: ConfirmGroup;

      if (item.isNew) {
        key = `new:${item.newParentCityName}:${item.newCityName}`;
        entry = {
          target: null,
          newCityName: item.newCityName,
          newParentCityName: item.newParentCityName || undefined,
          files: [],
        };
      } else if (item.assigned) {
        key = `${item.assigned.cityName}::${item.assigned.subCityName ?? ''}`;
        entry = { target: item.assigned, files: [] };
      } else {
        key = 'skip';
        entry = { target: null, files: [] };
      }

      if (!grouped.has(key)) grouped.set(key, entry);
      grouped.get(key)!.files.push(item.file);
    }

    onConfirm(
      Array.from(grouped.values()).filter(
        g => g.files.length > 0 && (g.target || g.newCityName)
      )
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 400 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          boxShadow: '0 0 60px rgba(0,0,0,0.8)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Fredoka, sans-serif' }}>
              Import intelligent
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {files.length} photo{files.length > 1 ? 's' : ''} · classification par GPS
            </p>
          </div>
          <button onClick={onCancel} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70 transition-opacity">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Processing */}
        {processing && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 gap-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Lecture des métadonnées GPS… {progress}%
            </p>
            <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-dim)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'var(--accent)' }}
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Geocodage en cours (1 req/s pour respecter Nominatim)
            </p>
          </div>
        )}

        {/* Groups */}
        {!processing && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {groups.map(([geoKey, groupItems]) => {
              const isUnknown = geoKey === UNKNOWN_KEY;
              const rep = groupItems[0];

              return (
                <div
                  key={geoKey}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)' }}
                >
                  {/* Group header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium" style={{ color: isUnknown ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {isUnknown ? '📍 Lieu inconnu' : geoKey}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        {groupItems.length} photo{groupItems.length > 1 ? 's' : ''}
                        {isUnknown ? ' · assigner individuellement' : ''}
                      </p>
                    </div>

                    {/* Known location: group-level selector */}
                    {!isUnknown && (
                      <CitySelector
                        targets={targets}
                        topLevelCities={cities}
                        assigned={rep.assigned}
                        isNew={rep.isNew}
                        newCityName={rep.newCityName}
                        newParentCityName={rep.newParentCityName}
                        onChange={(assigned, isNew, newCityName, newParentCityName) =>
                          setGroupAssignment(geoKey, assigned, isNew, newCityName, newParentCityName)
                        }
                      />
                    )}
                  </div>

                  {/* Known location: thumbnail strip */}
                  {!isUnknown && (
                    <div className="flex gap-2 flex-wrap">
                      {groupItems.map((item, i) => (
                        <div
                          key={i}
                          className="rounded-lg overflow-hidden"
                          style={{ width: 64, height: 64, flexShrink: 0, background: 'var(--bg-surface)' }}
                        >
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Unknown location: per-photo rows */}
                  {isUnknown && (
                    <div className="flex flex-col gap-2">
                      {groupItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg p-2"
                          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                        >
                          <div
                            className="rounded-md overflow-hidden flex-shrink-0"
                            style={{ width: 52, height: 52, background: 'var(--bg-deep)' }}
                          >
                            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                          </div>

                          <p
                            className="flex-1 text-xs truncate"
                            style={{ color: 'var(--text-muted)', minWidth: 0 }}
                            title={item.file.name}
                          >
                            {item.file.name}
                          </p>

                          <CitySelector
                            targets={targets}
                            topLevelCities={cities}
                            assigned={item.assigned}
                            isNew={item.isNew}
                            newCityName={item.newCityName}
                            newParentCityName={item.newParentCityName}
                            onChange={(assigned, isNew, newCityName, newParentCityName) =>
                              setItemAssignment(item.file, assigned, isNew, newCityName, newParentCityName)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!processing && (
          <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={onCancel}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)' }}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.97]"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)', boxShadow: '0 4px 16px var(--accent-dim)' }}
            >
              Importer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartUploadDialog;
