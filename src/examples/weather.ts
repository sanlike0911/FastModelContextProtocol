#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const OPENWEATHER_API_BASE = "https://api.openweathermap.org/data/2.5";
const USER_AGENT = "weather-app/1.0";
const API_KEY = process.env.OPENWEATHER_API_KEY;

// Create server instance
const server = new McpServer({
  name: "worldwide-weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making NWS request:", error);
    return null;
  }
}

// Helper function for making OpenWeatherMap API requests
async function makeOpenWeatherRequest<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const queryParams = new URLSearchParams(params);
  const url = `${OPENWEATHER_API_BASE}/${endpoint}?${queryParams}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making OpenWeatherMap request:", error);
    return null;
  }
}

interface AlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    status?: string;
    headline?: string;
  };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

interface ForecastPeriod {
  name?: string;
  temperature?: number;
  temperatureUnit?: string;
  windSpeed?: string;
  windDirection?: string;
  shortForecast?: string;
}

interface AlertsResponse {
  features: AlertFeature[];
}

interface PointsResponse {
  properties: {
    forecast?: string;
  };
}

interface ForecastResponse {
  properties: {
    periods: ForecastPeriod[];
  };
}

interface OpenWeatherCurrentResponse {
  name: string;
  sys: {
    country: string;
  };
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  wind: {
    speed: number;
    deg?: number;
  };
  visibility?: number;
}

interface OpenWeatherForecastResponse {
  city: {
    name: string;
    country: string;
  };
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
    }>;
    wind: {
      speed: number;
      deg?: number;
    };
    dt_txt: string;
  }>;
}

// Register weather tools
server.tool(
  "get_alerts",
  "Get weather alerts for a state",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

    if (!alertsData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve alerts data",
          },
        ],
      };
    }

    const features = alertsData.features || [];
    if (features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No active alerts for ${stateCode}`,
          },
        ],
      };
    }

    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: alertsText,
        },
      ],
    };
  },
);

server.tool(
  "get_forecast",
  "Get weather forecast for a location",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe("Longitude of the location"),
  },
  async ({ latitude, longitude }) => {
    // Get grid point data
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

    if (!pointsData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
          },
        ],
      };
    }

    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get forecast URL from grid point data",
          },
        ],
      };
    }

    // Get forecast data
    const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
    if (!forecastData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve forecast data",
          },
        ],
      };
    }

    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No forecast periods available",
          },
        ],
      };
    }

    // Format forecast periods
    const formattedForecast = periods.map((period: ForecastPeriod) =>
      [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
      ].join("\n"),
    );

    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: forecastText,
        },
      ],
    };
  },
);

// Add worldwide weather tools
server.tool(
  "get_current_weather",
  "Get current weather for any city worldwide",
  {
    city: z.string().describe("City name (e.g., Tokyo, London, New York)"),
    country: z.string().optional().describe("Country code (optional, e.g., JP, GB, US)"),
  },
  async ({ city, country }) => {
    if (!API_KEY) {
      return {
        content: [
          {
            type: "text",
            text: "OpenWeatherMap API key not found. Please set OPENWEATHER_API_KEY environment variable.",
          },
        ],
      };
    }

    const params: Record<string, string> = {
      q: country ? `${city},${country}` : city,
      appid: API_KEY,
      units: "metric",
    };

    const weatherData = await makeOpenWeatherRequest<OpenWeatherCurrentResponse>("weather", params);

    if (!weatherData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve weather data for ${city}${country ? `, ${country}` : ""}. Please check the city name.`,
          },
        ],
      };
    }

    const windDirection = weatherData.wind.deg
      ? `${weatherData.wind.deg}°`
      : "Unknown";

    const weatherText = [
      `Current weather for ${weatherData.name}, ${weatherData.sys.country}:`,
      `Temperature: ${weatherData.main.temp}°C (feels like ${weatherData.main.feels_like}°C)`,
      `Weather: ${weatherData.weather[0]?.description || "Unknown"}`,
      `Humidity: ${weatherData.main.humidity}%`,
      `Pressure: ${weatherData.main.pressure} hPa`,
      `Wind: ${weatherData.wind.speed} m/s ${windDirection}`,
      weatherData.visibility ? `Visibility: ${(weatherData.visibility / 1000).toFixed(1)} km` : "",
    ].filter(Boolean).join("\n");

    return {
      content: [
        {
          type: "text",
          text: weatherText,
        },
      ],
    };
  },
);

server.tool(
  "get_weather_forecast",
  "Get 5-day weather forecast for any city worldwide",
  {
    city: z.string().describe("City name (e.g., Tokyo, London, New York)"),
    country: z.string().optional().describe("Country code (optional, e.g., JP, GB, US)"),
    days: z.number().min(1).max(5).default(3).describe("Number of days to forecast (1-5, default: 3)"),
  },
  async ({ city, country, days }) => {
    if (!API_KEY) {
      return {
        content: [
          {
            type: "text",
            text: "OpenWeatherMap API key not found. Please set OPENWEATHER_API_KEY environment variable.",
          },
        ],
      };
    }

    const params: Record<string, string> = {
      q: country ? `${city},${country}` : city,
      appid: API_KEY,
      units: "metric",
    };

    const forecastData = await makeOpenWeatherRequest<OpenWeatherForecastResponse>("forecast", params);

    if (!forecastData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve forecast data for ${city}${country ? `, ${country}` : ""}. Please check the city name.`,
          },
        ],
      };
    }

    // Group forecast by day and take the first forecast for each day
    const dailyForecasts = forecastData.list
      .filter((_, index) => index % 8 === 0) // Take every 8th item (24 hours / 3 hour intervals)
      .slice(0, days);

    const formattedForecast = dailyForecasts.map((forecast) => {
      const date = new Date(forecast.dt * 1000).toLocaleDateString();
      const windDirection = forecast.wind.deg
        ? `${forecast.wind.deg}°`
        : "Unknown";

      return [
        `${date}:`,
        `Temperature: ${forecast.main.temp}°C (feels like ${forecast.main.feels_like}°C)`,
        `Weather: ${forecast.weather[0]?.description || "Unknown"}`,
        `Humidity: ${forecast.main.humidity}%`,
        `Wind: ${forecast.wind.speed} m/s ${windDirection}`,
        "---",
      ].join("\n");
    });

    const forecastText = `${days}-day forecast for ${forecastData.city.name}, ${forecastData.city.country}:\n\n${formattedForecast.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: forecastText,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Worldwide Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});