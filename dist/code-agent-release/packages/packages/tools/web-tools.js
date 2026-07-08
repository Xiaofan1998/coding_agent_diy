function buildUserAgent() {
  return "code-agent/0.1 (+https://example.invalid/code-agent)";
}

export function createWebTools(config) {
  return [
    {
      name: "search_web",
      description: "Search the public web and return a compact list of results.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" }
        },
        required: ["query"],
        additionalProperties: false
      },
      execute: async ({ query, limit = 5 }) => {
        const url = new URL(config.web.searchEndpoint);
        url.searchParams.set("q", query);
        const response = await fetchWithTimeout(url.toString(), {
          headers: {
            "user-agent": buildUserAgent()
          }
        }, config.web.timeoutMs);
        if (!response.ok) {
          throw new Error(`Web search failed with HTTP ${response.status}.`);
        }

        const html = await response.text();
        return parseDuckDuckGoResults(html, Math.max(1, Math.min(10, Number(limit) || 5)));
      }
    },
    {
      name: "fetch_url",
      description: "Fetch one URL and return a compact text preview.",
      riskLevel: "safe",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string" },
          maxChars: { type: "number" }
        },
        required: ["url"],
        additionalProperties: false
      },
      execute: async ({ url, maxChars = config.web.maxFetchChars }) => {
        const response = await fetchWithTimeout(url, {
          headers: {
            "user-agent": buildUserAgent()
          }
        }, config.web.timeoutMs);
        if (!response.ok) {
          throw new Error(`URL fetch failed with HTTP ${response.status}.`);
        }

        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const raw = await response.text();
        const text = contentType.includes("html")
          ? extractReadableText(raw)
          : raw.trim();

        return {
          url,
          contentType: contentType || "(unknown)",
          preview: text.slice(0, Math.max(200, Number(maxChars) || config.web.maxFetchChars))
        };
      }
    }
  ];
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms for ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseDuckDuckGoResults(html, limit) {
  const results = [];
  const regex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) && results.length < limit) {
    const href = decodeHtmlEntities(match[1]);
    const title = stripTags(match[2]).trim();
    if (!href || !title) {
      continue;
    }

    const snippet = extractSnippetNear(html, match.index);
    results.push({
      title,
      url: href,
      snippet
    });
  }

  return {
    queryProvider: "duckduckgo-html",
    results
  };
}

function extractSnippetNear(html, startIndex) {
  const window = html.slice(startIndex, startIndex + 2000);
  const snippetMatch = window.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const snippet = stripTags(snippetMatch?.[1] || snippetMatch?.[2] || "").trim();
  return snippet;
}

function extractReadableText(rawHtml) {
  return decodeHtmlEntities(
    stripTags(
      rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|br)>/gi, "\n")
    )
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ");
}
