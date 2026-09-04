import fs from "fs";
import path from "path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";

interface RsrReporterOptions {
  outputFolder?: string;
  title?: string;
  subtitle?: string;
}

type TestStatus = "passed" | "failed" | "skipped" | "flaky";

interface StepJSON {
  title: string;
  duration: number;
  error?: string;
  steps: StepJSON[];
}

interface AttachmentJSON {
  name: string;
  contentType: string;
  href: string;
  size: number;
}

interface TestJSON {
  title: string;
  titlePath: string;
  status: TestStatus;
  duration: number;
  retries: number;
  errors: string[];
  steps: StepJSON[];
  attachments: AttachmentJSON[];
  stdout: string;
  stderr: string;
  project: string;
}

interface SuiteCounts {
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
}

interface SuiteJSON {
  id: string;
  navLabel: string;
  displayName: string;
  file: string;
  badgeIndex: number;
  tests: TestJSON[];
  counts: SuiteCounts;
  duration: number;
  status: TestStatus;
}

interface ProjectJSON {
  name: string;
  browserName: string;
  testCount: number;
  passed: number;
  failed: number;
  duration: number;
}

interface ReportData {
  title: string;
  subtitle: string;
  generatedAt: string;
  env: Record<string, string>;
  summary: { total: number; passed: number; failed: number; skipped: number; flaky: number; duration: number };
  overallStatus: "passed" | "failed";
  suites: SuiteJSON[];
  projects: ProjectJSON[];
}

const outcomeToStatus: Record<string, TestStatus> = {
  expected: "passed",
  unexpected: "failed",
  flaky: "flaky",
  skipped: "skipped",
};

// eslint-disable-next-line no-control-regex
const ansiPattern = /\x1b\[[0-9;]*m/g;

function stripAnsi(value: string): string {
  return value.replace(ansiPattern, "");
}

function toText(chunk: string | Buffer): string {
  return typeof chunk === "string" ? chunk : chunk.toString("utf-8");
}

function sanitize(name: string): string {
  return name.replace(/[^a-z0-9_.-]/gi, "_");
}

function humanizeFileName(relFile: string): string {
  const base = path
    .basename(relFile)
    .replace(/\.spec\.ts$/, "")
    .replace(/\.ts$/, "");
  const words = base
    .replace(/[-_.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 1 && /^test$/i.test(words[words.length - 1])) words.pop();
  if (!words.length) return base;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function serializeSteps(steps: TestStep[]): StepJSON[] {
  return steps
    .filter((step) => step.category === "test.step" || !!step.error)
    .map((step) => ({
      title: step.title,
      duration: step.duration,
      error: step.error?.message ? stripAnsi(step.error.message) : undefined,
      steps: serializeSteps(step.steps),
    }));
}

function suiteStatus(counts: SuiteCounts): TestStatus {
  if (counts.failed > 0) return "failed";
  if (counts.flaky > 0) return "flaky";
  if (counts.passed === 0 && counts.skipped > 0) return "skipped";
  return "passed";
}

export default class RsrHtmlReporter implements Reporter {
  private outputFolder: string;
  private title: string;
  private subtitle: string;
  private rootDir = process.cwd();
  private startTime = Date.now();
  private config!: FullConfig;
  private allTests: TestCase[] = [];

  constructor(options: RsrReporterOptions = {}) {
    this.outputFolder = options.outputFolder ?? "rsr-report";
    this.title = options.title ?? "RSR Test Report";
    this.subtitle = options.subtitle ?? "Automation Test Execution Report";
  }

  onBegin(config: FullConfig, _suite: Suite) {
    this.config = config;
    this.rootDir = config.configFile ? path.dirname(config.configFile) : process.cwd();
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, _result: TestResult) {
    if (!this.allTests.includes(test)) this.allTests.push(test);
  }

  async onEnd(fullResult: FullResult) {
    const outDir = path.resolve(this.rootDir, this.outputFolder);
    const attachmentsDir = path.join(outDir, "attachments");
    await fs.promises.mkdir(attachmentsDir, { recursive: true });

    const suites: SuiteJSON[] = [];
    const suiteIndex = new Map<string, SuiteJSON>();
    const projects = new Map<string, ProjectJSON>();
    const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
    let attachmentCounter = 0;

    for (const test of this.allTests) {
      const result = test.results[test.results.length - 1];
      if (!result) continue;

      const status = outcomeToStatus[test.outcome()] ?? "failed";
      counts[status]++;

      const fullTitlePath = test.titlePath();
      const projectName = fullTitlePath[1] || "default";
      const describeParts = fullTitlePath.slice(3, -1);

      const attachments: AttachmentJSON[] = [];
      for (const attachment of result.attachments) {
        const copied = await this.copyAttachment(attachment, attachmentsDir, attachmentCounter++);
        if (copied) attachments.push(copied);
      }

      const relFile = path.relative(this.rootDir, test.location.file).replace(/\\/g, "/");
      let suite = suiteIndex.get(relFile);
      if (!suite) {
        suite = {
          id: `suite-${suites.length}`,
          navLabel: humanizeFileName(relFile),
          displayName: describeParts[0] || humanizeFileName(relFile),
          file: relFile,
          badgeIndex: suites.length,
          tests: [],
          counts: { passed: 0, failed: 0, skipped: 0, flaky: 0 },
          duration: 0,
          status: "passed",
        };
        suiteIndex.set(relFile, suite);
        suites.push(suite);
      }

      suite.counts[status]++;
      suite.duration += result.duration;

      suite.tests.push({
        title: test.title,
        titlePath: describeParts.join(" > "),
        status,
        duration: result.duration,
        retries: test.results.length - 1,
        errors: result.errors.map((e) => stripAnsi(e.stack || e.message || String(e))),
        steps: serializeSteps(result.steps),
        attachments,
        stdout: stripAnsi(result.stdout.map(toText).join("")),
        stderr: stripAnsi(result.stderr.map(toText).join("")),
        project: projectName,
      });

      let project = projects.get(projectName);
      if (!project) {
        const projectConfig = this.config.projects.find((p) => p.name === projectName);
        const browserName = (projectConfig?.use as { browserName?: string } | undefined)?.browserName;
        project = {
          name: projectName,
          browserName: browserName ?? projectName,
          testCount: 0,
          passed: 0,
          failed: 0,
          duration: 0,
        };
        projects.set(projectName, project);
      }
      project.testCount++;
      project.duration += result.duration;
      if (status === "failed") project.failed++;
      else if (status !== "skipped") project.passed++;
    }

    for (const suite of suites) suite.status = suiteStatus(suite.counts);

    const overallStatus: "passed" | "failed" = counts.failed > 0 || fullResult.status === "failed" ? "failed" : "passed";

    const env: Record<string, string> = {
      TEST_ENV: (process.env.TEST_ENV ?? "local").toUpperCase(),
      BASE_URL: process.env.BASE_URL ?? "",
      "Executed By": process.env.CI ? "CI Pipeline" : "Playwright Automation",
      Platform: `${process.platform} ${process.arch}`,
      Node: process.version,
      CI: process.env.CI ? "true" : "false",
    };

    const data: ReportData = {
      title: this.title,
      subtitle: this.subtitle,
      generatedAt: new Date().toISOString(),
      env,
      summary: { total: this.allTests.length, ...counts, duration: Date.now() - this.startTime },
      overallStatus,
      suites,
      projects: [...projects.values()],
    };

    const html = renderReport(data);
    await fs.promises.writeFile(path.join(outDir, "index.html"), html, "utf-8");
  }

  private async copyAttachment(
    attachment: { name: string; contentType: string; path?: string; body?: Buffer },
    attachmentsDir: string,
    index: number,
  ): Promise<AttachmentJSON | undefined> {
    const ext = path.extname(attachment.path ?? attachment.name) || "";
    const fileName = `${index}-${sanitize(attachment.name)}${ext}`;
    const dest = path.join(attachmentsDir, fileName);

    if (attachment.path && fs.existsSync(attachment.path)) {
      await fs.promises.copyFile(attachment.path, dest);
    } else if (attachment.body) {
      await fs.promises.writeFile(dest, attachment.body);
    } else {
      return undefined;
    }
    const stat = await fs.promises.stat(dest);
    return {
      name: attachment.name,
      contentType: attachment.contentType,
      href: `attachments/${fileName}`,
      size: stat.size,
    };
  }
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderReport(data: ReportData): string {
  const dataJson = JSON.stringify(data).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(data.title)}</title>
<style>
  :root {
    --page: #0d0d0d;
    --surface: #1a1a19;
    --surface-2: #17191f;
    --border: rgba(255,255,255,0.10);
    --ink: #ffffff;
    --ink-2: #c3c2b7;
    --ink-muted: #898781;
    --grid: #2c2c2a;
    --axis: #383835;
    --accent: #3987e5;
    --accent-wash: rgba(57,135,229,0.14);
    --good: #0ca30c;
    --critical: #d03b3b;
    --warning: #fab219;
    --flaky: #9085e9;
    --cat-1: #3987e5; --cat-2: #d95926; --cat-3: #199e70; --cat-4: #c98500;
    --cat-5: #d55181; --cat-6: #1fae1f; --cat-7: #9085e9; --cat-8: #e66767;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--page);
    color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 14px;
    display: flex;
    min-height: 100vh;
  }
  svg { display: block; overflow: visible; }

  /* ---------- Sidebar ---------- */
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .brand { display: flex; align-items: center; gap: 10px; padding: 20px 18px; border-bottom: 1px solid var(--border); }
  .brand .mark {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent), #1c5cab);
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 16px; color: white;
  }
  .brand .word { font-weight: 800; font-size: 15px; letter-spacing: 0.02em; line-height: 1.1; }
  .brand .sub { font-size: 10px; color: var(--ink-muted); letter-spacing: 0.12em; }

  .nav-section { padding: 14px 10px 4px; }
  .nav-label { padding: 6px 10px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; color: var(--ink-muted); }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; margin: 1px 0; border-radius: 8px;
    color: var(--ink-2); font-size: 13px; cursor: pointer;
    border: 1px solid transparent; background: none; width: 100%; text-align: left;
  }
  .nav-item:hover { background: rgba(255,255,255,0.05); color: var(--ink); }
  .nav-item.active { background: var(--accent-wash); border-color: rgba(57,135,229,0.35); color: var(--ink); }
  .nav-item svg { width: 17px; height: 17px; flex-shrink: 0; }
  .nav-item .badge-dot {
    width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 9.5px; font-weight: 800; color: white;
  }
  .nav-item .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-item .count { font-size: 11px; color: var(--ink-muted); }
  .nav-item.status-failed .count { color: var(--critical); }

  .sidebar-footer { margin-top: auto; padding: 14px; border-top: 1px solid var(--border); }
  .status-pill {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; border-radius: 10px; font-size: 12px;
    border: 1px solid var(--border);
  }
  .status-pill.passed { background: rgba(12,163,12,0.12); color: var(--good); border-color: rgba(12,163,12,0.3); }
  .status-pill.failed { background: rgba(208,59,59,0.12); color: var(--critical); border-color: rgba(208,59,59,0.3); }
  .status-pill svg { width: 18px; height: 18px; }
  .status-pill .lines { display: flex; flex-direction: column; line-height: 1.2; }
  .status-pill .lines b { font-size: 12.5px; }
  .status-pill .lines span { font-size: 10px; color: var(--ink-muted); }

  /* ---------- Main ---------- */
  .main { flex: 1; min-width: 0; }
  .topbar {
    position: sticky; top: 0; z-index: 5;
    background: rgba(13,13,13,0.92); backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--border);
    padding: 18px 28px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  }
  .topbar h1 { margin: 0; font-size: 19px; }
  .topbar .subtitle { font-size: 12px; color: var(--ink-muted); margin-top: 2px; }
  .topbar-right { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  .env-info { font-size: 12px; color: var(--ink-muted); display: flex; flex-direction: column; gap: 3px; }
  .env-info .row span:first-child { display: inline-block; width: 84px; }
  .env-info b { color: var(--ink); font-weight: 600; }
  .env-badge {
    display: inline-block; padding: 1px 8px; border-radius: 999px;
    background: var(--accent-wash); color: var(--accent); font-weight: 700; font-size: 10.5px; letter-spacing: 0.04em;
  }
  .date-badge {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px;
    font-size: 11.5px; color: var(--ink-2);
  }
  .date-badge svg { width: 18px; height: 18px; color: var(--accent); }
  .date-badge b { display: block; color: var(--ink); font-size: 12.5px; }

  .content { padding: 24px 28px 56px; max-width: 1320px; margin: 0 auto; }
  .section-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.07em; color: var(--ink-2);
    margin: 26px 0 12px;
  }
  .section-title:first-child { margin-top: 0; }
  .section-title svg { width: 15px; height: 15px; color: var(--accent); }

  /* ---------- Stat cards ---------- */
  .stat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
  @media (max-width: 1000px) { .stat-grid { grid-template-columns: repeat(3, 1fr); } }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 14px; display: flex; flex-direction: column; gap: 10px;
  }
  .stat-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  .stat-icon svg { width: 18px; height: 18px; }
  .stat-icon.total { background: rgba(57,135,229,0.15); color: var(--accent); }
  .stat-icon.passed { background: rgba(12,163,12,0.15); color: var(--good); }
  .stat-icon.failed { background: rgba(208,59,59,0.15); color: var(--critical); }
  .stat-icon.flaky { background: rgba(144,133,233,0.15); color: var(--flaky); }
  .stat-icon.skipped { background: rgba(250,178,25,0.15); color: var(--warning); }
  .stat-icon.duration { background: rgba(57,135,229,0.15); color: var(--accent); }
  .stat-value { font-size: 24px; font-weight: 700; }
  .stat-label { font-size: 10.5px; color: var(--ink-muted); letter-spacing: 0.06em; }

  /* ---------- Charts ---------- */
  .chart-row { display: grid; grid-template-columns: 1fr 1.3fr 1fr; gap: 14px; align-items: stretch; }
  @media (max-width: 1000px) { .chart-row { grid-template-columns: 1fr; } }
  .chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; }
  .chart-card h3 { margin: 0 0 12px; font-size: 11.5px; letter-spacing: 0.06em; color: var(--ink-2); text-transform: uppercase; }
  .donut-wrap { display: flex; align-items: center; gap: 16px; flex: 1; }
  .donut-value { font-size: 22px; font-weight: 700; fill: var(--ink); font-family: system-ui, sans-serif; }
  .donut-sub { font-size: 9.5px; fill: var(--ink-muted); letter-spacing: 0.06em; }
  .legend { display: flex; flex-direction: column; gap: 8px; font-size: 12px; flex: 1; }
  .legend .item { display: flex; align-items: center; gap: 8px; }
  .legend .swatch { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .legend .name { flex: 1; color: var(--ink-2); }
  .legend .val { color: var(--ink); font-weight: 600; }

  .trend-axis-label { font-size: 9.5px; fill: var(--ink-muted); }
  .tooltip {
    position: fixed; pointer-events: none; z-index: 50;
    background: #0a0c10; border: 1px solid var(--border); border-radius: 8px;
    padding: 6px 10px; font-size: 11.5px; color: var(--ink);
    box-shadow: 0 6px 20px rgba(0,0,0,0.4); display: none; white-space: nowrap;
  }
  .tooltip b { display: block; font-size: 12px; }

  /* ---------- Tables ---------- */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .suites-table, .data-table { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  th { text-align: left; padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.06em; color: var(--ink-muted); background: var(--surface-2); border-bottom: 1px solid var(--border); }
  td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr.clickable { cursor: pointer; }
  tbody tr.clickable:hover { background: rgba(255,255,255,0.03); }
  .suite-cell { display: flex; align-items: center; gap: 10px; }
  .suite-cell .meta div:first-child { font-weight: 600; }
  .suite-cell .meta div:last-child { font-size: 11px; color: var(--ink-muted); font-family: ui-monospace, monospace; }
  .initial-badge { width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: white; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .status-badge.passed { background: rgba(12,163,12,0.15); color: var(--good); }
  .status-badge.failed { background: rgba(208,59,59,0.15); color: var(--critical); }
  .status-badge.flaky { background: rgba(144,133,233,0.15); color: var(--flaky); }
  .status-badge.skipped { background: rgba(250,178,25,0.15); color: var(--warning); }
  .num { font-variant-numeric: tabular-nums; }
  .num.passed { color: var(--good); } .num.failed { color: var(--critical); }
  .num.flaky { color: var(--flaky); } .num.skipped { color: var(--warning); }

  /* ---------- Suite / test detail ---------- */
  .back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--accent); font-size: 12.5px; cursor: pointer; margin-bottom: 14px; background: none; border: none; padding: 0; }
  .back-link svg { width: 14px; height: 14px; }
  .suite-header { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .suite-header .initial-badge { width: 44px; height: 44px; font-size: 15px; border-radius: 12px; }
  .suite-header h2 { margin: 0; font-size: 17px; }
  .suite-header .file { font-size: 11.5px; color: var(--ink-muted); font-family: ui-monospace, monospace; margin-top: 2px; }
  .suite-header .stats { margin-left: auto; display: flex; gap: 18px; font-size: 12px; color: var(--ink-2); }
  .suite-header .stats b { display: block; font-size: 16px; color: var(--ink); }

  .test-row { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
  .test-head { padding: 11px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .test-title { flex: 1; }
  .test-duration { color: var(--ink-muted); font-size: 12px; }
  .test-body { display: none; padding: 4px 14px 16px 40px; }
  .test-row.open .test-body { display: block; }

  .step { padding: 4px 0; font-size: 12.5px; color: var(--ink-muted); border-bottom: 1px dashed rgba(255,255,255,0.06); }
  .step.err { color: var(--critical); }
  .step .step-title { color: var(--ink); }
  .step-children { margin-left: 16px; }

  pre.code-block {
    background: #0a0c10; border: 1px solid var(--border); color: var(--ink-2);
    padding: 10px 12px; border-radius: 8px; font-size: 12px; overflow-x: auto;
    white-space: pre-wrap; margin: 8px 0; font-family: ui-monospace, monospace;
  }
  pre.code-block.error { border-color: rgba(208,59,59,0.35); color: #ff8a97; }

  .attachments { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .attachments a {
    color: var(--accent); font-size: 12px; text-decoration: none;
    border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px;
  }
  .attachments a:hover { border-color: var(--accent); }

  /* ---------- filter/search ---------- */
  .controls { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
  .controls input[type="text"] {
    flex: 1 1 220px; background: var(--surface); border: 1px solid var(--border); color: var(--ink);
    border-radius: 8px; padding: 8px 12px; font-size: 13px;
  }
  .filter-btn { background: var(--surface); border: 1px solid var(--border); color: var(--ink-muted); border-radius: 8px; padding: 7px 12px; font-size: 12px; cursor: pointer; }
  .filter-btn.active { color: var(--ink); border-color: var(--accent); }

  /* ---------- Environment / Browser / Downloads ---------- */
  .kv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (max-width: 800px) { .kv-grid { grid-template-columns: 1fr; } }
  .kv-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; gap: 12px; }
  .kv-card .k { font-size: 11px; color: var(--ink-muted); }
  .kv-card .v { font-size: 13px; font-weight: 600; text-align: right; word-break: break-all; }

  /* ---------- Screenshots ---------- */
  .shot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
  .shot-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; text-decoration: none; display: block; }
  .shot-card img { width: 100%; height: 140px; object-fit: cover; display: block; background: #000; }
  .shot-card .cap { padding: 8px 10px; font-size: 11.5px; color: var(--ink-2); border-top: 3px solid var(--border); }
  .shot-card .cap .t { color: var(--ink); font-weight: 600; display: block; margin-bottom: 2px; }
  .shot-card.passed .cap { border-top-color: var(--good); }
  .shot-card.failed .cap { border-top-color: var(--critical); }
  .shot-card.flaky .cap { border-top-color: var(--flaky); }
  .shot-card.skipped .cap { border-top-color: var(--warning); }

  /* ---------- Logs ---------- */
  .log-entry { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
  .log-head { padding: 11px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .log-body { display: none; padding: 0 14px 14px; }
  .log-entry.open .log-body { display: block; }
  .log-body h4 { margin: 10px 0 4px; font-size: 10.5px; color: var(--ink-muted); letter-spacing: 0.06em; }

  .empty { color: var(--ink-muted); text-align: center; padding: 60px 0; font-size: 13px; }
</style>
</head>
<body>
<aside class="sidebar">
  <div class="brand">
    <div class="mark">R</div>
    <div>
      <div class="word">RSR</div>
      <div class="sub">LOGISTICS</div>
    </div>
  </div>
  <div class="nav-section" id="navOverview"></div>
  <div class="nav-section">
    <div class="nav-label">Test Suites</div>
    <div id="navSuites"></div>
  </div>
  <div class="nav-section">
    <div class="nav-label">Report Details</div>
    <div id="navDetails"></div>
  </div>
  <div class="sidebar-footer" id="sidebarFooter"></div>
</aside>
<main class="main">
  <div class="topbar">
    <div>
      <h1>${esc(data.title)}</h1>
      <div class="subtitle">${esc(data.subtitle)}</div>
    </div>
    <div class="topbar-right">
      <div class="env-info" id="topEnvInfo"></div>
      <div class="date-badge" id="topDateBadge"></div>
    </div>
  </div>
  <div class="content" id="content"></div>
</main>
<div class="tooltip" id="tooltip"></div>
<script>
const DATA = ${dataJson};

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.3" width="6" height="3" rx="1"/><path d="M9 11h6M9 15h6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.6 2.6L16 9"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  bug: '<path d="M9 8V6a3 3 0 0 1 6 0v2"/><rect x="6" y="8" width="12" height="10" rx="5"/><path d="M6 12H3M21 12h-3M8 5 6 3M16 5l2-2M9 18l-2 2M15 18l2 2M12 8v10"/>',
  slash: '<circle cx="12" cy="12" r="9"/><path d="M6.5 6.5l11 11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7" cy="7" r="0.9" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="0.9" fill="currentColor" stroke="none"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5.5-5.5L4 21"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  chevronLeft: '<path d="M14 5l-7 7 7 7"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
};
function svg(name, cls) {
  return '<svg class="' + (cls||'') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name]||ICONS.file) + '</svg>';
}
const CAT_COLORS = ['var(--cat-1)','var(--cat-2)','var(--cat-3)','var(--cat-4)','var(--cat-5)','var(--cat-6)','var(--cat-7)','var(--cat-8)'];
function catColor(i) { return CAT_COLORS[i % CAT_COLORS.length]; }
function initials(label) {
  const words = label.split(/\\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
function fmtDuration(ms) {
  if (ms < 1000) return ms + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  return Math.floor(ms / 60000) + "m " + Math.round((ms % 60000) / 1000) + "s";
}
function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}
function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }

const tooltipEl = document.getElementById("tooltip");
function showTooltip(x, y, html) {
  tooltipEl.innerHTML = html;
  tooltipEl.style.display = "block";
  const rect = tooltipEl.getBoundingClientRect();
  tooltipEl.style.left = Math.min(x + 12, window.innerWidth - rect.width - 12) + "px";
  tooltipEl.style.top = Math.max(y - rect.height - 12, 8) + "px";
}
function hideTooltip() { tooltipEl.style.display = "none"; }

/* ---------------- charts ---------------- */
function buildDonut(segments, opts) {
  opts = opts || {};
  const size = opts.size || 150, thickness = opts.thickness || 22;
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const visible = segments.filter((s) => s.value > 0);
  const gapDeg = visible.length > 1 ? 2.4 : 0;
  let cursor = -90;
  let paths = "";
  visible.forEach((s, i) => {
    const fraction = s.value / (total || 1);
    const sweep = Math.max(fraction * 360 - gapDeg, 0);
    const dash = (sweep / 360) * circumference;
    const gapDash = circumference - dash;
    paths += '<circle class="donut-seg" data-i="' + i + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="' + thickness + '" stroke-dasharray="' + dash.toFixed(1) + ' ' + gapDash.toFixed(1) + '" transform="rotate(' + cursor + ' ' + cx + ' ' + cy + ')"><title>' + s.label + ': ' + s.value + ' (' + pct(s.value, total) + '%)</title></circle>';
    cursor += fraction * 360;
  });
  if (!visible.length) {
    paths = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--grid)" stroke-width="' + thickness + '"/>';
  }
  const centerVal = opts.centerValue != null ? opts.centerValue : total;
  const centerSub = opts.centerSub || "TOTAL";
  return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' + paths +
    '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" class="donut-value">' + centerVal + '</text>' +
    '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" class="donut-sub">' + centerSub + '</text>' +
    '</svg>';
}

function buildTrend(points, width, height) {
  const padding = { top: 14, right: 14, bottom: 26, left: 34 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxV = Math.max.apply(null, points.map((p) => p.value).concat([1]));
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padding.left + stepX * i,
    y: padding.top + innerH - (p.value / maxV) * innerH,
    label: p.label, value: p.value,
  }));
  const tickCount = 4;
  let ticks = "";
  for (let i = 0; i <= tickCount; i++) {
    const v = (maxV * i) / tickCount;
    const y = padding.top + innerH - (i / tickCount) * innerH;
    ticks += '<line x1="' + padding.left + '" y1="' + y.toFixed(1) + '" x2="' + (width - padding.right) + '" y2="' + y.toFixed(1) + '" stroke="var(--grid)" stroke-width="1"/>';
    ticks += '<text x="' + (padding.left - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" class="trend-axis-label">' + Math.round(v / 1000) + 's</text>';
  }
  const linePath = coords.map((c, i) => (i === 0 ? "M" : "L") + c.x.toFixed(1) + "," + c.y.toFixed(1)).join(" ");
  const baseY = (padding.top + innerH).toFixed(1);
  const areaPath = coords.length ? linePath + " L" + coords[coords.length - 1].x.toFixed(1) + "," + baseY + " L" + coords[0].x.toFixed(1) + "," + baseY + " Z" : "";
  let dots = "";
  coords.forEach((c, i) => {
    dots += '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>';
    dots += '<circle class="trend-hit" data-i="' + i + '" cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="14" fill="transparent" style="cursor:pointer"/>';
  });
  const labels = coords.map((c) => '<text x="' + c.x.toFixed(1) + '" y="' + (height - 8) + '" text-anchor="middle" class="trend-axis-label">' + esc(c.label.length > 10 ? c.label.slice(0, 9) + '…' : c.label) + '</text>').join("");
  const svgHtml = '<svg viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height + '">' +
    ticks +
    (areaPath ? '<path d="' + areaPath + '" fill="var(--accent)" opacity="0.14" stroke="none"/>' : '') +
    (linePath ? '<path d="' + linePath + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
    dots + labels +
    '</svg>';
  return { svgHtml, coords };
}

/* ---------------- view state ---------------- */
let currentView = "overview";

function statusColor(status) {
  return status === "passed" ? "var(--good)" : status === "failed" ? "var(--critical)" : status === "flaky" ? "var(--flaky)" : "var(--warning)";
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* ---------------- sidebar ---------------- */
function renderSidebar() {
  const navOverview = document.getElementById("navOverview");
  navOverview.innerHTML = "";
  const overviewBtn = el("button", "nav-item" + (currentView === "overview" ? " active" : ""), svg("home") + '<span class="label">Overview</span>');
  overviewBtn.addEventListener("click", () => setView("overview"));
  navOverview.appendChild(overviewBtn);

  const navSuites = document.getElementById("navSuites");
  navSuites.innerHTML = "";
  DATA.suites.forEach((s) => {
    const active = currentView === "suite:" + s.id;
    const btn = el("button", "nav-item" + (active ? " active" : "") + (s.status === "failed" ? " status-failed" : ""),
      '<span class="badge-dot" style="background:' + catColor(s.badgeIndex) + '">' + initials(s.navLabel) + '</span>' +
      '<span class="label">' + esc(s.navLabel) + '</span>' +
      '<span class="count">' + s.tests.length + '</span>');
    btn.addEventListener("click", () => setView("suite:" + s.id));
    navSuites.appendChild(btn);
  });

  const details = [
    ["environment", "server", "Environment"],
    ["browser", "monitor", "Browser"],
    ["screenshots", "image", "Screenshots"],
    ["logs", "terminal", "Logs"],
    ["downloads", "download", "Downloads"],
  ];
  const navDetails = document.getElementById("navDetails");
  navDetails.innerHTML = "";
  details.forEach(([id, icon, label]) => {
    const btn = el("button", "nav-item" + (currentView === id ? " active" : ""), svg(icon) + '<span class="label">' + label + '</span>');
    btn.addEventListener("click", () => setView(id));
    navDetails.appendChild(btn);
  });

  const footer = document.getElementById("sidebarFooter");
  footer.innerHTML = "";
  const pill = el("div", "status-pill " + DATA.overallStatus,
    svg("shield") +
    '<span class="lines"><b>' + (DATA.overallStatus === "passed" ? "PASSED" : "FAILED") + '</b><span>Overall Status</span></span>');
  footer.appendChild(pill);
}

function renderTopbar() {
  const envInfo = document.getElementById("topEnvInfo");
  envInfo.innerHTML =
    '<div class="row"><span>Environment:</span> <span class="env-badge">' + esc(DATA.env.TEST_ENV) + '</span></div>' +
    '<div class="row"><span>Base URL:</span> <b>' + esc(DATA.env.BASE_URL || "-") + '</b></div>' +
    '<div class="row"><span>Executed By:</span> <b>' + esc(DATA.env["Executed By"]) + '</b></div>';

  const d = new Date(DATA.generatedAt);
  const dateBadge = document.getElementById("topDateBadge");
  dateBadge.innerHTML = svg("calendar") +
    '<span><b>' + d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) + '</b>' + d.toLocaleTimeString() + '</span>';
}

/* ---------------- overview ---------------- */
function renderOverview(container) {
  container.appendChild(el("div", "section-title", svg("clock") + "Execution Summary"));

  const s = DATA.summary;
  const statGrid = el("div", "stat-grid");
  const stats = [
    ["total", "clipboard", "Total Tests", s.total],
    ["passed", "check", "Passed", s.passed],
    ["failed", "x", "Failed", s.failed],
    ["flaky", "bug", "Flaky", s.flaky],
    ["skipped", "slash", "Skipped", s.skipped],
    ["duration", "clock", "Duration", fmtDuration(s.duration)],
  ];
  stats.forEach(([cls, icon, label, value]) => {
    statGrid.appendChild(el("div", "stat-card",
      '<div class="stat-icon ' + cls + '">' + svg(icon) + '</div>' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="stat-label">' + label.toUpperCase() + '</div>'));
  });
  container.appendChild(statGrid);

  container.appendChild(el("div", "section-title", "Charts"));
  const chartRow = el("div", "chart-row");

  const distSegs = [
    { label: "Passed", value: s.passed, color: "var(--good)" },
    { label: "Failed", value: s.failed, color: "var(--critical)" },
    { label: "Flaky", value: s.flaky, color: "var(--flaky)" },
    { label: "Skipped", value: s.skipped, color: "var(--warning)" },
  ];
  const distCard = el("div", "chart-card", '<h3>Test Status Distribution</h3>');
  const distWrap = el("div", "donut-wrap");
  distWrap.innerHTML = buildDonut(distSegs, { size: 150, thickness: 22, centerValue: s.total, centerSub: "TOTAL" });
  const distLegend = el("div", "legend");
  distSegs.forEach((seg) => {
    distLegend.appendChild(el("div", "item",
      '<span class="swatch" style="background:' + seg.color + '"></span>' +
      '<span class="name">' + seg.label + '</span>' +
      '<span class="val">' + seg.value + ' (' + pct(seg.value, s.total) + '%)</span>'));
  });
  distWrap.appendChild(distLegend);
  distCard.appendChild(distWrap);
  chartRow.appendChild(distCard);

  const trendCard = el("div", "chart-card", '<h3>Duration Trend</h3>');
  const trendHost = el("div");
  const points = DATA.suites.map((su) => ({ label: su.navLabel, value: su.duration }));
  const trend = buildTrend(points, 380, 190);
  trendHost.innerHTML = trend.svgHtml;
  trendCard.appendChild(trendHost);
  chartRow.appendChild(trendCard);
  setTimeout(() => {
    trendHost.querySelectorAll(".trend-hit").forEach((hit) => {
      const c = trend.coords[Number(hit.dataset.i)];
      hit.addEventListener("mouseenter", (e) => {
        const r = hit.getBoundingClientRect();
        showTooltip(r.left, r.top, "<b>" + esc(c.label) + "</b>" + fmtDuration(c.value));
      });
      hit.addEventListener("mouseleave", hideTooltip);
    });
  }, 0);

  const passRate = pct(s.passed, s.total);
  const outcomeCard = el("div", "chart-card", '<h3>Test Outcome</h3>');
  const outcomeWrap = el("div", "donut-wrap");
  outcomeWrap.innerHTML = buildDonut(
    [{ label: "Pass", value: s.passed, color: "var(--good)" }, { label: "Other", value: s.total - s.passed, color: "var(--critical)" }],
    { size: 150, thickness: 22, centerValue: passRate + "%", centerSub: "PASS RATE" }
  );
  const outcomeLegend = el("div", "legend",
    '<div class="item"><span class="swatch" style="background:var(--good)"></span><span class="name">Pass Rate</span><span class="val">' + passRate + '%</span></div>' +
    '<div class="item"><span class="swatch" style="background:var(--critical)"></span><span class="name">Fail Rate</span><span class="val">' + (100 - passRate) + '%</span></div>');
  outcomeWrap.appendChild(outcomeLegend);
  outcomeCard.appendChild(outcomeWrap);
  chartRow.appendChild(outcomeCard);

  container.appendChild(chartRow);

  container.appendChild(el("div", "section-title", "Test Suites"));
  const table = el("div", "suites-table");
  const t = document.createElement("table");
  t.innerHTML = "<thead><tr><th>#</th><th>Test Suite</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Duration</th><th>Status</th></tr></thead>";
  const tbody = document.createElement("tbody");
  DATA.suites.forEach((su, i) => {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    tr.innerHTML =
      "<td>" + (i + 1) + "</td>" +
      '<td><div class="suite-cell"><span class="initial-badge" style="background:' + catColor(su.badgeIndex) + '">' + initials(su.navLabel) + '</span>' +
      '<div class="meta"><div>' + esc(su.displayName) + '</div><div>' + esc(su.file) + '</div></div></div></td>' +
      '<td class="num">' + su.tests.length + '</td>' +
      '<td class="num passed">' + su.counts.passed + '</td>' +
      '<td class="num failed">' + su.counts.failed + '</td>' +
      '<td class="num skipped">' + su.counts.skipped + '</td>' +
      '<td class="num">' + fmtDuration(su.duration) + '</td>' +
      '<td><span class="status-badge ' + su.status + '">' + su.status + '</span></td>';
    tr.addEventListener("click", () => setView("suite:" + su.id));
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);
  table.appendChild(t);
  container.appendChild(table);
}

/* ---------------- suite detail ---------------- */
function renderSteps(steps) {
  if (!steps.length) return "";
  return '<div class="step-children">' + steps.map((s) => {
    const errCls = s.error ? " err" : "";
    let out = '<div class="step' + errCls + '"><span class="step-title">' + esc(s.title) + '</span> <span>' + fmtDuration(s.duration) + '</span></div>';
    if (s.error) out += '<pre class="code-block error">' + esc(s.error) + '</pre>';
    out += renderSteps(s.steps);
    return out;
  }).join("") + "</div>";
}

function buildTestRow(t) {
  const row = el("div", "test-row");
  row.dataset.status = t.status;
  row.dataset.title = (t.titlePath || t.title).toLowerCase();

  const head = el("div", "test-head",
    '<span class="status-badge ' + t.status + '">' + t.status + '</span>' +
    '<span class="test-title">' + esc(t.titlePath || t.title) + '</span>' +
    '<span class="test-duration">' + fmtDuration(t.duration) + (t.retries ? " · " + t.retries + " retr" + (t.retries > 1 ? "ies" : "y") : "") + '</span>');
  head.addEventListener("click", () => row.classList.toggle("open"));
  row.appendChild(head);

  const body = el("div", "test-body");
  t.errors.forEach((e) => body.appendChild(el("pre", "code-block error", esc(e))));
  if (t.steps.length) body.appendChild(el("div", "", renderSteps(t.steps)));
  if (t.stdout) { body.appendChild(el("div", "", '<div style="font-size:10.5px;color:var(--ink-muted);margin-top:8px;">STDOUT</div>')); body.appendChild(el("pre", "code-block", esc(t.stdout))); }
  if (t.stderr) { body.appendChild(el("div", "", '<div style="font-size:10.5px;color:var(--ink-muted);margin-top:8px;">STDERR</div>')); body.appendChild(el("pre", "code-block", esc(t.stderr))); }
  if (t.attachments.length) {
    const attWrap = el("div", "attachments");
    t.attachments.forEach((a) => {
      const link = document.createElement("a");
      link.href = a.href; link.target = "_blank"; link.rel = "noopener"; link.textContent = a.name;
      attWrap.appendChild(link);
    });
    body.appendChild(attWrap);
  }
  row.appendChild(body);
  return row;
}

function renderSuite(container, suiteId) {
  const suite = DATA.suites.find((s) => s.id === suiteId);
  if (!suite) { container.appendChild(el("div", "empty", "Suite not found.")); return; }

  const back = el("button", "back-link", svg("chevronLeft") + "Back to Overview");
  back.addEventListener("click", () => setView("overview"));
  container.appendChild(back);

  container.appendChild(el("div", "suite-header",
    '<span class="initial-badge" style="background:' + catColor(suite.badgeIndex) + '">' + initials(suite.navLabel) + '</span>' +
    '<div><h2>' + esc(suite.displayName) + '</h2><div class="file">' + esc(suite.file) + '</div></div>' +
    '<div class="stats">' +
    '<div><b>' + suite.tests.length + '</b>Tests</div>' +
    '<div><b class="num passed">' + suite.counts.passed + '</b>Passed</div>' +
    '<div><b class="num failed">' + suite.counts.failed + '</b>Failed</div>' +
    '<div><b>' + fmtDuration(suite.duration) + '</b>Duration</div>' +
    '</div>' +
    '<span class="status-badge ' + suite.status + '">' + suite.status + '</span>'));

  const list = el("div");
  suite.tests.forEach((t) => list.appendChild(buildTestRow(t)));
  container.appendChild(list);
}

/* ---------------- environment / browser ---------------- */
function renderEnvironment(container) {
  container.appendChild(el("div", "section-title", svg("server") + "Environment"));
  const grid = el("div", "kv-grid");
  const rows = Object.assign({}, DATA.env, {
    "Generated At": new Date(DATA.generatedAt).toLocaleString(),
    "Total Duration": fmtDuration(DATA.summary.duration),
    "Overall Status": DATA.overallStatus.toUpperCase(),
  });
  Object.entries(rows).forEach(([k, v]) => {
    grid.appendChild(el("div", "kv-card", '<span class="k">' + esc(k) + '</span><span class="v">' + esc(String(v) || "-") + '</span>'));
  });
  container.appendChild(grid);
}

function renderBrowser(container) {
  container.appendChild(el("div", "section-title", svg("monitor") + "Browser & Projects"));
  const table = el("div", "data-table");
  const t = document.createElement("table");
  t.innerHTML = "<thead><tr><th>Project</th><th>Browser / Device</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Duration</th></tr></thead>";
  const tbody = document.createElement("tbody");
  DATA.projects.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td>" + esc(p.name) + "</td><td>" + esc(p.browserName) + "</td><td class='num'>" + p.testCount + "</td>" +
      "<td class='num passed'>" + p.passed + "</td><td class='num failed'>" + p.failed + "</td><td class='num'>" + fmtDuration(p.duration) + "</td>";
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);
  table.appendChild(t);
  container.appendChild(table);
}

/* ---------------- screenshots / logs / downloads ---------------- */
function allTests() {
  const out = [];
  DATA.suites.forEach((s) => s.tests.forEach((t) => out.push({ suite: s, test: t })));
  return out;
}

function renderScreenshots(container) {
  container.appendChild(el("div", "section-title", svg("image") + "Screenshots"));
  const grid = el("div", "shot-grid");
  let count = 0;
  allTests().forEach(({ suite, test }) => {
    test.attachments.filter((a) => a.contentType.startsWith("image/")).forEach((a) => {
      count++;
      const card = document.createElement("a");
      card.href = a.href; card.target = "_blank"; card.rel = "noopener";
      card.className = "shot-card " + test.status;
      card.innerHTML = '<img src="' + a.href + '" loading="lazy"/>' +
        '<div class="cap"><span class="t">' + esc(suite.navLabel) + '</span>' + esc(test.title) + '</div>';
      grid.appendChild(card);
    });
  });
  if (!count) { container.appendChild(el("div", "empty", "No screenshots captured in this run.")); return; }
  container.appendChild(grid);
}

function renderLogs(container) {
  container.appendChild(el("div", "section-title", svg("terminal") + "Logs"));
  let count = 0;
  const list = el("div");
  allTests().forEach(({ suite, test }) => {
    if (!test.stdout && !test.stderr) return;
    count++;
    const entry = el("div", "log-entry");
    const head = el("div", "log-head",
      '<span class="status-badge ' + test.status + '">' + test.status + '</span>' +
      '<span class="test-title">' + esc(suite.navLabel) + ' &rsaquo; ' + esc(test.title) + '</span>');
    head.addEventListener("click", () => entry.classList.toggle("open"));
    entry.appendChild(head);
    const body = el("div", "log-body");
    if (test.stdout) { body.appendChild(el("h4", "", "STDOUT")); body.appendChild(el("pre", "code-block", esc(test.stdout))); }
    if (test.stderr) { body.appendChild(el("h4", "", "STDERR")); body.appendChild(el("pre", "code-block", esc(test.stderr))); }
    entry.appendChild(body);
    list.appendChild(entry);
  });
  if (!count) { container.appendChild(el("div", "empty", "No console output captured in this run.")); return; }
  container.appendChild(list);
}

function renderDownloads(container) {
  container.appendChild(el("div", "section-title", svg("download") + "Downloads"));
  const table = el("div", "data-table");
  const t = document.createElement("table");
  t.innerHTML = "<thead><tr><th>File</th><th>Suite / Test</th><th>Type</th><th>Size</th><th>Actions</th></tr></thead>";
  const tbody = document.createElement("tbody");
  let count = 0;
  allTests().forEach(({ suite, test }) => {
    test.attachments.forEach((a) => {
      count++;
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + esc(a.name) + "</td>" +
        "<td>" + esc(suite.navLabel) + " &rsaquo; " + esc(test.title) + "</td>" +
        "<td>" + esc(a.contentType) + "</td>" +
        "<td class='num'>" + fmtBytes(a.size) + "</td>" +
        "<td><a href='" + a.href + "' target='_blank' rel='noopener' style='color:var(--accent);margin-right:12px;'>Open</a>" +
        "<a href='" + a.href + "' download='" + esc(a.name) + "' style='color:var(--accent);'>Download</a></td>";
      tbody.appendChild(tr);
    });
  });
  t.appendChild(tbody);
  table.appendChild(t);
  if (!count) { container.appendChild(el("div", "empty", "No attachments in this run.")); return; }
  container.appendChild(table);
}

/* ---------------- router ---------------- */
function setView(view) {
  currentView = view;
  renderSidebar();
  const container = document.getElementById("content");
  container.innerHTML = "";
  if (view === "overview") renderOverview(container);
  else if (view.startsWith("suite:")) renderSuite(container, view.slice(6));
  else if (view === "environment") renderEnvironment(container);
  else if (view === "browser") renderBrowser(container);
  else if (view === "screenshots") renderScreenshots(container);
  else if (view === "logs") renderLogs(container);
  else if (view === "downloads") renderDownloads(container);
  window.scrollTo(0, 0);
}

renderTopbar();
setView("overview");
</script>
</body>
</html>`;
}
