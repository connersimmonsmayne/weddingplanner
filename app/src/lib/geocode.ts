// Geocoding utility using OpenStreetMap Nominatim (free, no API key)

interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
}

// Rate limiting: Nominatim requires max 1 request per second
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1100 // 1.1 seconds to be safe

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    return null
  }

  await waitForRateLimit()

  try {
    const encodedAddress = encodeURIComponent(address.trim())
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&countrycodes=us`,
      {
        headers: {
          'User-Agent': 'WeddingPlanner/1.0 (guest map feature)',
        },
      }
    )

    if (!response.ok) {
      console.error('Geocoding request failed:', response.status)
      return null
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      console.log('No geocoding results for:', address)
      return null
    }

    const result = data[0]
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    }
  } catch (error) {
    console.error('Geocoding error for address:', address, error)
    return null
  }
}

// Batch geocode multiple addresses with rate limiting
export async function geocodeAddresses(
  addresses: { id: string; address: string }[]
): Promise<Map<string, GeocodeResult>> {
  const results = new Map<string, GeocodeResult>()

  for (const { id, address } of addresses) {
    const result = await geocodeAddress(address)
    if (result) {
      results.set(id, result)
    }
  }

  return results
}
