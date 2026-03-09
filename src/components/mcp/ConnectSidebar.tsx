import { useState } from "react";
import type { MCPServer } from "../../lib/cms";
import CopyButton from "./CopyButton";
import GitHubStats from "./GitHubStats";

type ConnectSidebarProps = {
  mcp: MCPServer;
};

export default function ConnectSidebar({ mcp }: ConnectSidebarProps) {
  const [connectTab, setConnectTab] = useState<"agents" | "humans">("agents");

  const publishedLabel = (() => {
    const d = mcp.publishedDate || mcp.lastUpdated;
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  })();

  const repoMatch = mcp.sourceUrl?.match(/github\.com\/([^/]+)\/([^/]+)/);
  const repoDisplay = repoMatch ? `${repoMatch[1]}/${repoMatch[2].replace(/\.git$/, "")}` : null;
  const homepageDisplay = mcp.homepageUrl || mcp.tryItNowUrl;

  const agentPrompt =
    mcp.connectionPrompt ||
    (mcp.connectionUrl
      ? `Connect to ${mcp.name} using ${mcp.connectionUrl}`
      : mcp.installCommand
        ? `Install ${mcp.name}: ${mcp.installCommand}`
        : null);

  const hasConnectionUrl = Boolean(mcp.connectionUrl);
  const hasAgentPrompt = Boolean(agentPrompt);
  const hasConnectSection = hasConnectionUrl || hasAgentPrompt || Boolean(mcp.installCommand);

  return (
    <aside className="surface-panel rounded-xl p-6 lg:sticky lg:top-[136px] space-y-6">
      {/* Connection URL */}
      {hasConnectionUrl && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Get connection URL
          </h3>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
            <code className="flex-1 truncate text-sm font-mono text-zinc-900 dark:text-zinc-100">
              {mcp.connectionUrl}
            </code>
            <CopyButton text={mcp.connectionUrl!} />
          </div>
        </div>
      )}

      {/* Connect your agent — Agents / Humans tabs */}
      {hasConnectSection && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {hasConnectionUrl ? "Or connect your agent" : "Connect your agent"}
          </h3>
          <div className="mt-3 flex gap-0 border-b border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setConnectTab("agents")}
              className={`px-4 py-2 text-xs font-semibold transition-colors ${
                connectTab === "agents"
                  ? "border-b-2 border-[#DC2626] text-zinc-900 dark:border-red-400 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Agents
            </button>
            <button
              type="button"
              onClick={() => setConnectTab("humans")}
              className={`px-4 py-2 text-xs font-semibold transition-colors ${
                connectTab === "humans"
                  ? "border-b-2 border-[#DC2626] text-zinc-900 dark:border-red-400 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Humans
            </button>
          </div>

          {connectTab === "agents" && (
            <div className="mt-3 space-y-3">
              {hasAgentPrompt && (
                <>
                  <div className="text-[0.6875rem] font-semibold text-zinc-500 dark:text-zinc-400">
                    Connection Prompt
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-mono break-all">
                        {agentPrompt}
                      </p>
                      <CopyButton text={agentPrompt!} />
                    </div>
                  </div>
                </>
              )}
              {mcp.docsUrl && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Building a client or agent?{" "}
                  <a
                    href={mcp.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#DC2626] hover:underline dark:text-red-400"
                  >
                    View developer docs
                  </a>
                </p>
              )}
            </div>
          )}

          {connectTab === "humans" && (
            <div className="mt-3 space-y-3">
              {mcp.installCommand ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">Quick install</span>
                    <CopyButton text={mcp.installCommand} />
                  </div>
                  <pre className="overflow-x-auto px-3 pb-3 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 font-mono">
                    <code>{mcp.installCommand}</code>
                  </pre>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  See the API tab below for full setup instructions.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        {publishedLabel && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2.5" width="12" height="12" rx="2" /><path d="M5 1v3M11 1v3M2 6.5h12" /></svg>
            <span className="text-zinc-500 dark:text-zinc-400">Published</span>
            <span className="ml-auto font-medium text-zinc-900 dark:text-zinc-100">{publishedLabel}</span>
          </div>
        )}
        {repoDisplay && mcp.sourceUrl && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 8 .2Z" /></svg>
            <span className="text-zinc-500 dark:text-zinc-400">Repository</span>
            <a href={mcp.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto truncate text-[#DC2626] hover:underline dark:text-red-400 max-w-[180px]">
              {repoDisplay}
            </a>
          </div>
        )}
        {homepageDisplay && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M10 2h4v4M7 9l7-7" /></svg>
            <span className="text-zinc-500 dark:text-zinc-400">Homepage</span>
            <a href={homepageDisplay} target="_blank" rel="noreferrer" className="ml-auto truncate text-[#DC2626] hover:underline dark:text-red-400 max-w-[180px]">
              {new URL(homepageDisplay).hostname}
            </a>
          </div>
        )}
        {typeof mcp.usageCount === "number" && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v10M4.5 9.5 8 13l3.5-3.5" /><path d="M2 2h12" /></svg>
            <span className="text-zinc-500 dark:text-zinc-400">Installs</span>
            <span className="ml-auto font-medium text-zinc-900 dark:text-zinc-100">{mcp.usageCount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <GitHubStats sourceUrl={mcp.sourceUrl} />
        </div>
      </div>

      {/* Resource links */}
      {(mcp.docsUrl || mcp.sourceUrl || mcp.tryItNowUrl) && (
        <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          {mcp.docsUrl && (
            <a href={mcp.docsUrl} target="_blank" rel="noreferrer" className="btn btn-secondary w-full text-center text-sm">
              View documentation
            </a>
          )}
          {mcp.sourceUrl && (
            <a href={mcp.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost w-full text-center text-sm">
              View source
            </a>
          )}
          {mcp.tryItNowUrl && (
            <a href={mcp.tryItNowUrl} target="_blank" rel="noreferrer" className="btn btn-cta w-full text-center text-sm">
              Try it now
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
