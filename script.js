const input = document.getElementById("cityInput");
const suggestions = document.getElementById("suggestions");
const resultsDiv = document.getElementById("results");

const mapboxToken = 'pk.eyJ1IjoicmlmYWRyaWFuIiwiYSI6ImNtY2RodmdraDBpZ3cybHNhb2pwc2UwZnIifQ.pcWX3WvpezeeC9kp-KNoGA';
const rapidApiKey = '52e99eb862msh0e35e7850bc8c66p1894abjsnf5703bbe409c';

let cities = [];
let airports = [];

Promise.all([
  fetch('us-cities.json').then(res => res.json()),
  fetch('airports.json').then(res => res.json())
]).then(([cityData, airportData]) => {
  cities = cityData;
  airports = airportData.filter(a => a.iso === 'US' && a.iata); // Only U.S. airports with IATA codes
});

// Autocomplete
input.addEventListener("input", () => {
  const query = input.value.toLowerCase();
  suggestions.innerHTML = "";

  if (query.length < 2) return;

  const matched = cities.filter(city =>
    `${city.name}, ${city.state}`.toLowerCase().includes(query)
  );

  matched.slice(0, 10).forEach(city => {
    const li = document.createElement("li");
    li.textContent = `${city.name}, ${city.state}`;
    li.addEventListener("click", () => handleSelect(city));
    suggestions.appendChild(li);
  });
});

// Mapbox driving distance
async function getDrivingDistance(cityLat, cityLon, airportLat, airportLon) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${cityLon},${cityLat};${airportLon},${airportLat}?access_token=${mapboxToken}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const meters = data.routes[0].distance;
      return (meters / 1609.34).toFixed(1);
    }
  } catch (e) {
    console.error("Mapbox error:", e);
  }
  return "Unknown";
}

// Get full airport name by IATA code
function getFullAirportName(iataCode) {
  const match = airports.find(a => a.iata === iataCode);
  return match ? match.name : null;
}

// Handle selection
async function handleSelect(city) {
  input.value = `${city.name}, ${city.state}`;
  suggestions.innerHTML = "";
  resultsDiv.innerHTML = `<p>Searching nearest airports near ${city.name}, ${city.state}...</p>`;

  try {
    const response = await fetch(
      `https://aerodatabox.p.rapidapi.com/airports/search/location/${city.lat}/${city.lon}/km/100/10`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com"
        }
      }
    );

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      resultsDiv.innerHTML = `<p>No major airports found near ${city.name}, ${city.state}.</p>`;
      return;
    }

    resultsDiv.innerHTML = `<h3>Major airports near ${city.name}, ${city.state}:</h3>`;
    const ul = document.createElement("ul");

    for (const item of data.items) {
      const airportCode = item.iata || "No code";
      const fullName = getFullAirportName(airportCode) || item.name || "Unknown Airport";
      const airportLat = item.location?.lat;
      const airportLon = item.location?.lon;

      let distance = "Unknown";
      if (airportLat && airportLon) {
        distance = await getDrivingDistance(city.lat, city.lon, airportLat, airportLon);
      }

      const li = document.createElement("li");
      li.textContent = `(${distance} miles) to ${fullName} (${airportCode})`;
      ul.appendChild(li);
    }

    resultsDiv.appendChild(ul);
  } catch (error) {
    console.error("API Error:", error);
    resultsDiv.innerHTML = `<p>Failed to fetch airport data. Please try again later.</p>`;
  }
}
