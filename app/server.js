const express = require('express');
const path = require('path');
const client = require('prom-client');
const { routePrompt, PROVIDERS } = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Prometheus metrics ----
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

const promptCounter = new client.Counter({
  name: 'gateway_prompts_total',
  help: 'Total prompts routed through the gateway',
  labelNames: ['template'],
});
register.registerMetric(promptCounter);

const providerSelectedCounter = new client.Counter({
  name: 'gateway_provider_selected_total',
  help: 'Times a provider response was picked as best',
  labelNames: ['provider'],
});
register.registerMetric(providerSelectedCounter);

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.path, status_code: res.statusCode });
  });
  next();
});

// ---- Health & readiness (used by k8s probes) ----
app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/readyz', (req, res) => res.status(200).json({ status: 'ready' }));

// ---- Metrics endpoint (scraped by Prometheus) ----
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ---- Templates (preset prompts) ----
const TEMPLATES = [
  { id: 'summarize', label: 'Summarize a document', prompt: 'Summarize the following text in 3 bullet points:\n\n' },
  { id: 'code-review', label: 'Code review', prompt: 'Review this code for bugs and style issues:\n\n' },
  { id: 'rewrite', label: 'Rewrite for clarity', prompt: 'Rewrite the following text so it is clearer and more concise:\n\n' },
  { id: 'brainstorm', label: 'Brainstorm ideas', prompt: 'Brainstorm 5 ideas for:\n\n' },
];

app.get('/api/templates', (req, res) => res.json(TEMPLATES));
app.get('/api/providers', (req, res) => res.json(PROVIDERS));

// ---- Core route: fan the prompt out to multiple providers ----
app.post('/api/generate', async (req, res) => {
  const { prompt, templateId } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  promptCounter.inc({ template: templateId || 'none' });

  try {
    const results = await routePrompt(prompt);
    res.json({ results });
  } catch (err) {
    console.error('generate error:', err);
    res.status(500).json({ error: 'failed to route prompt' });
  }
});

// ---- Record which provider's answer the user picked as "best" ----
app.post('/api/select', (req, res) => {
  const { provider } = req.body;
  if (!provider) return res.status(400).json({ error: 'provider is required' });
  providerSelectedCounter.inc({ provider });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`AI Prompt Gateway listening on port ${PORT}`);
});

