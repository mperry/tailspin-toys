import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createCanvas, CanvasError, joinSession } from '@github/copilot-sdk/extension';

const issues = [
  {
    number: 9,
    title: 'Add a Backer Concierge assistant for catalog questions',
    url: 'https://github.com/mperry/tailspin-toys/issues/9',
    body: `### Problem statement

Filtering and sorting help backers who already know what they're looking for. Plenty of people arrive without that clarity - they ask things like "which game suits people who like git puns?" or "what's the highest rated strategy game?" in Discord and email, and someone answers by hand.

### Proposed solution

A Backer Concierge assistant should answer those questions on the site, grounded in the Tailspin catalog so it never invents games or numbers. The catalog records title, description, category, publisher and star rating - and nothing else, so the assistant needs to be honest about what it cannot answer and ask a clarifying question instead of guessing.

### Acceptance criteria

- Backers can ask free-text questions about the catalog and get game recommendations
- Every recommendation is grounded in the Tailspin catalog
- Unsupported catalog facts are refused with an explanation
- Vague requests get one short clarifying question
- General board-game context from web search is clearly marked
- The assistant is linked from the main navigation
- The interface follows accessibility and testability guidance
- Playwright tests stub the assistant call
- The catalog grounding export is scripted and unit tested`,
    description: 'Introduce a catalog-grounded assistant that recommends games, refuses unsupported claims, asks focused clarifying questions, and is covered by accessible UI and automated tests.',
    reason: 'Highest uncertainty and widest surface area. It introduces an assistant integration, grounding rules, a catalog export, navigation, and test seams, so early attention reduces architectural and product risk.',
    priority: 1,
  },
  {
    number: 6,
    title: 'Implement pagination on the game list page',
    url: 'https://github.com/mperry/tailspin-toys/issues/6',
    body: `As the number of games grows, loading the entire catalog on a single page hurts performance and makes the list harder to browse. Adding pagination keeps the game list page fast and manageable.

### Acceptance criteria

- Data-access helpers support pagination
- The game list page includes pagination controls
- Controls are accessible and include data-testid attributes
- Unit and Playwright tests cover pagination`,
    description: 'Add pagination to the data-access layer and game listing, including accessible controls and unit and end-to-end coverage.',
    reason: 'This is the only issue tied to an explicit scaling and performance concern. Its data-access contract will also affect how search and sorting compose, so it should be designed before those features diverge.',
    priority: 2,
  },
  {
    number: 1,
    title: 'Add a search box to find games by title',
    url: 'https://github.com/mperry/tailspin-toys/issues/1',
    body: `Players who already know what they're looking for shouldn't have to scan the whole catalog. Adding a simple search box on the game list page lets users quickly narrow the list by title, improving discoverability alongside the planned category and publisher filters.

### Acceptance criteria

- Search filters games by title
- Matching is case-insensitive
- An empty state is shown when nothing matches
- The control is accessible and includes a data-testid
- Unit and Playwright tests cover search`,
    description: 'Add an accessible title search with case-insensitive matching, a useful empty state, and unit and end-to-end tests.',
    reason: 'High user value with modest scope, and it can establish the shared list-query pattern that pagination and sorting need. Doing it early avoids three independent approaches to catalog state.',
    priority: 3,
  },
  {
    number: 2,
    title: 'Allow users to sort the game list',
    url: 'https://github.com/mperry/tailspin-toys/issues/2',
    body: `Different players browse in different ways. Add title sorting in both directions and highest-rated-first sorting, with a documented policy for unrated games, accessible controls, and unit and Playwright coverage.`,
    priority: 4,
  },
  {
    number: 4,
    title: "Add a publisher page listing that publisher's games",
    url: 'https://github.com/mperry/tailspin-toys/issues/4',
    body: `Add a prerendered page for every publisher, including its name, description, and games. Link publisher names to the page and cover the helper and route with unit and Playwright tests.`,
    priority: 5,
  },
  {
    number: 5,
    title: 'Show a catalog summary on the home page',
    url: 'https://github.com/mperry/tailspin-toys/issues/5',
    body: `Show the total game count and average rating on the home page. Handle empty and unrated catalogs gracefully and cover the deterministic helper and rendered output with tests.`,
    priority: 6,
  },
  {
    number: 3,
    title: 'Show category and publisher descriptions on the game detail page',
    url: 'https://github.com/mperry/tailspin-toys/issues/3',
    body: `Show existing category and publisher descriptions on game detail pages, hide missing values gracefully, and update data helpers plus unit and Playwright tests.`,
    priority: 7,
  },
];

const servers = new Map();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderButton(issue, token) {
  return `<button class="context-button" type="button" data-issue="${issue.number}" data-token="${token}" aria-label="Add issue ${issue.number} to the current session context">
    <span>Add to context</span>
  </button>`;
}

function renderPriorityCard(issue, token) {
  return `<article class="card priority-card">
    <div class="card-heading">
      <span class="rank">Priority ${issue.priority}</span>
      <a href="${issue.url}" target="_blank" rel="noreferrer">#${issue.number}</a>
    </div>
    <h3>${escapeHtml(issue.title)}</h3>
    <p>${escapeHtml(issue.description)}</p>
    <div class="reason">
      <strong>Why now</strong>
      <p>${escapeHtml(issue.reason)}</p>
    </div>
    ${renderButton(issue, token)}
  </article>`;
}

function renderBacklogCard(issue, token) {
  return `<article class="card backlog-card">
    <div>
      <a class="issue-number" href="${issue.url}" target="_blank" rel="noreferrer">#${issue.number}</a>
      <h3>${escapeHtml(issue.title)}</h3>
    </div>
    ${renderButton(issue, token)}
  </article>`;
}

function renderHtml(token) {
  const priorityCards = issues.slice(0, 3).map((issue) => renderPriorityCard(issue, token)).join('');
  const backlogCards = issues.slice(3).map((issue) => renderBacklogCard(issue, token)).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Issue triage board</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--background-color-default, #0d1117);
        color: var(--text-color-default, #f0f6fc);
        font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        font-size: var(--text-body-medium, 14px);
        line-height: var(--leading-body-medium, 20px);
      }
      main { max-width: 1180px; margin: 0 auto; padding: 28px; }
      header { margin-bottom: 24px; }
      h1 {
        margin: 0 0 8px;
        font-family: var(--font-sans-display, var(--font-sans, sans-serif));
        font-size: var(--text-title-large, 26px);
        line-height: var(--leading-title-large, 32px);
      }
      h2 { margin: 0; font-size: 18px; }
      h3 { margin: 10px 0 8px; font-size: 16px; line-height: 22px; }
      p { margin: 0; color: var(--text-color-muted, #8b949e); }
      a { color: var(--true-color-blue, #58a6ff); font-weight: 600; text-decoration: none; }
      a:hover { text-decoration: underline; }
      a:focus-visible, button:focus-visible { outline: 2px solid var(--color-focus-outline, #58a6ff); outline-offset: 2px; }
      .section-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .count {
        min-width: 24px;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--true-color-red-muted, #3d1518);
        color: var(--true-color-red, #ff7b72);
        font-size: 12px;
        font-weight: 700;
        text-align: center;
      }
      .priority-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .card {
        border: 1px solid var(--border-color-default, #30363d);
        border-radius: 12px;
        background: color-mix(in srgb, var(--background-color-default, #0d1117) 88%, var(--color-white, #fff) 12%);
      }
      .priority-card {
        display: flex;
        min-height: 330px;
        flex-direction: column;
        padding: 18px;
        border-top: 3px solid var(--true-color-red, #f85149);
      }
      .card-heading { display: flex; align-items: center; justify-content: space-between; }
      .rank {
        color: var(--true-color-red, #ff7b72);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      .reason {
        margin: 16px 0;
        padding: 12px;
        border-radius: 8px;
        background: var(--true-color-blue-muted, #102849);
      }
      .reason strong { display: block; margin-bottom: 4px; color: var(--true-color-blue, #79c0ff); font-size: 12px; text-transform: uppercase; }
      .reason p { color: var(--text-color-default, #f0f6fc); }
      button {
        width: 100%;
        margin-top: auto;
        border: 1px solid var(--border-color-default, #30363d);
        border-radius: 8px;
        padding: 9px 12px;
        background: var(--true-color-blue, #1f6feb);
        color: var(--color-white, #fff);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      button:hover { filter: brightness(1.08); }
      button:disabled { cursor: default; filter: grayscale(.4); opacity: .72; }
      .backlog { margin-top: 34px; padding-top: 24px; border-top: 1px solid var(--border-color-default, #30363d); }
      .backlog .count { background: color-mix(in srgb, var(--background-color-default, #0d1117) 75%, var(--color-white, #fff) 25%); color: var(--text-color-muted, #8b949e); }
      .backlog-list { display: grid; gap: 9px; }
      .backlog-card { display: grid; grid-template-columns: 1fr 160px; align-items: center; gap: 16px; padding: 14px 16px; }
      .backlog-card h3 { display: inline; margin-left: 8px; }
      .backlog-card button { margin: 0; }
      #status { min-height: 20px; margin-top: 14px; color: var(--text-color-muted, #8b949e); }
      @media (max-width: 850px) {
        .priority-grid { grid-template-columns: 1fr; }
        .priority-card { min-height: auto; }
      }
      @media (max-width: 560px) {
        main { padding: 18px; }
        .backlog-card { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Issue triage</h1>
        <p>Open work ranked by likely impact, urgency, and implementation leverage.</p>
      </header>
      <section aria-labelledby="attention-heading">
        <div class="section-heading">
          <h2 id="attention-heading">Needs attention now</h2>
          <span class="count" aria-label="3 priority issues">3</span>
        </div>
        <div class="priority-grid">${priorityCards}</div>
      </section>
      <section class="backlog" aria-labelledby="backlog-heading">
        <div class="section-heading">
          <h2 id="backlog-heading">Remaining queue</h2>
          <span class="count" aria-label="${issues.length - 3} remaining issues">${issues.length - 3}</span>
        </div>
        <div class="backlog-list">${backlogCards}</div>
      </section>
      <p id="status" role="status" aria-live="polite"></p>
    </main>
    <script>
      const status = document.querySelector('#status');
      document.querySelectorAll('.context-button').forEach((button) => {
        button.addEventListener('click', async () => {
          button.disabled = true;
          button.querySelector('span').textContent = 'Adding...';
          status.textContent = 'Adding issue #' + button.dataset.issue + ' to this session...';
          try {
            const response = await fetch('/add-context', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Canvas-Token': button.dataset.token },
              body: JSON.stringify({ number: Number(button.dataset.issue) }),
            });
            if (!response.ok) throw new Error('Request failed');
            button.querySelector('span').textContent = 'Added';
            status.textContent = 'Issue #' + button.dataset.issue + ' was added to the current session.';
          } catch {
            button.disabled = false;
            button.querySelector('span').textContent = 'Try again';
            status.textContent = 'Could not add the issue. Please try again.';
          }
        });
      });
    </script>
  </body>
</html>`;
}

async function addIssueToContext(number) {
  const issue = issues.find((candidate) => candidate.number === number);
  if (!issue) {
    throw new CanvasError('issue_not_found', `Issue #${number} is not on this triage board.`);
  }

  await session.send({
    prompt: `Add this GitHub issue to our current working context and begin investigating it. Do not make assumptions if the issue requires a product decision.

Issue #${issue.number}: ${issue.title}
${issue.url}

${issue.body}`,
  });

  return {
    number: issue.number,
    title: issue.title,
    added: true,
  };
}

async function startServer(instanceId) {
  const token = randomBytes(24).toString('hex');
  const server = createServer(async (request, response) => {
    if (request.method === 'POST' && request.url === '/add-context') {
      if (request.headers['x-canvas-token'] !== token) {
        response.writeHead(403, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Invalid canvas token' }));
        return;
      }

      let body = '';
      request.setEncoding('utf8');
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 4096) {
          response.writeHead(413, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: 'Request too large' }));
          return;
        }
      }

      try {
        const input = JSON.parse(body);
        const result = await addIssueToContext(input.number);
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result));
      } catch (error) {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
      }
      return;
    }

    if (request.method !== 'GET' || request.url !== '/') {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self';",
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(renderHtml(token));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { server, url: `http://127.0.0.1:${port}/`, instanceId };
}

const session = await joinSession({
  canvases: [
    createCanvas({
      id: 'issue-triage-board',
      displayName: 'Issue triage board',
      description: 'Prioritizes the current repository issues and adds a selected issue to this session.',
      actions: [
        {
          name: 'add_issue_to_context',
          description: 'Add one issue from the board to the current session and begin investigating it.',
          inputSchema: {
            type: 'object',
            properties: {
              number: { type: 'integer', enum: issues.map((issue) => issue.number) },
            },
            required: ['number'],
            additionalProperties: false,
          },
          handler: async (ctx) => addIssueToContext(ctx.input.number),
        },
      ],
      open: async (ctx) => {
        let entry = servers.get(ctx.instanceId);
        if (!entry) {
          entry = await startServer(ctx.instanceId);
          servers.set(ctx.instanceId, entry);
        }
        return {
          title: 'Issue triage',
          status: `${issues.length} open issues`,
          url: entry.url,
        };
      },
      onClose: async (ctx) => {
        const entry = servers.get(ctx.instanceId);
        if (entry) {
          servers.delete(ctx.instanceId);
          await new Promise((resolve) => entry.server.close(resolve));
        }
      },
    }),
  ],
});
