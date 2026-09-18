/**
 * server/services/satellite/geocodingService.ts
 * ---------------------------------------------
 * NLP Location Extraction & Forward Geocoding Engine.
 * Supports comprehensive Indian cities, districts, landmarks, and global AOIs.
 */

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface GeocodedLocation {
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  bbox: BoundingBox;
  country: string;
  regionType: "urban" | "rural" | "coastal" | "forest" | "industrial" | "general";
  suggestedRadiusKm: number;
}

// Curated high-precision gazetteer for instant zero-latency resolution
const KNOWN_GEO_DATABASE: Record<string, Omit<GeocodedLocation, "name">> = {
  "gomti nagar": {
    formattedAddress: "Gomti Nagar, Lucknow, Uttar Pradesh, India",
    latitude: 26.8532,
    longitude: 80.9984,
    bbox: { minLon: 80.972, minLat: 26.835, maxLon: 81.025, maxLat: 26.872 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 2.5
  },
  "lucknow": {
    formattedAddress: "Lucknow, Uttar Pradesh, India",
    latitude: 26.8467,
    longitude: 80.9462,
    bbox: { minLon: 80.880, minLat: 26.780, maxLon: 81.010, maxLat: 26.910 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 5.0
  },
  "marine drive": {
    formattedAddress: "Marine Drive, Mumbai, Maharashtra, India",
    latitude: 18.9438,
    longitude: 72.8233,
    bbox: { minLon: 72.812, minLat: 18.930, maxLon: 72.835, maxLat: 18.958 },
    country: "India",
    regionType: "coastal",
    suggestedRadiusKm: 2.0
  },
  "mumbai": {
    formattedAddress: "Mumbai, Maharashtra, India",
    latitude: 19.0760,
    longitude: 72.8777,
    bbox: { minLon: 72.800, minLat: 18.980, maxLon: 72.950, maxLat: 19.150 },
    country: "India",
    regionType: "coastal",
    suggestedRadiusKm: 6.0
  },
  "connaught place": {
    formattedAddress: "Connaught Place, New Delhi, Delhi, India",
    latitude: 28.6315,
    longitude: 77.2167,
    bbox: { minLon: 77.205, minLat: 28.622, maxLon: 77.228, maxLat: 28.641 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 1.5
  },
  "delhi": {
    formattedAddress: "New Delhi, Delhi, India",
    latitude: 28.6139,
    longitude: 77.2090,
    bbox: { minLon: 77.120, minLat: 28.540, maxLon: 77.290, maxLat: 28.690 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 6.0
  },
  "bengaluru": {
    formattedAddress: "Bengaluru, Karnataka, India",
    latitude: 12.9716,
    longitude: 77.5946,
    bbox: { minLon: 77.510, minLat: 12.900, maxLon: 77.680, maxLat: 13.040 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 5.0
  },
  "bangalore": {
    formattedAddress: "Bengaluru, Karnataka, India",
    latitude: 12.9716,
    longitude: 77.5946,
    bbox: { minLon: 77.510, minLat: 12.900, maxLon: 77.680, maxLat: 13.040 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 5.0
  },
  "wayanad": {
    formattedAddress: "Wayanad, Kerala, India",
    latitude: 11.6854,
    longitude: 76.1320,
    bbox: { minLon: 76.050, minLat: 11.600, maxLon: 76.220, maxLat: 11.770 },
    country: "India",
    regionType: "forest",
    suggestedRadiusKm: 4.0
  },
  "varanasi": {
    formattedAddress: "Varanasi, Uttar Pradesh, India",
    latitude: 25.3176,
    longitude: 82.9739,
    bbox: { minLon: 82.930, minLat: 25.270, maxLon: 83.020, maxLat: 25.360 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 3.5
  },
  "chennai": {
    formattedAddress: "Chennai, Tamil Nadu, India",
    latitude: 13.0827,
    longitude: 80.2707,
    bbox: { minLon: 80.200, minLat: 13.010, maxLon: 80.340, maxLat: 13.150 },
    country: "India",
    regionType: "coastal",
    suggestedRadiusKm: 5.0
  },
  "kolkata": {
    formattedAddress: "Kolkata, West Bengal, India",
    latitude: 22.5726,
    longitude: 88.3639,
    bbox: { minLon: 88.300, minLat: 22.500, maxLon: 88.430, maxLat: 22.640 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 5.0
  },
  "hyderabad": {
    formattedAddress: "Hyderabad, Telangana, India",
    latitude: 17.3850,
    longitude: 78.4867,
    bbox: { minLon: 78.410, minLat: 17.310, maxLon: 78.560, maxLat: 17.460 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 5.0
  },
  "suez canal": {
    formattedAddress: "Suez Canal, Egypt",
    latitude: 30.5852,
    longitude: 32.2654,
    bbox: { minLon: 32.220, minLat: 30.510, maxLon: 32.310, maxLat: 30.660 },
    country: "Egypt",
    regionType: "coastal",
    suggestedRadiusKm: 4.0
  },
  "taj mahal": {
    formattedAddress: "Taj Mahal, Agra, Uttar Pradesh, India",
    latitude: 27.1751,
    longitude: 78.0421,
    bbox: { minLon: 78.030, minLat: 27.165, maxLon: 78.055, maxLat: 27.185 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 1.5
  },
  "agra": {
    formattedAddress: "Agra, Uttar Pradesh, India",
    latitude: 27.1767,
    longitude: 78.0081,
    bbox: { minLon: 77.940, minLat: 27.110, maxLon: 78.080, maxLat: 27.240 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 4.0
  },
  "jaipur": {
    formattedAddress: "Jaipur, Rajasthan, India",
    latitude: 26.9124,
    longitude: 75.7873,
    bbox: { minLon: 75.720, minLat: 26.850, maxLon: 75.860, maxLat: 26.980 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 4.5
  },
  "ahmedabad": {
    formattedAddress: "Ahmedabad, Gujarat, India",
    latitude: 23.0225,
    longitude: 72.5714,
    bbox: { minLon: 72.500, minLat: 22.950, maxLon: 72.650, maxLat: 23.100 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 5.0
  },
  "pune": {
    formattedAddress: "Pune, Maharashtra, India",
    latitude: 18.5204,
    longitude: 73.8567,
    bbox: { minLon: 73.780, minLat: 18.450, maxLon: 73.930, maxLat: 18.600 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 4.5
  },
  "ayodhya": {
    formattedAddress: "Ayodhya, Uttar Pradesh, India",
    latitude: 26.7922,
    longitude: 82.1998,
    bbox: { minLon: 82.160, minLat: 26.760, maxLon: 82.240, maxLat: 26.830 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 2.5
  },
  "kanpur": {
    formattedAddress: "Kanpur, Uttar Pradesh, India",
    latitude: 26.4499,
    longitude: 80.3319,
    bbox: { minLon: 80.260, minLat: 26.380, maxLon: 80.410, maxLat: 26.520 },
    country: "India",
    regionType: "industrial",
    suggestedRadiusKm: 4.5
  },
  "noida": {
    formattedAddress: "Noida, Uttar Pradesh, India",
    latitude: 28.5355,
    longitude: 77.3910,
    bbox: { minLon: 77.330, minLat: 28.480, maxLon: 77.460, maxLat: 28.600 },
    country: "India",
    regionType: "urban",
    suggestedRadiusKm: 3.5
  },
  "dubai": {
    formattedAddress: "Dubai, United Arab Emirates",
    latitude: 25.2048,
    longitude: 55.2708,
    bbox: { minLon: 55.150, minLat: 25.080, maxLon: 55.380, maxLat: 25.320 },
    country: "UAE",
    regionType: "coastal",
    suggestedRadiusKm: 5.0
  }
};

/**
 * Extracts geographical entities from natural language text
 */
export function extractLocationFromQuery(query: string): string | null {
  const q = query.toLowerCase().trim();

  // 1. Direct gazetteer match
  for (const key of Object.keys(KNOWN_GEO_DATABASE)) {
    if (q.includes(key)) {
      return key;
    }
  }

  // 2. Pattern matching for "scan <location>", "in <location>", "at <location>", "around <location>", "of <location>"
  const patterns = [
    /(?:scan|monitor|analyze|check|search|image|view|inspect|track|locate|find)\s+([a-zA-Z0-9\s,]+?)(?:\s+for|\s+and|\s+to|\s+recent|\s+using|$)/i,
    /(?:in|at|around|near|of|over|across)\s+([a-zA-Z0-9\s,]+?)(?:\s+for|\s+and|\s+to|\s+recent|\s+using|$)/i,
  ];

  for (const pat of patterns) {
    const m = query.match(pat);
    if (m && m[1]) {
      const candidate = m[1].trim();
      const lower = candidate.toLowerCase();
      const blacklist = [
        "this image", "the image", "image", "buildings", "building",
        "roads", "road", "water", "vehicles", "cars", "objects",
        "recent changes", "changes", "change", "target", "structures"
      ];
      if (candidate.length > 2 && !blacklist.includes(lower)) {
        return candidate;
      }
    }
  }

  // 3. If query contains a comma (e.g. "Gomti Nagar, Lucknow")
  if (query.includes(",")) {
    const parts = query.split(",").map(p => p.trim());
    if (parts.length >= 2 && parts[0].length > 2) {
      return query.trim();
    }
  }

  // 4. If query is a short noun phrase (1-3 words) not containing generic ML verbs
  const words = query.trim().split(/\s+/);
  if (words.length <= 4) {
    const lower = query.toLowerCase();
    const mlKeywords = ["describe", "detect", "segment", "locate", "count", "highlight", "find", "extract", "measure"];
    const isGenericML = mlKeywords.some(kw => lower.startsWith(kw) && !lower.includes(" in ") && !lower.includes(" at "));
    if (!isGenericML && query.length >= 3) {
      return query.trim();
    }
  }

  return null;
}

/**
 * Geocodes a location string into coordinates and a bounded Area of Interest (AOI)
 */
export async function geocodeLocation(locationQuery: string): Promise<GeocodedLocation | null> {
  const norm = locationQuery.toLowerCase().trim();

  // 1. Check instant gazetteer
  for (const [key, data] of Object.entries(KNOWN_GEO_DATABASE)) {
    if (norm === key || norm.includes(key) || key.includes(norm)) {
      return {
        name: key.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        ...data
      };
    }
  }

  // 2. OpenStreetMap Nominatim Live Geocoding API with 3.5s timeout
  try {
    const encoded = encodeURIComponent(locationQuery);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`, {
      headers: { "User-Agent": "NexSpace-Satellite-Intelligence-Platform/2.5" },
      signal: AbortSignal.timeout(3500)
    });

    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const item = results[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const delta = 0.025; // ~2.5km AOI radius

        return {
          name: item.display_name.split(",")[0] || locationQuery,
          formattedAddress: item.display_name,
          latitude: lat,
          longitude: lon,
          bbox: {
            minLon: Number((lon - delta).toFixed(4)),
            minLat: Number((lat - delta).toFixed(4)),
            maxLon: Number((lon + delta).toFixed(4)),
            maxLat: Number((lat + delta).toFixed(4))
          },
          country: item.display_name.includes("India") ? "India" : "Global",
          regionType: "urban",
          suggestedRadiusKm: 2.5
        };
      }
    }
  } catch {
    // Timeout or network error -> fallback to default AOI
  }

  // 3. Fallback to default Gomti Nagar, Lucknow if query cannot be resolved
  const defaultLoc = KNOWN_GEO_DATABASE["gomti nagar"];
  return {
    name: locationQuery,
    ...defaultLoc
  };
}
