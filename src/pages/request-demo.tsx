import Layout from "../components/Layout";
import Link from "next/link";
import SectionHeader from "../components/SectionHeader";

export default function RequestDemo() {
  return (
    <Layout>
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="lg:col-span-7">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/20 bg-white py-1 pl-2 pr-3 text-xs text-brand-deep">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
            Demo request
          </div>

          <div className="mt-5">
            <SectionHeader
              as="h1"
              size="xl"
              title="Book a demo"
              description="Tell us what you’re trying to launch and we’ll tailor a walkthrough across AIXcelerator, Agents, MCP, and the modular capability layers."
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:info@colaberry.com?subject=Colaberry%20AI%20Demo%20Request"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 bg-gradient-to-r from-brand-blue to-brand-aqua px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-brand-deep hover:to-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
            >
              Email to book a demo
            </a>
            <Link
              href="/aixcelerator"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
            >
              Explore platform
            </Link>
          </div>

          <div className="surface-panel mt-8 p-6">
            <SectionHeader
              kicker="What we can cover"
              title="Demo agenda highlights"
              description="Key topics we can tailor to your workflows and stakeholders."
              size="md"
            />
            <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <Bullet>Agent catalog + rollout readiness</Bullet>
              <Bullet>MCP server library + integrations</Bullet>
              <Bullet>Industry workspaces + case studies</Bullet>
              <Bullet>Governance, controls, and audit trails</Bullet>
              <Bullet>Modular layers: resources, playbooks, aggregation</Bullet>
              <Bullet>Roadmap and next-step implementation</Bullet>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="surface-panel p-6">
            <div className="text-base font-semibold text-slate-900">Suggested demo flow</div>
            <div className="mt-1 text-sm text-slate-600">A clean, consistent walkthrough for stakeholders.</div>
            <div className="mt-5 grid gap-3 text-sm text-slate-700">
              <Step n="1" title="Core platform" body="AIXcelerator + Agents + MCP" />
              <Step n="2" title="Industry workspace" body="Case studies and domain context" />
              <Step n="3" title="Modular layers" body="Resources, playbooks, news/product" />
              <Step n="4" title="Deployment" body="Governance, audit, reliability" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-aqua" />
      <span>{children}</span>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
        {n}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-0.5 text-sm text-slate-600">{body}</div>
      </div>
    </div>
  );
}
