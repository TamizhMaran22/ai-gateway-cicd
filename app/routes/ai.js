/**
 * Routes a single prompt to multiple AI providers in parallel.
 *
 * Each provider is pluggable: if its API key env var is set, it makes a real
 * call. Otherwise it falls back to a lightweight simulated response so the
 * whole gateway is runnable and demoable with zero credentials (useful for
 * the CI/CD pipeline demo & k8s deployment where secrets may not be wired up).
 */

const PROVIDERS = [
  { id: 'claude', label: 'Claude', envKey: 'ANTHROPIC_API_KEY' },
  { id: 'openai', label: 'GPT', envKey: 'OPENAI_API_KEY' },
  { id: 'gemini', label: 'Gemini', envKey: 'GOOGLE_API_KEY' },
];

async function callClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return simulate('claude', prompt);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).map((c) => c.text || '').join('\n');
  return { provider: 'claude', text: text || '(empty response)', latencyMs: null };
}

// Placeholder integrations - wire up real keys/SDKs when available.
async function callOpenAI(prompt) {
  return simulate('openai', prompt);
}

async function callGemini(prompt) {
  return simulate('gemini', prompt);
}

function simulate(provider, prompt) {
  const snippets = {
    claude: `[simulated Claude] Here's a thoughtful, structured take on: "${trim(prompt)}"`,
    openai: `[simulated GPT] Quick, punchy answer for: "${trim(prompt)}"`,
    gemini: `[simulated Gemini] Balanced, fact-checked response for: "${trim(prompt)}"`,
  };
  return {
    provider,
    text: snippets[provider] || `[simulated ${provider}] response for: "${trim(prompt)}"`,
    latencyMs: 200 + Math.floor(Math.random() * 400),
  };
}

function trim(s, n = 60) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

async function routePrompt(prompt) {
  const start = Date.now();
  const calls = [callClaude(prompt), callOpenAI(prompt), callGemini(prompt)];
  const settled = await Promise.allSettled(calls);

  return settled.map((r, i) => {
    const providerId = PROVIDERS[i].id;
    if (r.status === 'fulfilled') {
      return { ...r.value, latencyMs: r.value.latencyMs ?? Date.now() - start };
    }
    return { provider: providerId, text: `Error: ${r.reason.message}`, latencyMs: null, error: true };
  });
}

module.exports = { routePrompt, PROVIDERS };

