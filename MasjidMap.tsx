import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function MasjidMap({ isDark }: { isDark: boolean }) {
  if (!hasValidKey) {
    return (
      <a
        href="https://maps.app.goo.gl/aSRUBRVjLS6hto8Y9"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden md:flex bg-amber-500/[0.04] border border-amber-500/10 p-2 rounded-3xl w-24 h-24 items-center justify-center relative overflow-hidden transition-all hover:bg-amber-500/[0.08]"
      >
        <MapPin className="w-8 h-8 text-amber-500" />
      </a>
    );
  }

  return (
    <div className="hidden md:block w-24 h-24 rounded-3xl overflow-hidden border border-amber-500/10">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={{ lat: 20.8932, lng: 74.9221 }} // Dhule coordinates
          defaultZoom={15}
          mapId="MASJID_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI={true}
        >
          <AdvancedMarker position={{ lat: 20.8932, lng: 74.9221 }}>
            <Pin background="#F59E0B" glyphColor="#fff" />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}
