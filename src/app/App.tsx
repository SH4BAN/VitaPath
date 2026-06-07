import { useEffect, useRef, useState } from "react";
import {
  Home,
  LogOut,
  Heart,
  Stethoscope,
  ClipboardList,
  Activity,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Shield,
  Lock,
  Baby,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Phone,
  Wifi,
  WifiOff,
  Mic,
  Send,
  Plus,
  Download,
  User,
  X,
  TrendingUp,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Zap,
  Users,
  MoreHorizontal,
  Building2,
  Syringe,
  Info,
  Check,
  RefreshCw,
  MapPin,
  Star,
  FileText,
  Mail,
  QrCode,
  ShieldCheck,
  Fingerprint,
  CalendarDays,
  Thermometer,
  AlertOctagon,
  ScanLine,
  Bot,
  Target,
  BadgeAlert,
  UserCheck,
  HeartPulse,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { io, type Socket } from "socket.io-client";
import {
  apiRequest,
  clearSession,
  getStoredToken,
  getStoredUser,
  login,
  registerAccount,
  SOCKET_URL,
  storeSession,
  type SafeUser,
} from "./lib/api";

type Page =
  | "landing"
  | "login"
  | "parent"
  | "nurse"
  | "visit"
  | "timeline"
  | "ai-risk"
  | "admin"
  | "messaging"
  | "settings"
  | "passport"
  | "municipality"
  | "ai-report";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ElementType;
  group: string;
}


const SAFE_LOGO_SRC = "/vitapath-logo.png";

const navItems: NavItem[] = [
  { id: "landing", label: "Platform Overview", icon: Home, group: "Explore" },
  { id: "login", label: "Login / Auth", icon: Lock, group: "Explore" },
  { id: "parent", label: "Family Portal", icon: Heart, group: "Portals" },
  { id: "passport", label: "Health Passport", icon: Shield, group: "Portals" },
  { id: "nurse", label: "Nurse App", icon: Stethoscope, group: "Portals" },
  {
    id: "visit",
    label: "Home Visit Form",
    icon: ClipboardList,
    group: "Portals",
  },
  {
    id: "timeline",
    label: "Child Timeline",
    icon: Activity,
    group: "Clinical",
  },
  {
    id: "ai-risk",
    label: "AI Risk Detection",
    icon: AlertTriangle,
    group: "Clinical",
  },
  {
    id: "municipality",
    label: "Municipality Monitor",
    icon: Building2,
    group: "Management",
  },
  {
    id: "ai-report",
    label: "AI Weekly Report",
    icon: Zap,
    group: "Management",
  },
  {
    id: "admin",
    label: "Admin Dashboard",
    icon: BarChart3,
    group: "Management",
  },
  {
    id: "messaging",
    label: "Messaging",
    icon: MessageSquare,
    group: "Management",
  },
  { id: "settings", label: "Settings", icon: Settings, group: "Management" },
];

const pagesByRole: Record<SafeUser["role"], Page[]> = {
  parent: ["parent", "passport", "timeline", "messaging", "settings"],
  doctor: [
    "nurse",
    "passport",
    "visit",
    "timeline",
    "ai-risk",
    "messaging",
    "settings",
  ],
  municipality: ["municipality", "ai-report", "ai-risk", "settings"],
  admin: [
    "admin",
    "municipality",
    "ai-report",
    "ai-risk",
    "nurse",
    "messaging",
    "settings",
  ],
};

function allowedPagesFor(user: SafeUser | null): Page[] {
  if (!user) return ["landing", "login"];
  return pagesByRole[user.role];
}

function defaultPageFor(user: SafeUser | null): Page {
  if (!user) return "landing";
  if (user.role === "parent") return "parent";
  if (user.role === "doctor") return "nurse";
  if (user.role === "municipality") return "municipality";
  return "admin";
}

const vaccinationTrend = [
  { month: "Jan", rate: 88 },
  { month: "Feb", rate: 89 },
  { month: "Mar", rate: 87 },
  { month: "Apr", rate: 91 },
  { month: "May", rate: 93 },
  { month: "Jun", rate: 92 },
  { month: "Jul", rate: 94 },
  { month: "Aug", rate: 91 },
  { month: "Sep", rate: 95 },
  { month: "Oct", rate: 93 },
  { month: "Nov", rate: 94 },
  { month: "Dec", rate: 91 },
];

const municipalityData = [
  { name: "Pristina", coverage: 94, children: 12400 },
  { name: "Prizren", coverage: 91, children: 8200 },
  { name: "Ferizaj", coverage: 89, children: 4100 },
  { name: "Gjilan", coverage: 88, children: 5100 },
  { name: "Peja", coverage: 87, children: 4900 },
  { name: "Gjakova", coverage: 92, children: 3800 },
  { name: "Mitrovica", coverage: 83, children: 4700 },
];

const growthData = [
  { age: "3m", weight: 5.8, height: 60 },
  { age: "6m", weight: 7.5, height: 66 },
  { age: "9m", weight: 8.9, height: 71 },
  { age: "12m", weight: 9.8, height: 75 },
  { age: "15m", weight: 10.5, height: 79 },
  { age: "18m", weight: 11.2, height: 82 },
];

const aiRiskDistribution = [
  { label: "Low Risk", value: 38420, color: "#10B981" },
  { label: "Medium Risk", value: 7200, color: "#F59E0B" },
  { label: "High Risk", value: 2212, color: "#EF4444" },
];

function formatDisplayDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initialsFor(name?: string | null) {
  return (
    (name || "VitaPath User")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SU"
  );
}

function SafeLogo({
  className = "h-12 w-auto",
  compact = false,
  tone = "default",
}: {
  className?: string;
  compact?: boolean;
  tone?: "default" | "light";
}) {
  return (
    <img
      src={SAFE_LOGO_SRC}
      alt={compact ? "VitaPath" : "VitaPath — Preventive Care, Every Milestone"}
      className={`${className} object-contain ${tone === "light" ? "brightness-0 invert" : ""}`}
    />
  );
}

function childAgeLabel(dateOfBirth?: string | null) {
  if (!dateOfBirth) return "Age not set";
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months = Math.max(
    0,
    (now.getFullYear() - dob.getFullYear()) * 12 +
      now.getMonth() -
      dob.getMonth(),
  );
  if (months < 24) return `${months} months`;
  return `${Math.floor(months / 12)} years`;
}

// ─── Shared UI primitives ────────────────────────────────────────────────────

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "muted";
}) {
  const styles: Record<string, string> = {
    default: "bg-teal-50 text-teal-700 border border-teal-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger: "bg-red-50 text-red-700 border border-red-100",
    info: "bg-blue-50 text-blue-700 border border-blue-100",
    muted: "bg-slate-50 text-slate-600 border border-slate-100",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-black/[0.06] shadow-sm shadow-black/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

function KPICard({
  label,
  value,
  delta,
  icon: Icon,
  color = "teal",
}: {
  label: string;
  value: string;
  delta?: string;
  icon: React.ElementType;
  color?: string;
}) {
  const colors: Record<string, { bg: string; icon: string; delta: string }> = {
    teal: {
      bg: "bg-teal-50",
      icon: "text-teal-600",
      delta: "text-teal-600",
    },
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      delta: "text-emerald-600",
    },
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      delta: "text-amber-600",
    },
    red: { bg: "bg-red-50", icon: "text-red-600", delta: "text-red-600" },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", delta: "text-blue-600" },
  };
  const c = colors[color] ?? colors.teal;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {delta && (
          <span className={`text-xs font-semibold ${c.delta}`}>{delta}</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      </div>
    </Card>
  );
}

function VaccineProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = Math.round((completed / total) * 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-700">
          Vaccination Progress
        </span>
        <span className="text-sm font-bold text-teal-700">
          {completed}/{total} doses
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1.5">
        {pct}% of scheduled immunizations complete
      </p>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({
  activePage,
  setActivePage,
  open,
  user,
  onLogout,
}: {
  activePage: Page;
  setActivePage: (p: Page) => void;
  open: boolean;
  user: SafeUser | null;
  onLogout: () => void;
}) {
  const groups = ["Explore", "Portals", "Clinical", "Management"];
  const visiblePages = allowedPagesFor(user);
  const visibleNavItems = navItems.filter((item) =>
    visiblePages.includes(item.id),
  );
  return (
    <div
      className={`flex-shrink-0 flex flex-col h-full transition-all duration-300 overflow-hidden`}
      style={{
        width: open ? "240px" : "0px",
        background: "#0C3520",
      }}
    >
      {/* Logo */}
      <div className="flex min-h-[180px] items-center justify-center px-4 py-6 border-b border-white/10">
        <SafeLogo
          className="h-36 w-auto max-w-[215px] drop-shadow-[0_0_12px_rgba(167,174,255,0.4)]"
          tone="light"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => {
          const items = visibleNavItems.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-5">
              <p className="text-teal-400 text-[10px] font-bold uppercase tracking-widest px-2 mb-1.5">
                {group}
              </p>
              {items.map((item) => {
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 mb-0.5
                      ${
                        active
                          ? "bg-teal-500/20 text-white"
                          : "text-teal-200 hover:bg-white/5 hover:text-white"
                      }`}
                  >
                    <item.icon
                      className={`w-4 h-4 flex-shrink-0 ${active ? "text-teal-300" : "text-teal-400"}`}
                    />
                    <span className="text-sm font-medium truncate">
                      {item.label}
                    </span>
                    {active && (
                      <div className="ml-auto w-1 h-1 rounded-full bg-teal-300" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/10 px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-400 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">
            {user?.name
              ?.split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "DS"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-semibold truncate">
            {user?.name || "Demo Session"}
          </p>
          <p className="text-teal-300 text-[10px] truncate">
            {user?.role || "Not signed in"}
          </p>
        </div>
        {user && (
          <button
            onClick={onLogout}
            title="Log out"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-teal-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Top bar ────────────────────────────────────────────────────────────────

function TopBar({
  activePage,
  setActivePage,
  user,
  onLogout,
}: {
  activePage: Page;
  setActivePage: (p: Page) => void;
  user: SafeUser | null;
  onLogout: () => void;
}) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const labels: Record<Page, string> = {
    landing: "Platform Overview",
    login: "Login & Authentication",
    parent: "Family Portal",
    nurse: "Provider Dashboard",
    visit: "Home Visit",
    timeline: "Child Health Timeline",
    "ai-risk": "AI Risk Detection",
    admin: "Admin Dashboard",
    messaging: "Secure Messaging",
    settings: "Settings & Profile",
    passport: "Health Passport",
    municipality: "Municipality Monitor",
    "ai-report": "AI Weekly Report",
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    apiRequest<{ notifications: any[] }>("/notifications")
      .then((data) => setNotifications(data.notifications))
      .catch(() => setNotifications([]));
  }, [user, activePage]);

  const unreadCount = notifications.filter(
    (item) => item.status === "unread",
  ).length;

  return (
    <header className="flex-shrink-0 h-20 bg-white border-b border-black/[0.06] flex items-center px-6 gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {!user ? (
          <>
            <button
              type="button"
              onClick={() => setActivePage("landing")}
              className="flex items-center"
              aria-label="VitaPath home"
            >
              <SafeLogo className="h-[72px] w-auto" compact />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setActivePage(defaultPageFor(user))}
            className="text-sm font-semibold text-slate-800 hover:text-teal-700 transition-colors"
          >
            {labels[activePage]}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <>
            <div className="relative">
              <button
                onClick={() => setShowNotifications((value) => !value)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors relative"
              >
                <Bell className="w-4 h-4 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">
                      Notifications
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {notifications.length} total
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 && (
                      <p className="p-4 text-sm text-slate-500">
                        No notifications yet.
                      </p>
                    )}
                    {notifications.slice(0, 8).map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50">
                        <div className="flex items-start gap-2">
                          <div
                            className={`mt-1 w-2 h-2 rounded-full ${item.status === "unread" ? "bg-teal-500" : "bg-slate-300"}`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {item.body}
                            </p>
                            {item.due_at && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                Due {formatDisplayDate(item.due_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-teal-700 text-xs font-bold">
                {initialsFor(user?.name)}
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Log out"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
        {!user && (
          <button
            type="button"
            onClick={() =>
              setActivePage(activePage === "login" ? "landing" : "login")
            }
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activePage === "login"
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          >
            {activePage === "login" ? (
              <>
                <Home className="w-4 h-4" />
                Platform Overview
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Login / Auth
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}

// ─── Landing Page ────────────────────────────────────────────────────────────

function LandingPage({
  setActivePage,
  user,
}: {
  setActivePage: (p: Page) => void;
  user: SafeUser | null;
}) {
  const features = [
    {
      icon: FileText,
      title: "Digital Child Health Records",
      desc: "Comprehensive electronic records from birth through adolescence, accessible across all care settings.",
      color: "teal",
    },
    {
      icon: Syringe,
      title: "Smart Vaccination Reminders",
      desc: "Automated, multilingual reminders ensure no child misses a scheduled immunization.",
      color: "blue",
    },
    {
      icon: Zap,
      title: "AI-Powered Preventive Alerts",
      desc: "Machine learning flags at-risk children before conditions deteriorate, enabling early intervention.",
      color: "amber",
    },
    {
      icon: Stethoscope,
      title: "Home Visiting Nurse Support",
      desc: "Structured digital workflows guide nurses through evidence-based home visit protocols.",
      color: "emerald",
    },
    {
      icon: BarChart3,
      title: "Real-Time Health Dashboards",
      desc: "Municipality and ministry officials gain live visibility into coverage gaps and programme performance.",
      color: "teal",
    },
  ];

  const impacts = [
    {
      role: "Parents",
      icon: Heart,
      items: [
        "Track all vaccinations and health milestones in one place",
        "Get timely reminders for check-ups and vaccines",
        "Communicate securely with your family nurse",
      ],
    },
    {
      role: "Nurses",
      icon: Stethoscope,
      items: [
        "Manage daily visit schedules from a mobile device",
        "Complete structured digital forms with offline support",
        "Receive AI alerts for high-risk families",
      ],
    },
    {
      role: "Municipalities",
      icon: Building2,
      items: [
        "Monitor vaccination coverage by neighbourhood",
        "Compare nurse performance and workload distribution",
        "Export reports for Ministry submissions",
      ],
    },
    {
      role: "Ministry of Health",
      icon: Globe,
      items: [
        "National coverage maps updated in real time",
        "Predictive analytics for public health planning",
        "Standardised data for WHO and UNICEF reporting",
      ],
    },
  ];

  const [activeImpact, setActiveImpact] = useState(0);

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#0C3520] via-[#155C3A] to-[#25965E] overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 50%, #6366F1 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
              <Shield className="w-3.5 h-3.5 text-teal-300" />
              <span className="text-teal-200 text-xs font-semibold tracking-wide">
                Kosovo Ministry of Health · Certified Platform
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5 tracking-tight">
              Protecting Kosovo's
              <br />
              <span className="text-teal-300">Children,</span> Intelligently.
            </h1>
            <p className="text-teal-100 text-lg leading-relaxed mb-8 max-w-lg">
              VitaPath digitises child health records, coordinates Home Visiting
              nurses, and uses AI to detect risk before it becomes harm — for
              every child, in every municipality.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  setActivePage(user ? defaultPageFor(user) : "login")
                }
                className="bg-white text-teal-700 font-semibold px-6 py-3 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-2 text-sm"
              >
                <Baby className="w-4 h-4" /> Track Child Health
              </button>
              <button
                onClick={() =>
                  setActivePage(
                    user?.role === "doctor"
                      ? "nurse"
                      : user?.role === "admin"
                        ? "admin"
                        : "login",
                  )
                }
                className="bg-teal-500/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-teal-500/40 transition-colors flex items-center gap-2 text-sm border border-white/20"
              >
                <Stethoscope className="w-4 h-4" /> For Healthcare Providers
              </button>
            </div>
          </div>

          {/* Dashboard preview mockup */}
          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-white/40 text-xs ml-2 font-mono">
                  safe.gov.ks — Admin Dashboard
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  ["Live", "Children"],
                  ["API", "Vaccination"],
                  ["VitaPath", "Care Teams"],
                ].map(([v, l]) => (
                  <div key={l} className="bg-white/10 rounded-lg p-2.5">
                    <p className="text-white font-bold text-base">{v}</p>
                    <p className="text-teal-200 text-[10px]">{l}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-teal-200 text-[10px] font-semibold mb-2 uppercase tracking-wide">
                  Vaccination Coverage
                </p>
                <div className="flex items-end gap-1 h-12">
                  {municipalityData.map((m) => (
                    <div
                      key={m.name}
                      className="flex-1 flex flex-col justify-end"
                    >
                      <div
                        className="bg-teal-400 rounded-t"
                        style={{ height: `${(m.coverage / 100) * 48}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {[
                  {
                    label: "⚠ High-risk alert — Mitrovica North",
                    color: "amber",
                  },
                  {
                    label: "✓ Vaccination batch confirmed — Pristina",
                    color: "emerald",
                  },
                ].map((a) => (
                  <div
                    key={a.label}
                    className={`text-[10px] px-2 py-1.5 rounded ${a.color === "amber" ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"}`}
                  >
                    {a.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              value: "Live",
              label: "Children Monitored",
              icon: Baby,
              color: "text-teal-600",
            },
            {
              value: "API",
              label: "Vaccination Coverage",
              icon: Syringe,
              color: "text-emerald-600",
            },
            {
              value: "VitaPath",
              label: "Municipalities Connected",
              icon: MapPin,
              color: "text-blue-600",
            },
            {
              value: "Team",
              label: "Active Providers",
              icon: Stethoscope,
              color: "text-teal-600",
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {s.value}
              </p>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-teal-600 text-sm font-semibold uppercase tracking-widest mb-2">
            How VitaPath Works
          </p>
          <h2 className="text-3xl font-bold text-slate-900">
            Prevention-first child health infrastructure
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Register & Connect",
              desc: "Families enroll via a local nurse or clinic. Child health records are created digitally and linked to the national system.",
              icon: Users,
            },
            {
              step: "02",
              title: "Monitor & Alert",
              desc: "AI continuously analyses health data against WHO benchmarks. At-risk children receive priority nurse visits.",
              icon: Zap,
            },
            {
              step: "03",
              title: "Coordinate & Act",
              desc: "Nurses, parents, and health managers are connected in real time. Every intervention is logged and measured.",
              icon: Check,
            },
          ].map((s) => (
            <Card key={s.step} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl font-black text-slate-100">
                  {s.step}
                </span>
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-teal-600" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-teal-600 text-sm font-semibold uppercase tracking-widest mb-2">
              Platform Features
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              Built for every stakeholder in the health system
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const colorMap: Record<string, string> = {
                teal: "bg-teal-50 text-teal-600",
                blue: "bg-blue-50 text-blue-600",
                amber: "bg-amber-50 text-amber-600",
                emerald: "bg-emerald-50 text-emerald-600",
              };
              return (
                <Card
                  key={f.title}
                  className="p-5 hover:shadow-md transition-shadow"
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${colorMap[f.color]} flex items-center justify-center mb-4`}
                  >
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-teal-600 text-sm font-semibold uppercase tracking-widest mb-2">
            Impact By Role
          </p>
          <h2 className="text-3xl font-bold text-slate-900">
            Designed for every person in the care chain
          </h2>
        </div>
        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {impacts.map((im, i) => (
            <button
              key={im.role}
              onClick={() => setActiveImpact(i)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeImpact === i ? "bg-teal-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:border-teal-200"}`}
            >
              {im.role}
            </button>
          ))}
        </div>
        <Card className="max-w-2xl mx-auto p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
              {(() => {
                const Im = impacts[activeImpact].icon;
                return <Im className="w-6 h-6 text-teal-600" />;
              })()}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                For {impacts[activeImpact].role}
              </h3>
              <p className="text-sm text-slate-500">
                How VitaPath makes a difference
              </p>
            </div>
          </div>
          <ul className="space-y-3">
            {impacts[activeImpact].items.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-teal-700 to-teal-600 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to modernise child health in Kosovo?
          </h2>
          <p className="text-teal-200 mb-8">
            Use VitaPath with your real child health records, appointments,
            reminders, and provider dashboards.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => setActivePage("login")}
              className="bg-white text-teal-700 font-semibold px-7 py-3 rounded-lg hover:bg-teal-50 transition-colors text-sm"
            >
              Get Started Today
            </button>
            <button
              onClick={() =>
                setActivePage(user?.role === "admin" ? "admin" : "login")
              }
              className="bg-teal-500/30 border border-white/30 text-white font-semibold px-7 py-3 rounded-lg hover:bg-teal-500/40 transition-colors text-sm"
            >
              View Live Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Login Page ──────────────────────────────────────────────────────────────

function LoginPage({
  setActivePage,
  onLogin,
}: {
  setActivePage: (p: Page) => void;
  onLogin: (user: SafeUser) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [step, setStep] = useState<"role" | "phone" | "otp">("role");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("parent@safe.test");
  const [password, setPassword] = useState("Password123!");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPhone, setShowPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  const roles = [
    {
      id: "parent",
      label: "Parent / Guardian",
      icon: Heart,
      desc: "Access your child's health records",
      color: "emerald",
    },
    {
      id: "nurse",
      label: "Home Visiting Nurse",
      icon: Stethoscope,
      desc: "Manage your daily visit schedule",
      color: "blue",
    },
    {
      id: "manager",
      label: "Health Manager",
      icon: Building2,
      desc: "Monitor municipal health programmes",
      color: "teal",
    },
    {
      id: "ministry",
      label: "Ministry Official",
      icon: Globe,
      desc: "National public health intelligence",
      color: "amber",
    },
  ];

  const colorMap: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  const destination: Record<string, Page> = {
    parent: "parent",
    nurse: "nurse",
    manager: "admin",
    ministry: "admin",
  };

  const demoAccounts: Record<string, string> = {
    parent: "parent@safe.test",
    nurse: "doctor@safe.test",
    manager: "admin@safe.test",
    ministry: "admin@safe.test",
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setEmail(demoAccounts[role] || "parent@safe.test");
    setAuthError("");
  };

  const handleLogin = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    setAuthError("");
    try {
      const session = await login(email, password);
      onLogin(session.user);
      setActivePage(destination[selectedRole] ?? "parent");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <SafeLogo className="h-40 w-auto mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Sign in to VitaPath
          </h1>
          <p className="text-slate-500 text-sm">
            Kosovo Child Health Intelligence Platform
          </p>
        </div>

        <Card className="p-6">
          {step === "role" && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-4">
                Select your role to continue
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleRoleSelect(r.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${selectedRole === r.id ? colorMap[r.color] + " border-current" : "border-slate-100 bg-slate-50 hover:border-slate-200"}`}
                  >
                    <r.icon
                      className={`w-5 h-5 mb-2 ${selectedRole === r.id ? "" : "text-slate-400"}`}
                    />
                    <p
                      className={`text-xs font-bold leading-tight ${selectedRole === r.id ? "" : "text-slate-700"}`}
                    >
                      {r.label}
                    </p>
                    <p
                      className={`text-[10px] mt-0.5 ${selectedRole === r.id ? "opacity-70" : "text-slate-400"}`}
                    >
                      {r.desc}
                    </p>
                  </button>
                ))}
              </div>
              <button
                disabled={!selectedRole}
                onClick={() => setStep("phone")}
                className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg disabled:opacity-40 hover:bg-teal-700 transition-colors text-sm"
              >
                Continue <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          )}

          {step === "phone" && (
            <div>
              <button
                onClick={() => setStep("role")}
                className="flex items-center gap-1 text-xs text-slate-500 mb-4 hover:text-slate-700"
              >
                <ChevronRight className="w-3 h-3 rotate-180" /> Back
              </button>
              <p className="text-sm font-semibold text-slate-700 mb-1.5">
                Enter your phone number
              </p>
              <p className="text-xs text-slate-500 mb-4">
                We'll send a verification code via SMS
              </p>
              <div className="flex gap-2 mb-4">
                <div className="w-16 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600">
                  🇽🇰 +383
                </div>
                <div className="flex-1 relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPhone ? "text" : "tel"}
                    placeholder="44 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    onClick={() => setShowPhone(!showPhone)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPhone ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setStep("otp")}
                className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-700 transition-colors text-sm mb-3"
              >
                Send Verification Code
              </button>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 justify-center">
                <Shield className="w-3 h-3" />
                <span>End-to-end encrypted · GDPR compliant</span>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div>
              <button
                onClick={() => setStep("phone")}
                className="flex items-center gap-1 text-xs text-slate-500 mb-4 hover:text-slate-700"
              >
                <ChevronRight className="w-3 h-3 rotate-180" /> Back
              </button>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                Verification code
              </p>
              <p className="text-xs text-slate-500 mb-5">
                Sent to +383 {phone || "44 *** ***"}
              </p>
              <div className="flex gap-2 mb-6">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={v}
                    onChange={(e) => {
                      const next = [...otp];
                      next[i] = e.target.value.slice(-1);
                      setOtp(next);
                    }}
                    className="flex-1 h-12 text-center text-lg font-bold border border-slate-200 rounded-lg focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                ))}
              </div>
              <button
                onClick={handleLogin}
                disabled={isSubmitting}
                className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-700 transition-colors text-sm mb-3"
              >
                {isSubmitting ? "Signing in..." : "Verify & Sign In"}
              </button>
              <p className="text-xs text-center text-slate-400">
                Didn't receive it?{" "}
                <button className="text-teal-600 font-semibold">
                  Resend code
                </button>
              </p>
            </div>
          )}
        </Card>
        {authError && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" /> Secure Login
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" /> Gov-Certified
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> Privacy Protected
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Parent Dashboard ─────────────────────────────────────────────────────────

function AuthPage({
  setActivePage,
  onLogin,
}: {
  setActivePage: (p: Page) => void;
  onLogin: (user: SafeUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<
    "parent" | "doctor" | "admin" | "municipality"
  >("parent");
  const [municipality, setMunicipality] = useState("");
  const [name, setName] = useState("Demo Parent");
  const [email, setEmail] = useState("parent@safe.test");
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const roleOptions = [
    {
      id: "parent",
      label: "Parent",
      icon: Heart,
      demoEmail: "parent@safe.test",
      loginOnly: false,
    },
    {
      id: "doctor",
      label: "Nurse",
      icon: Stethoscope,
      demoEmail: "doctor@safe.test",
      loginOnly: false,
    },
    {
      id: "municipality",
      label: "Municipality",
      icon: Building2,
      demoEmail: "municipality@safe.test",
      loginOnly: false,
    },
    {
      id: "admin",
      label: "Admin",
      icon: BarChart3,
      demoEmail: "admin@safe.test",
      loginOnly: true,
    },
  ] as const;

  const destinationFor = (userRole: SafeUser["role"]): Page => {
    if (userRole === "parent") return "parent";
    if (userRole === "doctor") return "nurse";
    if (userRole === "municipality") return "municipality";
    return "admin";
  };

  const selectRole = (nextRole: typeof role) => {
    setRole(nextRole);
    setError("");
    setMessage("");
    const demo = roleOptions.find((item) => item.id === nextRole);
    if (mode === "login" && demo) setEmail(demo.demoEmail);
    if (mode === "register") setEmail("");
  };

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setError("");
    setMessage("");
    if (nextMode === "login") {
      const demo = roleOptions.find((item) => item.id === role);
      setEmail(demo?.demoEmail || "parent@safe.test");
      setPassword("Password123!");
    } else {
      if (role === "admin") setRole("parent");
      setName("");
      setEmail("");
      setPassword("");
      setMunicipality("");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const session =
        mode === "login"
          ? await login(email, password)
          : await registerAccount(
              name,
              email,
              password,
              role === "admin"
                ? "doctor"
                : (role as "parent" | "doctor" | "municipality"),
              role === "municipality" ? municipality : undefined,
            );

      onLogin(session.user);
      setMessage(
        mode === "login"
          ? "Logged in successfully."
          : "Account created successfully.",
      );
      setActivePage(destinationFor(session.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <SafeLogo className="h-40 w-auto mx-auto mb-5" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === "login" ? "Sign in to VitaPath" : "Create VitaPath account"}
          </h1>
          <p className="text-slate-500 text-sm">
            Connected to the Express backend with JWT authentication
          </p>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => switchMode("login")}
              className={`py-2 rounded-lg text-sm font-semibold ${mode === "login" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
            >
              Login
            </button>
            <button
              onClick={() => switchMode("register")}
              className={`py-2 rounded-lg text-sm font-semibold ${mode === "register" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}
            >
              Sign up
            </button>
          </div>

          {mode === "register" && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              {roleOptions
                .filter((item) => !item.loginOnly)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectRole(item.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${role === item.id ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"}`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs font-bold">{item.label}</span>
                    </button>
                  );
                })}
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                    required
                  />
                </div>
                {role === "municipality" && (
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white appearance-none"
                    >
                      <option value="">Select municipality…</option>
                      {[
                        "Pristina",
                        "Prizren",
                        "Ferizaj",
                        "Gjilan",
                        "Peja",
                        "Gjakova",
                        "Mitrovica",
                        "Vushtrri",
                        "Skenderaj",
                        "Drenas",
                        "Lipjan",
                        "Fushë Kosovë",
                        "Obiliq",
                        "Podujeva",
                        "Kaçanik",
                        "Shtime",
                        "Suhareka",
                        "Rahovec",
                        "Malisheva",
                        "Klinë",
                        "Istog",
                        "Deçan",
                        "Junik",
                        "Dragash",
                        "Mamushë",
                        "Mamusha",
                        "Viti",
                        "Kamenicë",
                        "Novo Brdo",
                        "Ranilug",
                        "Partesh",
                        "Klokot",
                      ]
                        .sort()
                        .map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                required
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg disabled:opacity-40 hover:bg-teal-700 transition-colors text-sm"
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "login"
                  ? "Login"
                  : "Create account"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

type ParentOverviewResponse = {
  overview: {
    childrenCount: number;
    highRiskChildren: number;
    children: Array<{
      child: {
        id: string;
        full_name: string;
        date_of_birth: string;
        gender: string;
      };
      riskScore: number;
      riskBand: string;
      upcomingCount: number;
      overdueCount: number;
      vaccinationCount: number;
      checkupCount: number;
      milestoneCount: number;
    }>;
  };
};

type ReminderResponse = {
  reminders: Array<{
    type: string;
    severity: string;
    dueDate: string;
    item: Record<string, string>;
  }>;
};

type MissedActionsResponse = {
  missedActions: Array<{
    type: string;
    severity: string;
    dueDate: string;
    item: Record<string, string>;
    child: { full_name: string };
  }>;
};

type TimelineResponse = {
  timeline: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    date: string;
  }>;
};

type Appointment = {
  id: string;
  child_id: string;
  child_name: string;
  provider_name?: string;
  type: string;
  scheduled_at: string;
  location?: string;
  notes?: string;
  status: string;
  parent_response?: string;
  requested_time?: string;
};

type AppointmentsResponse = {
  appointments: Appointment[];
};

function ParentDashboard({
  user,
  onLogout,
}: {
  user: SafeUser | null;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState<
    ParentOverviewResponse["overview"] | null
  >(null);
  const [backendReminders, setBackendReminders] = useState<
    ReminderResponse["reminders"]
  >([]);
  const [backendTimeline, setBackendTimeline] = useState<
    TimelineResponse["timeline"]
  >([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [missedActions, setMissedActions] = useState<
    MissedActionsResponse["missedActions"]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [newChild, setNewChild] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "female",
  });

  // AI chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [childMessage, setChildMessage] = useState("");
  const [appointmentMessage, setAppointmentMessage] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const tabs = ["overview", "appointments", "timeline"];

  const loadDashboard = async () => {
    if (!getStoredToken()) return;
    setLoading(true);
    setLoadError("");
    try {
      const overviewData = await apiRequest<ParentOverviewResponse>(
        "/dashboard/parent/overview",
      );
      setOverview(overviewData.overview);
      const remindersData = await apiRequest<ReminderResponse>(
        "/dashboard/reminders/upcoming",
      );
      setBackendReminders(remindersData.reminders);
      const appointmentsData =
        await apiRequest<AppointmentsResponse>("/appointments");
      setAppointments(appointmentsData.appointments);
      const missedData = await apiRequest<MissedActionsResponse>(
        "/dashboard/actions/missed",
      );
      setMissedActions(missedData.missedActions);

      const activeChildId =
        selectedChildId || overviewData.overview.children[0]?.child.id;
      if (activeChildId && !selectedChildId) setSelectedChildId(activeChildId);
      if (activeChildId) {
        const timelineData = await apiRequest<TimelineResponse>(
          `/dashboard/children/${activeChildId}/timeline`,
        );
        setBackendTimeline(timelineData.timeline);
      } else {
        setBackendTimeline([]);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [selectedChildId]);

  const createChild = async (event: React.FormEvent) => {
    event.preventDefault();
    setChildMessage("");
    setLoadError("");
    try {
      const created = await apiRequest<{ child: { id: string } }>("/children", {
        method: "POST",
        body: newChild,
      });
      setNewChild({ fullName: "", dateOfBirth: "", gender: "female" });
      setSelectedChildId(created.child.id);
      setChildMessage("Child profile created.");
      await loadDashboard();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not create child",
      );
    }
  };

  const respondToAppointment = async (
    appointmentId: string,
    action: "confirm" | "reschedule" | "cancel",
  ) => {
    setAppointmentMessage("");
    const body =
      action === "reschedule"
        ? {
            action,
            requestedTime: new Date(
              Date.now() + 14 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            message: "Parent requested a later appointment time.",
          }
        : {
            action,
            message:
              action === "confirm"
                ? "Parent confirmed attendance."
                : "Parent cannot attend this appointment.",
          };

    await apiRequest(`/appointments/${appointmentId}/respond`, {
      method: "PATCH",
      body,
    });
    setAppointmentMessage(
      action === "confirm"
        ? "Appointment confirmed."
        : action === "reschedule"
          ? "New time requested."
          : "Appointment cancelled.",
    );
    const data = await apiRequest<AppointmentsResponse>("/appointments");
    setAppointments(data.appointments);
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const next = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(next);
    setChatInput("");
    setChatLoading(true);
    try {
      const data = await apiRequest<{ reply: string }>("/chat", {
        method: "POST",
        body: { messages: next },
      });
      setChatMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages([
        ...next,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Could not reach the AI service."}`,
        },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(
        () => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    }
  };

  const upcomingVaccines: any[] = [];

  const timelineEvents: any[] = [];

  const statusColor: Record<string, string> = {
    completed: "text-emerald-600 bg-emerald-50 border-emerald-100",
    missed: "text-red-600 bg-red-50 border-red-100",
    upcoming: "text-blue-600 bg-blue-50 border-blue-100",
  };

  const childSummary = overview?.children[0];
  const selectedChildSummary =
    overview?.children.find((item) => item.child.id === selectedChildId) ||
    childSummary;
  const child = selectedChildSummary?.child;
  const childName = child?.full_name || "No child selected";
  const initials = childName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const healthScore = selectedChildSummary
    ? Math.max(0, 100 - selectedChildSummary.riskScore)
    : 82;
  const visibleVaccines =
    backendReminders.length > 0
      ? backendReminders
          .filter((item) => item.type === "vaccination")
          .map((item) => ({
            name: item.item.vaccine_name || "Vaccination",
            date: item.dueDate,
            status: item.severity,
          }))
      : upcomingVaccines;
  const visibleTimeline =
    backendTimeline.length > 0
      ? backendTimeline.map((event) => ({
          date: event.date,
          label: event.title,
          type: event.type,
          status: event.status,
          nurse: "VitaPath backend",
        }))
      : timelineEvents;
  const childAppointments = selectedChildId
    ? appointments.filter((item) => item.child_id === selectedChildId)
    : appointments;
  const upcomingAppointments = childAppointments.filter(
    (item) => !["completed", "cancelled", "missed"].includes(item.status),
  );
  const pastAppointments = childAppointments.filter((item) =>
    ["completed", "cancelled", "missed"].includes(item.status),
  );
  const nextAppointment = upcomingAppointments[0] || appointments[0];
  const selectedMissedActions = missedActions.filter(
    (item) => !selectedChildId || item.child?.full_name === childName,
  );
  const nextReminder =
    backendReminders.find(
      (item) => !selectedChildId || item.item.child_id === selectedChildId,
    ) || backendReminders[0];
  const vaccinationCompleted = selectedChildSummary?.vaccinationCount
    ? Math.max(
        0,
        selectedChildSummary.vaccinationCount -
          selectedChildSummary.overdueCount,
      )
    : 0;
  const vaccinationTotal = selectedChildSummary?.vaccinationCount || 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Child card */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-6 mb-6 text-white shadow-lg shadow-teal-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">
            {initials || "AK"}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{childName}</h2>
            <p className="text-teal-200 text-sm">
              {child
                ? `Born ${new Date(child.date_of_birth).toLocaleDateString()} · ${child.gender}`
                : "No child selected"}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="default">
                <span className="text-teal-100 text-[10px] font-semibold">
                  Health Score: {healthScore}/100
                </span>
              </Badge>
              {loading && <Badge variant="info">Loading backend data</Badge>}
              {loadError && <Badge variant="danger">Backend offline</Badge>}
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-teal-200 text-xs">Signed in as</p>
            <p className="font-semibold text-sm">
              {user?.name || "Demo Session"}
            </p>
            <button
              onClick={onLogout}
              className="text-teal-200 text-xs hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-slate-100 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === t ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {overview && (
        <Card className="p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-start gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3 mb-3">
                <Baby className="w-5 h-5 text-teal-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    My Children
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a child profile or add another child.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {overview.children.map((summary) => (
                  <button
                    key={summary.child.id}
                    onClick={() => setSelectedChildId(summary.child.id)}
                    className={`max-w-full truncate px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      selectedChildId === summary.child.id
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-slate-50 text-slate-600 border-slate-100 hover:border-teal-200"
                    }`}
                  >
                    {summary.child.full_name}
                  </button>
                ))}
                {overview.children.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No child profiles yet.
                  </p>
                )}
              </div>
            </div>
            <form
              onSubmit={createChild}
              className="grid w-full min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[34rem] xl:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(8rem,0.85fr)_auto]"
            >
              <input
                value={newChild.fullName}
                onChange={(event) =>
                  setNewChild((value) => ({
                    ...value,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Full name"
                className="min-w-0 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400"
                required
              />
              <input
                type="date"
                value={newChild.dateOfBirth}
                onChange={(event) =>
                  setNewChild((value) => ({
                    ...value,
                    dateOfBirth: event.target.value,
                  }))
                }
                className="min-w-0 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400"
                required
              />
              <select
                value={newChild.gender}
                onChange={(event) =>
                  setNewChild((value) => ({
                    ...value,
                    gender: event.target.value,
                  }))
                }
                className="min-w-0 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400 bg-white"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
              <button className="min-h-11 whitespace-nowrap bg-teal-600 text-white rounded-lg px-4 text-sm font-semibold hover:bg-teal-700 sm:col-span-2 xl:col-span-1">
                Add child
              </button>
            </form>
          </div>
          {childMessage && (
            <p className="text-xs text-emerald-600 font-semibold mt-3">
              {childMessage}
            </p>
          )}
        </Card>
      )}

      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {nextAppointment && (
              <Card className="p-5 border-teal-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
                      Next Appointment
                    </p>
                    <h3 className="text-base font-bold text-slate-900 capitalize">
                      {nextAppointment.type.replace("_", " ")}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(nextAppointment.scheduled_at).toLocaleString()}{" "}
                      · {nextAppointment.location || "Location pending"}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {nextAppointment.notes}
                    </p>
                  </div>
                  <Badge
                    variant={
                      nextAppointment.status === "confirmed"
                        ? "success"
                        : nextAppointment.status === "missed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {nextAppointment.status.replace("_", " ")}
                  </Badge>
                </div>
                {nextAppointment.status === "scheduled" && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() =>
                        respondToAppointment(nextAppointment.id, "confirm")
                      }
                      className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() =>
                        respondToAppointment(nextAppointment.id, "reschedule")
                      }
                      className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100"
                    >
                      Request new time
                    </button>
                    <button
                      onClick={() =>
                        respondToAppointment(nextAppointment.id, "cancel")
                      }
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                    >
                      Cannot attend
                    </button>
                  </div>
                )}
                {appointmentMessage && (
                  <p className="text-xs text-emerald-600 font-semibold mt-3">
                    {appointmentMessage}
                  </p>
                )}
              </Card>
            )}
            <Card className="p-5">
              <VaccineProgress
                completed={vaccinationCompleted}
                total={Math.max(vaccinationTotal, 1)}
              />
              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Upcoming Vaccinations
                </p>
                {visibleVaccines.map((v) => (
                  <div
                    key={v.name}
                    className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
                  >
                    <Syringe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {v.name}
                      </p>
                      <p className="text-xs text-blue-600">{v.date}</p>
                    </div>
                    <Badge variant="info">Scheduled</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Growth Chart
                </h3>
                <Badge variant="success">
                  <TrendingUp className="w-3 h-3" /> Healthy range
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#4338CA"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#4338CA" }}
                    name="Weight (kg)"
                  />
                  <Line
                    type="monotone"
                    dataKey="height"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10B981" }}
                    name="Height (cm)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Quick Actions
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: "Message Nurse",
                    icon: MessageSquare,
                    color: "teal",
                  },
                  {
                    label: "Confirm Appointment",
                    icon: Check,
                    color: "emerald",
                  },
                  {
                    label: "View Health Record",
                    icon: FileText,
                    color: "blue",
                  },
                ].map((a) => {
                  const colorCls: Record<string, string> = {
                    teal: "bg-teal-50 text-teal-700 hover:bg-teal-100",
                    emerald:
                      "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100",
                  };
                  return (
                    <button
                      key={a.label}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${colorCls[a.color]} transition-colors`}
                    >
                      <a.icon className="w-4 h-4" />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-bold text-slate-700">
                  AI Preventive Insight
                </p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {nextReminder
                  ? `${childName} has an upcoming ${nextReminder.type} due on ${new Date(nextReminder.dueDate).toLocaleDateString()}.`
                  : selectedMissedActions[0]
                    ? `${childName} has missed or delayed care that needs follow-up.`
                    : `${childName} currently has no urgent preventive care alerts.`}
              </p>
              <button className="mt-3 text-xs text-teal-600 font-semibold hover:underline">
                Learn more →
              </button>
            </Card>

            <Card className="p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Alerts
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    {nextAppointment
                      ? `${nextAppointment.type.replace("_", " ")} appointment · ${nextAppointment.status.replace("_", " ")}`
                      : "No pending appointment"}
                  </p>
                </div>
                <div className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                  <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">
                    {selectedMissedActions[0]
                      ? `${selectedMissedActions[0].type} ${selectedMissedActions[0].severity} · due ${new Date(selectedMissedActions[0].dueDate).toLocaleDateString()}`
                      : "No overdue care"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              Upcoming Appointments
            </h3>
            <div className="space-y-3">
              {upcomingAppointments.length === 0 && (
                <p className="text-sm text-slate-500">
                  No upcoming appointments.
                </p>
              )}
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800 capitalize">
                        {appointment.type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(appointment.scheduled_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {appointment.location}
                      </p>
                    </div>
                    <Badge
                      variant={
                        appointment.status === "confirmed"
                          ? "success"
                          : appointment.status === "reschedule_requested"
                            ? "warning"
                            : "info"
                      }
                    >
                      {appointment.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {appointment.notes && (
                    <p className="text-xs text-slate-600 mt-2">
                      {appointment.notes}
                    </p>
                  )}
                  {appointment.status === "scheduled" && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() =>
                          respondToAppointment(appointment.id, "confirm")
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() =>
                          respondToAppointment(appointment.id, "reschedule")
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold"
                      >
                        Request new time
                      </button>
                      <button
                        onClick={() =>
                          respondToAppointment(appointment.id, "cancel")
                        }
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold"
                      >
                        Cannot attend
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              Past Appointments
            </h3>
            <div className="space-y-3">
              {pastAppointments.length === 0 && (
                <p className="text-sm text-slate-500">
                  No past appointments yet.
                </p>
              )}
              {pastAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-3 rounded-xl border border-slate-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 capitalize">
                        {appointment.type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(appointment.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        appointment.status === "missed"
                          ? "danger"
                          : appointment.status === "completed"
                            ? "success"
                            : "muted"
                      }
                    >
                      {appointment.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="relative pl-6 space-y-1">
          <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-100" />
          {visibleTimeline.map((ev, i) => (
            <div key={i} className="relative mb-4">
              <div
                className={`absolute -left-4 top-3 w-3 h-3 rounded-full border-2 border-white ${ev.status === "completed" ? "bg-emerald-500" : ev.status === "missed" ? "bg-red-500" : "bg-blue-500"}`}
              />
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {ev.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ev.date} · {ev.nurse}
                    </p>
                  </div>
                  <Badge
                    variant={
                      ev.status === "completed"
                        ? "success"
                        : ev.status === "missed"
                          ? "danger"
                          : "info"
                    }
                  >
                    {ev.status}
                  </Badge>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Messages tab removed */}

      {/* AI Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {chatOpen && (
          <div
            className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            style={{ height: 480 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-teal-600">
              <div className="w-8 h-8 rounded-full bg-teal-400 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  AI Health Assistant
                </p>
                <p className="text-xs text-teal-200">
                  Ask about your child's health
                </p>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-teal-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
              {chatMessages.length === 0 && (
                <div className="text-center pt-8">
                  <Bot className="w-10 h-10 text-teal-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">
                    Hi {user?.name?.split(" ")[0] || "there"}!
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ask me anything about your child's vaccinations,
                    appointments, or milestones.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {[
                      "Is my child's vaccination up to date?",
                      "When is the next appointment?",
                      "What milestones should I expect?",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={async () => {
                          const next = [
                            ...chatMessages,
                            { role: "user" as const, content: q },
                          ];
                          setChatMessages(next);
                          setChatLoading(true);
                          try {
                            const data = await apiRequest<{ reply: string }>(
                              "/chat",
                              { method: "POST", body: { messages: next } },
                            );
                            setChatMessages([
                              ...next,
                              { role: "assistant", content: data.reply },
                            ]);
                          } catch {
                            setChatMessages([
                              ...next,
                              {
                                role: "assistant",
                                content:
                                  "Sorry, I could not reach the AI service. Please try again.",
                              },
                            ]);
                          } finally {
                            setChatLoading(false);
                            setTimeout(
                              () =>
                                chatBottomRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                }),
                              50,
                            );
                          }
                        }}
                        className="text-left text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 hover:border-teal-300 hover:text-teal-700 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-teal-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"}`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-slate-100 bg-white flex gap-2">
              <input
                className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400 transition-colors"
                placeholder="Type a message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && sendChatMessage()
                }
                disabled={chatLoading}
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white hover:bg-teal-700 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="w-14 h-14 rounded-full bg-teal-600 shadow-lg flex items-center justify-center text-white hover:bg-teal-700 transition-all hover:scale-105 active:scale-95"
          aria-label="Open AI health assistant"
        >
          {chatOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}

// ─── Health Passport ──────────────────────────────────────────────────────────

type PassportData = {
  child: {
    id: string;
    full_name: string;
    date_of_birth: string;
    gender: string;
    parent_name: string;
    parent_phone: string;
    municipality: string;
  };
  vaccinations: {
    vaccine_name: string;
    status: string;
    recommended_date: string;
    scheduled_date: string;
    completed_date?: string;
  }[];
  checkups: {
    checkup_type: string;
    status: string;
    scheduled_date: string;
    completed_date?: string;
    notes?: string;
  }[];
  milestones: {
    title: string;
    status: string;
    expected_date: string;
    achieved_date?: string;
  }[];
  recentVisits: {
    completed_at?: string;
    scheduled_at: string;
    nurse_name: string;
    nutrition_notes?: string;
    risk_notes?: string;
  }[];
  appointments: { type: string; scheduled_at: string; status: string }[];
  risk: { score: number; level: string; reasons: string[] } | null;
};

function HealthPassport({ user }: { user: SafeUser | null }) {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<
    "overview" | "vaccinations" | "visits" | "appointments"
  >("overview");
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);

  useEffect(() => {
    apiRequest<{ children: any[] }>("/children")
      .then((d) => {
        setChildren(d.children);
        if (d.children[0]) setSelectedChildId(d.children[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    setLoading(true);
    setError("");
    setPassport(null);
    setQrDataUrl("");
    apiRequest<{ passport: PassportData }>(`/passport/${selectedChildId}`)
      .then((d) => setPassport(d.passport))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedChildId]);

  const generateQR = async () => {
    if (!selectedChildId) return;
    setQrLoading(true);
    try {
      const { token } = await apiRequest<{ token: string }>(
        `/passport/${selectedChildId}/token`,
        { method: "POST" },
      );
      const verifyUrl = `${window.location.origin}/?verify=${encodeURIComponent(token)}`;
      const QRCode = await import("qrcode");
      const url = await QRCode.toDataURL(verifyUrl, {
        width: 280,
        margin: 2,
        color: { dark: "#0C3520", light: "#FFFFFF" },
      });
      setQrDataUrl(url);
      setTokenExpiry(new Date(Date.now() + 15 * 60 * 1000));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setQrLoading(false);
    }
  };

  const child = passport?.child;
  const dob = child?.date_of_birth ? new Date(child.date_of_birth) : null;
  const ageMonths = dob
    ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : 0;
  const ageLabel =
    ageMonths >= 24 ? `${Math.floor(ageMonths / 12)} yrs` : `${ageMonths} mo`;

  const vacCompleted =
    passport?.vaccinations.filter((v) => v.status === "completed").length ?? 0;
  const vacTotal = passport?.vaccinations.length ?? 0;
  const vacMissed =
    passport?.vaccinations.filter((v) => v.status === "missed").length ?? 0;

  const riskColor =
    {
      low: "text-emerald-600 bg-emerald-50 border-emerald-200",
      moderate: "text-amber-600 bg-amber-50 border-amber-200",
      high: "text-orange-600 bg-orange-50 border-orange-200",
      critical: "text-red-600 bg-red-50 border-red-200",
    }[passport?.risk?.level ?? "low"] ??
    "text-slate-600 bg-slate-50 border-slate-200";

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: "text-emerald-700 bg-emerald-50 border border-emerald-200",
      missed: "text-red-700 bg-red-50 border border-red-200",
      pending: "text-blue-700 bg-blue-50 border border-blue-200",
      delayed: "text-amber-700 bg-amber-50 border border-amber-200",
    };
    return map[status] ?? "text-slate-600 bg-slate-50 border border-slate-200";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-teal-600" />
            Health Passport
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Digital healthcare identity — Kosovo Child Health Platform
          </p>
        </div>
        {children.length > 1 && (
          <select
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-teal-400"
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Loading passport…
        </div>
      )}

      {passport && (
        <div className="space-y-6">
          {/* Passport Card */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-xl"
            style={{
              background:
                "linear-gradient(135deg, #0C3520 0%, #155C3A 50%, #25965E 100%)",
            }}
          >
            {/* Background pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 border border-white/30">
                    <span className="text-white text-2xl font-bold">
                      {child?.full_name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-teal-300 text-xs font-bold uppercase tracking-widest">
                        Republic of Kosovo
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                    </div>
                    <h2 className="text-white text-2xl font-bold">
                      {child?.full_name}
                    </h2>
                    <p className="text-teal-200 text-sm mt-0.5">
                      {ageLabel} · {child?.gender} ·{" "}
                      {child?.municipality || "Kosovo"}
                    </p>
                  </div>
                </div>
                {/* Passport ID badge */}
                <div className="text-right">
                  <p className="text-teal-300 text-[10px] font-bold uppercase tracking-wider">
                    Passport ID
                  </p>
                  <p className="text-white font-mono text-sm">
                    {child?.id.split("-")[0].toUpperCase()}
                  </p>
                  <div className="mt-2 flex items-center gap-1 justify-end">
                    <Fingerprint className="w-3.5 h-3.5 text-teal-300" />
                    <span className="text-teal-300 text-[10px]">
                      Digitally Signed
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Vaccines Done",
                    value: `${vacCompleted}/${vacTotal}`,
                    icon: Syringe,
                    ok: vacMissed === 0,
                  },
                  {
                    label: "Risk Level",
                    value: passport.risk?.level ?? "N/A",
                    icon: AlertOctagon,
                    ok: !["high", "critical"].includes(
                      passport.risk?.level ?? "",
                    ),
                  },
                  {
                    label: "Visits",
                    value: String(passport.recentVisits.length),
                    icon: CalendarDays,
                    ok: true,
                  },
                ].map(({ label, value, icon: Icon, ok }) => (
                  <div
                    key={label}
                    className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon
                        className={`w-3.5 h-3.5 ${ok ? "text-emerald-300" : "text-red-300"}`}
                      />
                      <span className="text-teal-200 text-[10px] uppercase tracking-wide font-semibold">
                        {label}
                      </span>
                    </div>
                    <p className="text-white font-bold text-lg capitalize">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR Code section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-teal-600" />
                  Scan-to-Verify QR Code
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Generate a secure, time-limited QR code. Healthcare providers
                  scan it to instantly view this child's full health record.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    "Valid for 15 minutes only",
                    "Cryptographically signed",
                    "No account required to scan",
                    "Audit-logged on every scan",
                  ].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-xs text-slate-600"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={generateQR}
                  disabled={qrLoading}
                  className="mt-4 flex items-center gap-2 bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  <ScanLine className="w-4 h-4" />
                  {qrLoading
                    ? "Generating…"
                    : qrDataUrl
                      ? "Regenerate QR"
                      : "Generate QR Code"}
                </button>
                {tokenExpiry && qrDataUrl && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires at {tokenExpiry.toLocaleTimeString()}
                  </p>
                )}
              </div>
              {qrDataUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-white rounded-2xl border-2 border-teal-100 shadow-inner">
                    <img
                      src={qrDataUrl}
                      alt="Health Passport QR"
                      width={160}
                      height={160}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Scan with any camera
                    <br />
                    or QR reader
                  </p>
                </div>
              ) : (
                <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-200" />
                </div>
              )}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(
              ["overview", "vaccinations", "visits", "appointments"] as const
            ).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all capitalize ${activeSection === s ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeSection === "overview" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Risk */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertOctagon className="w-4 h-4 text-teal-600" />
                  <h4 className="font-semibold text-slate-800 text-sm">
                    Preventive Risk
                  </h4>
                </div>
                {passport.risk ? (
                  <>
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border capitalize ${riskColor}`}
                    >
                      {passport.risk.level} risk — {passport.risk.score}/100
                    </div>
                    {passport.risk.reasons?.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {passport.risk.reasons.map((r, i) => (
                          <li
                            key={i}
                            className="text-xs text-slate-600 flex items-start gap-1.5"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400">
                    No assessment recorded
                  </p>
                )}
              </Card>

              {/* Milestones */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  <h4 className="font-semibold text-slate-800 text-sm">
                    Development Milestones
                  </h4>
                </div>
                {passport.milestones.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No milestones recorded
                  </p>
                ) : (
                  <div className="space-y-2">
                    {passport.milestones.slice(0, 4).map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs text-slate-700 truncate">
                          {m.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge(m.status)}`}
                        >
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Parent info */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-teal-600" />
                  <h4 className="font-semibold text-slate-800 text-sm">
                    Guardian Information
                  </h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name</span>
                    <span className="font-medium text-slate-800">
                      {child?.parent_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone</span>
                    <span className="font-medium text-slate-800">
                      {child?.parent_phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Municipality</span>
                    <span className="font-medium text-slate-800">
                      {child?.municipality || "—"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Upcoming appointments */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-teal-600" />
                  <h4 className="font-semibold text-slate-800 text-sm">
                    Upcoming Appointments
                  </h4>
                </div>
                {passport.appointments.filter((a) => a.status === "scheduled")
                  .length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No upcoming appointments
                  </p>
                ) : (
                  <div className="space-y-2">
                    {passport.appointments
                      .filter((a) => a.status === "scheduled")
                      .slice(0, 3)
                      .map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-xs text-slate-700">
                            {a.type}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(a.scheduled_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Vaccinations */}
          {activeSection === "vaccinations" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">
                  Vaccination History
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />{" "}
                  Completed
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block ml-2" />{" "}
                  Missed
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block ml-2" />{" "}
                  Pending
                </div>
              </div>
              {passport.vaccinations.length === 0 ? (
                <Card className="p-6 text-center text-sm text-slate-400">
                  No vaccination records
                </Card>
              ) : (
                passport.vaccinations.map((v, i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${v.status === "completed" ? "bg-emerald-400" : v.status === "missed" ? "bg-red-400" : "bg-blue-400"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {v.vaccine_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Recommended:{" "}
                        {v.recommended_date
                          ? new Date(v.recommended_date).toLocaleDateString()
                          : "—"}
                        {v.completed_date &&
                          ` · Done: ${new Date(v.completed_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize ${statusBadge(v.status)}`}
                    >
                      {v.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Visits */}
          {activeSection === "visits" && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800">
                Home Visit Records
              </h3>
              {passport.recentVisits.length === 0 ? (
                <Card className="p-6 text-center text-sm text-slate-400">
                  No visit records
                </Card>
              ) : (
                passport.recentVisits.map((v, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Home Visit
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(
                            v.completed_at || v.scheduled_at,
                          ).toLocaleDateString()}{" "}
                          · Nurse: {v.nurse_name}
                        </p>
                        {v.nutrition_notes && (
                          <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2">
                            {v.nutrition_notes}
                          </p>
                        )}
                      </div>
                      {v.nutrition_status && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Thermometer className="w-3 h-3" />
                          {v.nutrition_status}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Appointments */}
          {activeSection === "appointments" && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800">
                Appointment History
              </h3>
              {passport.appointments.length === 0 ? (
                <Card className="p-6 text-center text-sm text-slate-400">
                  No appointments
                </Card>
              ) : (
                passport.appointments.map((a, i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4"
                  >
                    <CalendarDays className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800 capitalize">
                        {a.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(a.scheduled_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize ${statusBadge(a.status)}`}
                    >
                      {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Nurse Dashboard ──────────────────────────────────────────────────────────

function NurseDashboard({ user }: { user: SafeUser | null }) {
  const [offlineMode] = useState(false);
  const [apiVisits, setApiVisits] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [visitError, setVisitError] = useState("");
  const [appointmentDraft, setAppointmentDraft] = useState({
    childId: "",
    type: "vaccination",
    scheduledAt: "",
    location: "Pristina Family Medicine Center",
    notes: "",
  });
  const [appointmentNotice, setAppointmentNotice] = useState("");
  const fallbackVisits: any[] = [];

  useEffect(() => {
    apiRequest<{ visits: any[] }>("/visits")
      .then((data) => setApiVisits(data.visits))
      .catch((error) =>
        setVisitError(
          error instanceof Error ? error.message : "Could not load visits",
        ),
      );
    apiRequest<AppointmentsResponse>("/appointments")
      .then((data) => setAppointments(data.appointments))
      .catch(() => setAppointments([]));
    apiRequest<{ children: any[] }>("/children")
      .then((data) => {
        setChildren(data.children);
        if (data.children[0])
          setAppointmentDraft((draft) => ({
            ...draft,
            childId: data.children[0].id,
          }));
      })
      .catch(() => setChildren([]));
  }, []);

  const visits =
    apiVisits.length > 0
      ? apiVisits.map((visit) => ({
          id: visit.id,
          time: new Date(visit.scheduled_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          family: visit.child_name?.split(" ").slice(-1)[0] || "Family",
          child: visit.child_name || "Child",
          address: visit.location || "Home visit location",
          status:
            visit.status === "scheduled"
              ? "pending"
              : visit.status.replace("_", "-"),
          risk: visit.risk_notes
            ? "high"
            : visit.status === "missed"
              ? "high"
              : "low",
        }))
      : fallbackVisits;

  const updateVisitStatus = async (
    visitId: string | undefined,
    status: string,
  ) => {
    if (!visitId) return;
    await apiRequest(`/visits/${visitId}`, {
      method: "PATCH",
      body: {
        status: status === "in-progress" ? "in_progress" : status,
        completedAt:
          status === "completed" ? new Date().toISOString() : undefined,
      },
    });
    const data = await apiRequest<{ visits: any[] }>("/visits");
    setApiVisits(data.visits);
  };

  const createAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    setAppointmentNotice("");
    await apiRequest("/appointments", {
      method: "POST",
      body: appointmentDraft,
    });
    setAppointmentNotice("Appointment scheduled and parent notified.");
    setAppointmentDraft((draft) => ({ ...draft, scheduledAt: "", notes: "" }));
    const data = await apiRequest<AppointmentsResponse>("/appointments");
    setAppointments(data.appointments);
  };

  const statusStyles: Record<string, string> = {
    completed: "text-emerald-700 bg-emerald-50 border-emerald-100",
    "in-progress": "text-blue-700 bg-blue-50 border-blue-100",
    pending: "text-slate-600 bg-slate-50 border-slate-100",
    overdue: "text-red-700 bg-red-50 border-red-100",
  };

  const riskStyles: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };

  const completed = visits.filter((v) => v.status === "completed").length;
  const total = visits.length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good morning, {user?.name?.split(" ")[0] || "Provider"}
          </h1>
          {visitError && (
            <p className="text-xs text-red-500 mt-1">{visitError}</p>
          )}
          <p className="text-slate-500 text-sm">
            {new Date().toLocaleDateString()} ·{" "}
            {user?.municipality || "Care team"}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${offlineMode ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"}`}
        >
          {offlineMode ? (
            <WifiOff className="w-3.5 h-3.5" />
          ) : (
            <Wifi className="w-3.5 h-3.5" />
          )}
          {offlineMode
            ? "Offline — syncing when connected"
            : "Online · Synced 2 min ago"}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Visits Today"
          value={`${completed}/${total}`}
          icon={CheckCircle2}
          color="emerald"
          delta={`+${completed} done`}
        />
        <KPICard
          label="Pending Follow-ups"
          value="23"
          icon={Clock}
          color="amber"
          delta="3 urgent"
        />
        <KPICard
          label="Missed Vaccines"
          value="7"
          icon={Syringe}
          color="red"
          delta="This week"
        />
        <KPICard
          label="Assigned Families"
          value="142"
          icon={Users}
          color="teal"
        />
      </div>

      {/* Progress bar */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-800">
            Today's Visit Progress
          </p>
          <span className="text-sm font-bold text-teal-700">
            {Math.round((completed / total) * 100)}%
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {completed} completed
          </span>
          <span className="flex items-center gap-1 text-blue-600">
            <span className="w-2 h-2 rounded-full bg-blue-400" />1 in progress
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            {visits.filter((v) => v.status === "pending").length} pending
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            {visits.filter((v) => v.status === "overdue").length} overdue
          </span>
        </div>
      </Card>

      {/* Visit list */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Today's Schedule</h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search families..."
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-300 w-40"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {visits.map((v, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors ${v.status === "in-progress" ? "bg-blue-50/50" : ""}`}
            >
              <span className="font-mono text-xs text-slate-400 w-10 flex-shrink-0">
                {v.time}
              </span>
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${riskStyles[v.risk].includes("emerald") ? "bg-emerald-400" : riskStyles[v.risk].includes("amber") ? "bg-amber-400" : "bg-red-400"}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {v.family} —{" "}
                  <span className="font-normal text-slate-600">{v.child}</span>
                </p>
                <p className="text-xs text-slate-400 truncate">{v.address}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyles[v.status]}`}
              >
                {v.status.replace("-", " ")}
              </span>
              <button
                onClick={() =>
                  updateVisitStatus(
                    v.id,
                    v.status === "completed" ? "completed" : "in-progress",
                  )
                }
                className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors flex-shrink-0"
              >
                {v.status === "completed" ? "Review" : "Start Visit"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            Schedule Appointment
          </h3>
          <form onSubmit={createAppointment} className="space-y-3">
            <select
              value={appointmentDraft.childId}
              onChange={(event) =>
                setAppointmentDraft((draft) => ({
                  ...draft,
                  childId: event.target.value,
                }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              required
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.full_name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={appointmentDraft.type}
                onChange={(event) =>
                  setAppointmentDraft((draft) => ({
                    ...draft,
                    type: event.target.value,
                  }))
                }
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="vaccination">Vaccination</option>
                <option value="checkup">Check-up</option>
                <option value="home_visit">Home visit</option>
                <option value="dental">Dental</option>
                <option value="other">Other</option>
              </select>
              <input
                type="datetime-local"
                value={appointmentDraft.scheduledAt}
                onChange={(event) =>
                  setAppointmentDraft((draft) => ({
                    ...draft,
                    scheduledAt: event.target.value,
                  }))
                }
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                required
              />
            </div>
            <input
              value={appointmentDraft.location}
              onChange={(event) =>
                setAppointmentDraft((draft) => ({
                  ...draft,
                  location: event.target.value,
                }))
              }
              placeholder="Location"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
            />
            <textarea
              value={appointmentDraft.notes}
              onChange={(event) =>
                setAppointmentDraft((draft) => ({
                  ...draft,
                  notes: event.target.value,
                }))
              }
              placeholder="Notes for parent"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm min-h-20"
            />
            <button className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700">
              Schedule and notify parent
            </button>
            {appointmentNotice && (
              <p className="text-xs text-emerald-600 font-semibold">
                {appointmentNotice}
              </p>
            )}
          </form>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            Appointment Responses
          </h3>
          <div className="space-y-3">
            {appointments.slice(0, 5).map((appointment) => (
              <div
                key={appointment.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {appointment.child_name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {appointment.type.replace("_", " ")} ·{" "}
                      {new Date(appointment.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      appointment.status === "confirmed"
                        ? "success"
                        : appointment.status === "reschedule_requested"
                          ? "warning"
                          : appointment.status === "missed"
                            ? "danger"
                            : "info"
                    }
                  >
                    {appointment.status.replace("_", " ")}
                  </Badge>
                </div>
                {appointment.parent_response && (
                  <p className="text-xs text-slate-600 mt-2">
                    {appointment.parent_response}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Home Visit Form ──────────────────────────────────────────────────────────

function HomeVisitForm() {
  const [activeSection, setActiveSection] = useState("overview");
  const [visits, setVisits] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [notice, setNotice] = useState("");
  const [visitDraft, setVisitDraft] = useState({
    childId: "",
    scheduledAt: "",
    visitType: "routine",
    location: "",
  });
  const [form, setForm] = useState({
    temperature: "",
    weightKg: "",
    heightCm: "",
    symptoms: "",
    nutritionNotes: "",
    vaccinationNotes: "",
    developmentNotes: "",
    environmentNotes: "",
    riskNotes: "",
    riskLevel: "low",
    nextVisitAt: "",
    recommendedActions: [] as string[],
    followUpType: "vaccination",
    followUpAt: "",
    followUpLocation: "",
    followUpNotes: "",
  });
  const sections = [
    "overview",
    "health",
    "vaccination",
    "development",
    "environment",
    "actions",
    "submit",
  ];
  const sectionLabels: Record<string, string> = {
    overview: "Overview",
    health: "Health",
    vaccination: "Vaccines",
    development: "Development",
    environment: "Home",
    actions: "Actions",
    submit: "Submit",
  };

  const loadVisits = async () => {
    const [data, childData] = await Promise.all([
      apiRequest<{ visits: any[] }>("/visits"),
      apiRequest<{ children: any[] }>("/children"),
    ]);
    setVisits(data.visits);
    setChildren(childData.children);
    setVisitDraft((draft) => ({
      ...draft,
      childId: draft.childId || childData.children[0]?.id || "",
    }));
    setSelectedVisitId(
      (current) =>
        current ||
        data.visits.find((visit) => visit.status !== "completed")?.id ||
        data.visits[0]?.id ||
        "",
    );
  };

  useEffect(() => {
    loadVisits().catch(() => setVisits([]));
  }, []);

  const visit = visits.find((item) => item.id === selectedVisitId);
  const selectedDraftChild = children.find(
    (child) => child.id === visitDraft.childId,
  );
  const setField = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const toggleAction = (action: string) => {
    setForm((current) => ({
      ...current,
      recommendedActions: current.recommendedActions.includes(action)
        ? current.recommendedActions.filter((item) => item !== action)
        : [...current.recommendedActions, action],
    }));
  };

  const saveVisit = async (status: "in_progress" | "completed") => {
    if (!visit) return;
    setNotice("");
    const body: any = {
      status,
      completedAt:
        status === "completed" ? new Date().toISOString() : undefined,
      temperature: form.temperature ? Number(form.temperature) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
      symptoms: form.symptoms || undefined,
      nutritionNotes: form.nutritionNotes || undefined,
      vaccinationNotes: form.vaccinationNotes || undefined,
      developmentNotes: form.developmentNotes || undefined,
      environmentNotes: form.environmentNotes || undefined,
      riskNotes: form.riskNotes || undefined,
      riskLevel: form.riskLevel,
      nextVisitAt: form.nextVisitAt || undefined,
      recommendedActions: form.recommendedActions,
      followUpAppointment: form.followUpAt
        ? {
            type: form.followUpType,
            scheduledAt: form.followUpAt,
            location: form.followUpLocation,
            notes: form.followUpNotes,
          }
        : undefined,
    };
    await apiRequest(`/visits/${visit.id}`, { method: "PATCH", body });
    setNotice(
      status === "completed"
        ? "Visit completed. Parent was notified."
        : "Draft saved.",
    );
    await loadVisits();
  };

  const createVisit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setNotice("");
    const data = await apiRequest<{ visit: any }>("/visits", {
      method: "POST",
      body: {
        childId: visitDraft.childId,
        scheduledAt: visitDraft.scheduledAt || new Date().toISOString(),
        visitType: visitDraft.visitType,
        location: visitDraft.location,
      },
    });
    setSelectedVisitId(data.visit.id);
    setNotice("Visit created. Parent was notified.");
    await loadVisits();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">
              Assigned Visits
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a scheduled visit to complete.
            </p>
          </div>
          <form
            onSubmit={createVisit}
            className="p-4 border-b border-slate-100 bg-slate-50 space-y-2"
          >
            <p className="text-xs font-bold text-slate-700">
              Create home visit
            </p>
            <select
              value={visitDraft.childId}
              onChange={(event) =>
                setVisitDraft((draft) => ({
                  ...draft,
                  childId: event.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              disabled={children.length === 0}
            >
              {children.length === 0 && (
                <option value="">No assigned children</option>
              )}
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.full_name}
                  {child.parent_name ? ` - ${child.parent_name}` : ""}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={visitDraft.visitType}
                onChange={(event) =>
                  setVisitDraft((draft) => ({
                    ...draft,
                    visitType: event.target.value,
                  }))
                }
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
              >
                <option value="routine">Routine</option>
                <option value="follow-up">Follow-up</option>
                <option value="vaccination follow-up">Vaccination</option>
                <option value="missed-care follow-up">Missed care</option>
              </select>
              <input
                type="datetime-local"
                value={visitDraft.scheduledAt}
                onChange={(event) =>
                  setVisitDraft((draft) => ({
                    ...draft,
                    scheduledAt: event.target.value,
                  }))
                }
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <input
              value={visitDraft.location}
              onChange={(event) =>
                setVisitDraft((draft) => ({
                  ...draft,
                  location: event.target.value,
                }))
              }
              placeholder="Location"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
            <button
              type="submit"
              disabled={!visitDraft.childId}
              className="w-full bg-teal-600 text-white py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create and notify parent
            </button>
            {children.length === 0 && (
              <p className="text-[11px] text-amber-600 leading-relaxed">
                Admin needs to assign a parent/child to this nurse before visits
                can be created.
              </p>
            )}
          </form>
          <div className="divide-y divide-slate-50 max-h-[560px] overflow-y-auto">
            {visits.length === 0 && (
              <p className="p-4 text-sm text-slate-500">
                No visits assigned yet.
              </p>
            )}
            {visits.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedVisitId(item.id)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedVisitId === item.id ? "bg-teal-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {item.child_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDisplayDate(item.scheduled_at)} - {item.visit_type}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.location || "No location set"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      item.status === "completed"
                        ? "success"
                        : item.status === "missed"
                          ? "danger"
                          : "info"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card className="p-5 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  {visit?.child_name || "Home Visit Form"}
                </h2>
                <p className="text-sm text-slate-500">
                  {visit
                    ? `${childAgeLabel(visit.date_of_birth)} - ${visit.visit_type}`
                    : "Choose a visit from the list"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {visit?.location || "Location not set"}
                </p>
                {visit && (
                  <p className="text-xs text-teal-600 font-semibold mt-1">
                    Parent to notify: {visit.parent_name || "Linked parent"}
                    {visit.parent_email ? ` - ${visit.parent_email}` : ""}
                  </p>
                )}
                {!visit && selectedDraftChild && (
                  <p className="text-xs text-teal-600 font-semibold mt-1">
                    New visit will notify:{" "}
                    {selectedDraftChild.parent_name || "linked parent"}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    form.riskLevel === "high" || form.riskLevel === "critical"
                      ? "danger"
                      : form.riskLevel === "moderate"
                        ? "warning"
                        : "success"
                  }
                >
                  {form.riskLevel} risk
                </Badge>
                <p className="text-xs text-slate-400 mt-2">
                  {visit ? formatDisplayDate(visit.scheduled_at) : ""}
                </p>
              </div>
            </div>
          </Card>

          <div className="flex gap-1 mb-5 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeSection === section ? "bg-teal-600 text-white" : "bg-white text-slate-500 border border-slate-100 hover:border-teal-200"}`}
              >
                {sectionLabels[section]}
              </button>
            ))}
          </div>

          <Card className="p-5 mb-4">
            {activeSection === "overview" && (
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Temperature
                  </label>
                  <input
                    value={form.temperature}
                    onChange={(event) =>
                      setField("temperature", event.target.value)
                    }
                    type="number"
                    step="0.1"
                    placeholder="36.8"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Weight kg
                  </label>
                  <input
                    value={form.weightKg}
                    onChange={(event) =>
                      setField("weightKg", event.target.value)
                    }
                    type="number"
                    step="0.1"
                    placeholder="12.4"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Height cm
                  </label>
                  <input
                    value={form.heightCm}
                    onChange={(event) =>
                      setField("heightCm", event.target.value)
                    }
                    type="number"
                    step="0.1"
                    placeholder="86"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Symptoms / urgent concerns
                  </label>
                  <textarea
                    value={form.symptoms}
                    onChange={(event) =>
                      setField("symptoms", event.target.value)
                    }
                    rows={3}
                    placeholder="Fever, cough, appetite, sleep, medication..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {activeSection === "health" && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Nutrition and General Health
                </h3>
                <textarea
                  value={form.nutritionNotes}
                  onChange={(event) =>
                    setField("nutritionNotes", event.target.value)
                  }
                  rows={6}
                  placeholder="Feeding, appetite, sleep, parent concerns, medications..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
            )}

            {activeSection === "vaccination" && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Vaccination Review
                </h3>
                <textarea
                  value={form.vaccinationNotes}
                  onChange={(event) =>
                    setField("vaccinationNotes", event.target.value)
                  }
                  rows={6}
                  placeholder="Completed vaccines, missed vaccines, refusal/delay reason, schedule needed..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
            )}

            {activeSection === "development" && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Development Milestones
                </h3>
                <textarea
                  value={form.developmentNotes}
                  onChange={(event) =>
                    setField("developmentNotes", event.target.value)
                  }
                  rows={6}
                  placeholder="Motor, language, social interaction, feeding independence, concerns..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
            )}

            {activeSection === "environment" && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Home Environment
                </h3>
                <textarea
                  value={form.environmentNotes}
                  onChange={(event) =>
                    setField("environmentNotes", event.target.value)
                  }
                  rows={6}
                  placeholder="Hygiene, heating, safety risks, smoke exposure, transport access..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
            )}

            {activeSection === "actions" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3">
                    Recommended Actions
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      "Schedule vaccination",
                      "Schedule check-up",
                      "Send parent guidance",
                      "Escalate to doctor",
                      "Create follow-up visit",
                      "Mark missed care resolved",
                    ].map((action) => (
                      <label
                        key={action}
                        className="flex items-center gap-2 p-3 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={form.recommendedActions.includes(action)}
                          onChange={() => toggleAction(action)}
                        />
                        {action}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Risk level
                    </label>
                    <select
                      value={form.riskLevel}
                      onChange={(event) =>
                        setField("riskLevel", event.target.value)
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Next home visit
                    </label>
                    <input
                      type="datetime-local"
                      value={form.nextVisitAt}
                      onChange={(event) =>
                        setField("nextVisitAt", event.target.value)
                      }
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <textarea
                  value={form.riskNotes}
                  onChange={(event) =>
                    setField("riskNotes", event.target.value)
                  }
                  rows={3}
                  placeholder="Risk notes and escalation reason..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
            )}

            {activeSection === "submit" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Create Follow-up Appointment
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <select
                    value={form.followUpType}
                    onChange={(event) =>
                      setField("followUpType", event.target.value)
                    }
                    className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="vaccination">Vaccination</option>
                    <option value="checkup">Check-up</option>
                    <option value="home_visit">Home visit</option>
                    <option value="dental">Dental</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="datetime-local"
                    value={form.followUpAt}
                    onChange={(event) =>
                      setField("followUpAt", event.target.value)
                    }
                    className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <input
                  value={form.followUpLocation}
                  onChange={(event) =>
                    setField("followUpLocation", event.target.value)
                  }
                  placeholder="Location"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                />
                <textarea
                  value={form.followUpNotes}
                  onChange={(event) =>
                    setField("followUpNotes", event.target.value)
                  }
                  rows={3}
                  placeholder="Notes for parent..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none"
                />
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            <button
              onClick={() => saveVisit("in_progress")}
              disabled={!visit}
              className="flex-1 py-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => saveVisit("completed")}
              disabled={!visit}
              className="flex-1 py-3 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
            >
              Complete Visit
            </button>
          </div>
          {notice && (
            <p className="text-xs text-emerald-600 font-semibold mt-3">
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChildTimeline() {
  return <LiveChildTimeline />;
}

function LiveChildTimeline() {
  const [filter, setFilter] = useState("all");
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordNotice, setRecordNotice] = useState("");
  const [recordDraft, setRecordDraft] = useState({
    type: "vaccination",
    title: "",
    date: new Date().toISOString().slice(0, 10),
    status: "completed",
    notes: "",
  });
  const filters = ["all", "vaccinations", "check-ups", "milestones", "missed"];

  const loadTimeline = async (childId: string) => {
    setLoading(true);
    apiRequest<{ timeline: any[] }>(`/dashboard/children/${childId}/timeline`)
      .then((data) => setEvents(data.timeline))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiRequest<{ children: any[] }>("/children")
      .then((data) => {
        setChildren(data.children);
        setSelectedChildId(data.children[0]?.id || "");
      })
      .catch(() => setChildren([]));
  }, []);

  useEffect(() => {
    if (!selectedChildId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    loadTimeline(selectedChildId);
  }, [selectedChildId]);

  const child = children.find((item) => item.id === selectedChildId);
  const timeline = events.map((event) => ({
    date: formatDisplayDate(
      event.date || event.scheduled_date || event.completed_date,
    ),
    label:
      event.title ||
      event.vaccine_name ||
      event.checkup_type ||
      event.name ||
      "Health event",
    type:
      event.type === "checkup"
        ? "check-ups"
        : event.type === "vaccination"
          ? "vaccinations"
          : event.type || "milestones",
    status: event.status || "completed",
    detail:
      event.notes ||
      event.description ||
      event.provider_name ||
      event.data?.notes ||
      "Recorded in VitaPath",
  }));
  const filtered =
    filter === "all"
      ? timeline
      : timeline.filter(
          (event) =>
            event.type === filter ||
            (filter === "missed" &&
              ["missed", "delayed", "overdue"].includes(event.status)),
        );

  const dotColor: Record<string, string> = {
    completed: "bg-emerald-500 border-emerald-200",
    missed: "bg-red-500 border-red-200",
    delayed: "bg-red-500 border-red-200",
    overdue: "bg-red-500 border-red-200",
    pending: "bg-blue-400 border-blue-200",
    scheduled: "bg-blue-400 border-blue-200",
    confirmed: "bg-blue-400 border-blue-200",
    in_progress: "bg-amber-400 border-amber-200",
    cancelled: "bg-slate-400 border-slate-200",
  };

  const addRecord = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (!selectedChildId) return;
    setRecordNotice("");
    const status = recordDraft.status;
    if (recordDraft.type === "vaccination") {
      await apiRequest(`/children/${selectedChildId}/vaccinations`, {
        method: "POST",
        body: {
          vaccineName: recordDraft.title,
          recommendedDate: recordDraft.date,
          scheduledDate: recordDraft.date,
          completedDate: status === "completed" ? recordDraft.date : undefined,
          status,
        },
      });
    } else if (recordDraft.type === "checkup") {
      await apiRequest(`/children/${selectedChildId}/checkups`, {
        method: "POST",
        body: {
          checkupType: recordDraft.title,
          scheduledDate: recordDraft.date,
          completedDate: status === "completed" ? recordDraft.date : undefined,
          notes: recordDraft.notes,
          status,
        },
      });
    } else {
      await apiRequest(`/children/${selectedChildId}/milestones`, {
        method: "POST",
        body: {
          title: recordDraft.title,
          description: recordDraft.notes,
          expectedDate: recordDraft.date,
          achievedDate: status === "completed" ? recordDraft.date : undefined,
          status,
        },
      });
    }
    setRecordNotice("Record added to timeline.");
    setRecordDraft((draft) => ({ ...draft, title: "", notes: "" }));
    await loadTimeline(selectedChildId);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {child?.full_name || "Child Health Timeline"}
          </h1>
          <p className="text-sm text-slate-500">
            {child
              ? `${childAgeLabel(child.date_of_birth)} - Born ${formatDisplayDate(child.date_of_birth)}`
              : "Add a child profile to see health events"}
          </p>
        </div>
        {children.length > 0 && (
          <select
            value={selectedChildId}
            onChange={(event) => setSelectedChildId(event.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-teal-300"
          >
            {children.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {children.length > 0 && (
        <Card className="p-4 mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Add Health Record
              </h3>
              <p className="text-xs text-slate-500">
                Record completed vaccines, check-ups, and milestones for the
                selected child.
              </p>
            </div>
            {recordNotice && (
              <span className="text-xs font-semibold text-emerald-600">
                {recordNotice}
              </span>
            )}
          </div>
          <form onSubmit={addRecord} className="grid md:grid-cols-6 gap-2">
            <select
              value={recordDraft.type}
              onChange={(event) =>
                setRecordDraft((draft) => ({
                  ...draft,
                  type: event.target.value,
                }))
              }
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="vaccination">Vaccination</option>
              <option value="checkup">Check-up</option>
              <option value="milestone">Milestone</option>
            </select>
            <input
              value={recordDraft.title}
              onChange={(event) =>
                setRecordDraft((draft) => ({
                  ...draft,
                  title: event.target.value,
                }))
              }
              placeholder={
                recordDraft.type === "vaccination"
                  ? "MMR vaccine"
                  : recordDraft.type === "checkup"
                    ? "Dental check-up"
                    : "First words"
              }
              className="md:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />
            <input
              type="date"
              value={recordDraft.date}
              onChange={(event) =>
                setRecordDraft((draft) => ({
                  ...draft,
                  date: event.target.value,
                }))
              }
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              required
            />
            <select
              value={recordDraft.status}
              onChange={(event) =>
                setRecordDraft((draft) => ({
                  ...draft,
                  status: event.target.value,
                }))
              }
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="missed">Missed</option>
              <option value="delayed">Delayed</option>
            </select>
            <button className="bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700">
              Add
            </button>
            <input
              value={recordDraft.notes}
              onChange={(event) =>
                setRecordDraft((draft) => ({
                  ...draft,
                  notes: event.target.value,
                }))
              }
              placeholder="Optional notes"
              className="md:col-span-6 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </form>
        </Card>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${filter === item ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-500 border-slate-200 hover:border-teal-200"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="relative pl-8">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-100" />
        <div className="space-y-3">
          {loading && (
            <Card className="p-4 text-sm text-slate-500">
              Loading timeline...
            </Card>
          )}
          {!loading && filtered.length === 0 && (
            <Card className="p-4 text-sm text-slate-500">
              No health events found for this filter.
            </Card>
          )}
          {filtered.map((event, index) => (
            <div key={`${event.label}-${index}`} className="relative">
              <div
                className={`absolute -left-[21px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white ${dotColor[event.status] || "bg-slate-400 border-slate-200"}`}
              />
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {event.label}
                    </p>
                    <p className="text-xs text-slate-500">{event.date}</p>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      {event.detail}
                    </p>
                  </div>
                  <Badge
                    variant={
                      ["missed", "delayed", "overdue"].includes(event.status)
                        ? "danger"
                        : event.status === "completed"
                          ? "success"
                          : "info"
                    }
                  >
                    {event.status}
                  </Badge>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIRiskDashboard() {
  const [riskAlerts, setRiskAlerts] = useState<any[]>([]);
  const [riskMessage, setRiskMessage] = useState("");
  const [aiInsight, setAiInsight] = useState<any | null>(null);
  const [aiInsightChild, setAiInsightChild] = useState<any | null>(null);
  const [aiLoadingChildId, setAiLoadingChildId] = useState("");
  const [aiError, setAiError] = useState("");
  const highRiskChildren: any[] = [];

  const heatmapMunicipalities: any[] = [];

  const riskColor: Record<string, string> = {
    critical: "bg-red-100 border-red-300 text-red-800",
    high: "bg-orange-100 border-orange-300 text-orange-800",
    medium: "bg-amber-100 border-amber-300 text-amber-800",
    low: "bg-emerald-100 border-emerald-300 text-emerald-800",
  };

  useEffect(() => {
    apiRequest<{ alerts: any[] }>("/risk/alerts")
      .then((data) => setRiskAlerts(data.alerts))
      .catch(() => setRiskAlerts([]));
  }, []);

  const visibleRiskChildren =
    riskAlerts.length > 0
      ? riskAlerts.map((item) => ({
          id: item.child.id,
          child: item.child,
          name: item.child.full_name,
          age: childAgeLabel(item.child.date_of_birth),
          score: item.score,
          reason:
            item.reasons.join(", ") || "Preventive care follow-up required",
          municipality: item.child.municipality || "Not set",
          lastVisit: item.level,
        }))
      : highRiskChildren;

  const highRiskCount = visibleRiskChildren.filter(
    (item) => item.score >= 60,
  ).length;
  const mediumRiskCount = visibleRiskChildren.filter(
    (item) => item.score >= 30 && item.score < 60,
  ).length;
  const aiRiskDistribution = [
    {
      label: "Low Risk",
      value: Math.max(0, riskAlerts.length - highRiskCount - mediumRiskCount),
      color: "#10B981",
    },
    { label: "Medium Risk", value: mediumRiskCount, color: "#F59E0B" },
    { label: "High Risk", value: highRiskCount, color: "#EF4444" },
  ];
  const aiAlerts =
    riskAlerts.length > 0
      ? riskAlerts.slice(0, 4).map((item) => ({
          severity: item.level === "high" ? "critical" : item.level,
          text: `${item.child.full_name}: ${(item.reasons || []).join(", ") || "Preventive care follow-up required"}`,
          time: `Score ${item.score}`,
        }))
      : [];

  const recalculateRisk = async () => {
    await apiRequest("/risk/recalculate", { method: "POST" });
    const data = await apiRequest<{ alerts: any[] }>("/risk/alerts");
    setRiskAlerts(data.alerts);
    setRiskMessage("Risk scores recalculated.");
  };

  const analyzeWithOpenAI = async (child: any) => {
    setAiLoadingChildId(child.id);
    setAiError("");
    setAiInsight(null);
    setAiInsightChild(child);
    try {
      const data = await apiRequest<any>(`/risk/children/${child.id}/analyze`, {
        method: "POST",
      });
      setAiInsight(data);
      setRiskMessage(`AI analysis completed for ${child.full_name}.`);
    } catch (error: any) {
      setAiError(
        error?.message ||
          "AI analysis failed. Check backend console and OpenAI API key.",
      );
    } finally {
      setAiLoadingChildId("");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            AI Risk Detection
          </h1>
          <p className="text-sm text-slate-500">
            Live preventive risk analysis from VitaPath records
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-100">
          <Zap className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-xs font-semibold text-teal-700">
            AI Model: Groq AI + VitaPath rules
          </span>
        </div>
      </div>

      {/* Risk overview */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="High-Risk Children"
          value={String(highRiskCount)}
          icon={AlertTriangle}
          color="red"
          delta="Live database"
        />
        <KPICard
          label="Medium Risk"
          value={String(mediumRiskCount)}
          icon={AlertCircle}
          color="amber"
          delta="Monitoring"
        />
        <KPICard
          label="Open Risk Alerts"
          value={String(riskAlerts.length)}
          icon={Zap}
          color="teal"
          delta="Current records"
        />
        <KPICard
          label="Children Available"
          value={String(visibleRiskChildren.length)}
          icon={TrendingUp}
          color="emerald"
          delta="From VitaPath records"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Risk donut */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            Risk Distribution
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={aiRiskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
              >
                {aiRiskDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v.toLocaleString(), "children"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {aiRiskDistribution.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-slate-600">{d.label}</span>
                </div>
                <span className="font-semibold text-slate-800">
                  {d.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Alerts */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            AI-Generated Alerts · Priority Queue
          </h3>
          <div className="space-y-2.5">
            {(aiAlerts.length > 0
              ? aiAlerts
              : [
                  {
                    severity: "low",
                    text: "No active risk alerts from the current database.",
                    time: "Live",
                  },
                ]
            ).map((a, i) => {
              const sevStyle: Record<string, string> = {
                critical: "border-red-200 bg-red-50",
                high: "border-orange-200 bg-orange-50",
                medium: "border-amber-200 bg-amber-50",
                moderate: "border-amber-200 bg-amber-50",
                low: "border-slate-200 bg-slate-50",
              };
              const sevBadge: Record<string, string> = {
                critical: "text-red-700 bg-red-100",
                high: "text-orange-700 bg-orange-100",
                medium: "text-amber-700 bg-amber-100",
                moderate: "text-amber-700 bg-amber-100",
                low: "text-slate-600 bg-slate-100",
              };
              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${sevStyle[a.severity]}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex-shrink-0 mt-0.5 ${sevBadge[a.severity]}`}
                    >
                      {a.severity}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed flex-1">
                      {a.text}
                    </p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                      {a.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {(aiInsight || aiError || aiLoadingChildId) && (
        <Card className="p-5 mb-5 border-teal-100 bg-teal-50/40">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                OpenAI Preventive Insight
              </h3>
              <p className="text-xs text-slate-500">
                {aiInsightChild?.full_name
                  ? `${aiInsightChild.full_name} · `
                  : ""}
                Supports clinical review and does not replace provider judgment.
              </p>
            </div>
            {aiInsight?.insight?.urgency && (
              <Badge
                variant={
                  aiInsight.insight.urgency === "urgent" ? "danger" : "info"
                }
              >
                {aiInsight.insight.urgency.replaceAll("_", " ")}
              </Badge>
            )}
          </div>

          {aiLoadingChildId && (
            <div className="flex items-center gap-2 text-sm text-teal-700">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analyzing records with OpenAI...
            </div>
          )}

          {aiError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {aiError}
            </div>
          )}

          {aiInsight?.insight && (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Summary
                  </p>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {aiInsight.insight.summary}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Parent message
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {aiInsight.insight.parentFriendlyMessage}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Provider notes
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {aiInsight.insight.providerNotes}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Key reasons
                  </p>
                  <div className="space-y-1.5">
                    {(aiInsight.insight.keyReasons || []).map(
                      (reason: string, index: number) => (
                        <div
                          key={index}
                          className="text-xs text-slate-700 bg-white border border-slate-100 rounded-lg px-2.5 py-2"
                        >
                          {reason}
                        </div>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Recommended actions
                  </p>
                  <div className="space-y-1.5">
                    {(aiInsight.insight.recommendedActions || []).map(
                      (action: string, index: number) => (
                        <div
                          key={index}
                          className="text-xs text-slate-700 bg-white border border-slate-100 rounded-lg px-2.5 py-2"
                        >
                          {action}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* High-risk children table */}
      <Card className="mb-5">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Children Available for AI Review
          </h3>
          <button className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:underline">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {visibleRiskChildren.length === 0 && (
            <div className="px-4 py-6 text-sm text-slate-500">
              No child records available for AI review yet.
            </div>
          )}
          {visibleRiskChildren.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 flex-shrink-0">
                {c.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {c.name}{" "}
                  <span className="text-slate-400 font-normal">· {c.age}</span>
                </p>
                <p className="text-xs text-slate-500 truncate">{c.reason}</p>
              </div>
              <div className="text-center hidden sm:block">
                <p className="text-xs text-slate-400">Municipality</p>
                <p className="text-xs font-semibold text-slate-700">
                  {c.municipality}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Risk Score</p>
                <p
                  className={`text-sm font-black ${c.score >= 80 ? "text-red-600" : c.score >= 60 ? "text-orange-600" : c.score >= 30 ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {c.score}
                </p>
              </div>
              <div className="text-center hidden sm:block">
                <p className="text-xs text-slate-400">Last visit</p>
                <p className="text-xs font-semibold text-slate-700">
                  {c.lastVisit}
                </p>
              </div>
              <button
                onClick={() => analyzeWithOpenAI(c.child)}
                disabled={!c.id || aiLoadingChildId === c.id}
                className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors flex-shrink-0 disabled:opacity-60"
              >
                {aiLoadingChildId === c.id ? "Analyzing..." : "Analyze AI"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Heatmap */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">
          Municipality Risk Heatmap
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {heatmapMunicipalities.map((m) => (
            <div
              key={m.name}
              className={`p-4 rounded-xl border-2 ${riskColor[m.risk]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">{m.name}</p>
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${m.risk === "critical" ? "bg-red-200" : m.risk === "high" ? "bg-orange-200" : m.risk === "medium" ? "bg-amber-200" : "bg-emerald-200"}`}
                >
                  {m.risk}
                </span>
              </div>
              <p className="text-lg font-black">{m.highRisk}</p>
              <p className="text-[10px] opacity-70">
                high-risk of {m.children.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Municipality Dashboard ───────────────────────────────────────────────────

type MunicipalityOverview = {
  totalChildren: number;
  vaccinationCoverage: number;
  vaccinations: {
    completed: number;
    missed: number;
    pending: number;
    delayed: number;
    total: number;
  };
  checkupCoverage: number;
  checkups: { completed: number; missed: number; total: number };
  upcomingAppointments: number;
  riskDistribution: { level: string; count: number }[];
  highRiskChildren: {
    id: string;
    full_name: string;
    date_of_birth: string;
    municipality: string;
    score: number;
    level: string;
    reasons: string[];
    assigned_nurse: string;
  }[];
  healthcareWorkers: {
    id: string;
    name: string;
    email: string;
    municipality: string;
    assigned_families: number;
    visits_completed: number;
    visits_pending: number;
  }[];
  vaccinationTrend: { month: string; completed: number; missed: number }[];
  overdueVaccinations: {
    child_id: string;
    full_name: string;
    municipality: string;
    vaccine_name: string;
    recommended_date: string;
    days_overdue: number;
    assigned_nurse: string;
  }[];
  municipality: string;
};

function MunicipalityDashboard({ user }: { user: SafeUser | null }) {
  const [data, setData] = useState<MunicipalityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "risk" | "workers" | "overdue"
  >("overview");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ overview: MunicipalityOverview }>(
        "/municipality/overview",
      );
      setData(res.overview);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const riskColor: Record<string, string> = {
    low: "#10B981",
    moderate: "#F59E0B",
    high: "#F97316",
    critical: "#EF4444",
  };
  const riskBadge: Record<string, string> = {
    low: "text-emerald-700 bg-emerald-50 border-emerald-200",
    moderate: "text-amber-700 bg-amber-50 border-amber-200",
    high: "text-orange-700 bg-orange-50 border-orange-200",
    critical: "text-red-700 bg-red-50 border-red-200",
  };

  const d = data;
  const totalRisk = d?.riskDistribution.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-teal-600" />
            Municipality Health Monitor
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {d?.municipality || user?.municipality || "Loading…"} · Real-time
            preventive care oversight
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slateald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live · refreshed {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-semibold bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {d && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Children",
              value: d.totalChildren.toLocaleString(),
              icon: Baby,
              color: "teal",
              sub: "Registered in municipality",
            },
            {
              label: "Vaccine Coverage",
              value: `${d.vaccinationCoverage}%`,
              icon: Syringe,
              color:
                d.vaccinationCoverage >= 90
                  ? "emerald"
                  : d.vaccinationCoverage >= 75
                    ? "amber"
                    : "red",
              sub: `${d.vaccinations.missed} missed · ${d.vaccinations.pending} pending`,
            },
            {
              label: "Checkup Coverage",
              value: `${d.checkupCoverage}%`,
              icon: HeartPulse,
              color: d.checkupCoverage >= 85 ? "emerald" : "amber",
              sub: `${d.checkups.missed} missed check-ups`,
            },
            {
              label: "Upcoming Appts",
              value: d.upcomingAppointments.toLocaleString(),
              icon: CalendarDays,
              color: "blue",
              sub: "Scheduled appointments",
            },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center mb-3`}
              >
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                {label}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(["overview", "risk", "workers", "overdue"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all capitalize ${activeTab === t ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t === "risk"
              ? "High Risk"
              : t === "workers"
                ? "Healthcare Workers"
                : t === "overdue"
                  ? "Overdue Vaccines"
                  : "Overview"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && d && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Vaccination trend chart */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Vaccination Trend (6 months)
            </h3>
            {d.vaccinationTrend.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d.vaccinationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#10B981"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="missed"
                    name="Missed"
                    fill="#EF4444"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Risk distribution */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-teal-600" />
              Risk Distribution
            </h3>
            {d.riskDistribution.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                No risk data yet
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={d.riskDistribution.map((r) => ({
                        name: r.level,
                        value: r.count,
                        color: riskColor[r.level] ?? "#94a3b8",
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {d.riskDistribution.map((r, i) => (
                        <Cell key={i} fill={riskColor[r.level] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {d.riskDistribution.map((r) => (
                    <div
                      key={r.level}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: riskColor[r.level] }}
                      />
                      <span className="capitalize text-slate-600">
                        {r.level}
                      </span>
                      <span className="font-bold text-slate-800">
                        {r.count}
                      </span>
                      <span className="text-slate-400">
                        ({Math.round((r.count / totalRisk) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Vaccination breakdown */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Syringe className="w-4 h-4 text-teal-600" />
              Vaccination Breakdown
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Completed",
                  value: d.vaccinations.completed,
                  color: "bg-emerald-500",
                  total: d.vaccinations.total,
                },
                {
                  label: "Pending",
                  value: d.vaccinations.pending,
                  color: "bg-blue-400",
                  total: d.vaccinations.total,
                },
                {
                  label: "Delayed",
                  value: d.vaccinations.delayed,
                  color: "bg-amber-400",
                  total: d.vaccinations.total,
                },
                {
                  label: "Missed",
                  value: d.vaccinations.missed,
                  color: "bg-red-500",
                  total: d.vaccinations.total,
                },
              ].map(({ label, value, color, total }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{label}</span>
                    <span className="font-bold text-slate-800">
                      {value}{" "}
                      <span className="text-slate-400 font-normal">
                        / {total}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all`}
                      style={{
                        width: `${total > 0 ? (value / total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Checkup breakdown */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              Preventive Check-up Status
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Completed",
                  value: d.checkups.completed,
                  color: "bg-emerald-500",
                  total: d.checkups.total,
                },
                {
                  label: "Missed",
                  value: d.checkups.missed,
                  color: "bg-red-500",
                  total: d.checkups.total,
                },
                {
                  label: "Other",
                  value:
                    d.checkups.total - d.checkups.completed - d.checkups.missed,
                  color: "bg-slate-300",
                  total: d.checkups.total,
                },
              ].map(({ label, value, color, total }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{label}</span>
                    <span className="font-bold text-slate-800">
                      {Math.max(0, value)}{" "}
                      <span className="text-slate-400 font-normal">
                        / {total}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full`}
                      style={{
                        width: `${total > 0 ? (Math.max(0, value) / total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* High Risk Tab */}
      {activeTab === "risk" && d && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              High & Critical Risk Children
            </h3>
            <span className="text-xs text-slate-500">
              {d.highRiskChildren.length} children flagged
            </span>
          </div>
          {d.highRiskChildren.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-400">
              No high-risk children identified
            </Card>
          ) : (
            d.highRiskChildren.map((child) => {
              const ageMs = child.date_of_birth
                ? Date.now() - new Date(child.date_of_birth).getTime()
                : 0;
              const ageMonths = Math.floor(
                ageMs / (1000 * 60 * 60 * 24 * 30.44),
              );
              const ageLabel =
                ageMonths >= 24
                  ? `${Math.floor(ageMonths / 12)}y`
                  : `${ageMonths}mo`;
              return (
                <div
                  key={child.id}
                  className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <AlertOctagon className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">
                        {child.full_name}
                      </p>
                      <span className="text-xs text-slate-400">{ageLabel}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${riskBadge[child.level]}`}
                      >
                        {child.level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {child.municipality} · Score: {child.score}/100
                    </p>
                    {child.assigned_nurse && (
                      <p className="text-xs text-teal-600 mt-0.5">
                        Nurse: {child.assigned_nurse}
                      </p>
                    )}
                    {Array.isArray(child.reasons) &&
                      child.reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {child.reasons.slice(0, 3).map((r, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-red-50 text-red-700 border border-red-100 rounded-full px-2 py-0.5"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {child.score}
                    </div>
                    <div className="text-[10px] text-slate-400">risk score</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Healthcare Workers Tab */}
      {activeTab === "workers" && d && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              Healthcare Worker Workload
            </h3>
            <span className="text-xs text-slate-500">
              {d.healthcareWorkers.length} nurses/doctors
            </span>
          </div>
          {d.healthcareWorkers.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-400">
              No healthcare workers found
            </Card>
          ) : (
            d.healthcareWorkers.map((w) => (
              <div
                key={w.id}
                className="bg-white border border-slate-200 rounded-xl px-5 py-4"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{w.name}</p>
                    <p className="text-xs text-slate-500">
                      {w.email} · {w.municipality || "—"}
                    </p>
                  </div>
                  <div className="flex gap-6">
                    {[
                      {
                        label: "Families",
                        value: w.assigned_families,
                        icon: Users,
                      },
                      {
                        label: "Done",
                        value: w.visits_completed,
                        icon: CheckCircle2,
                      },
                      {
                        label: "Pending",
                        value: w.visits_pending,
                        icon: Clock,
                      },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="text-center">
                        <p className="text-lg font-bold text-slate-900">
                          {value}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Workload bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Visit completion rate</span>
                    <span>
                      {w.visits_completed + w.visits_pending > 0
                        ? Math.round(
                            (w.visits_completed /
                              (w.visits_completed + w.visits_pending)) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{
                        width: `${w.visits_completed + w.visits_pending > 0 ? (w.visits_completed / (w.visits_completed + w.visits_pending)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Overdue Vaccinations Tab */}
      {activeTab === "overdue" && d && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              Overdue Vaccinations
            </h3>
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-semibold">
              {d.overdueVaccinations.length} overdue
            </span>
          </div>
          {d.overdueVaccinations.length === 0 ? (
            <Card className="p-8 text-center text-sm text-emerald-600 font-semibold">
              All vaccinations are on schedule
            </Card>
          ) : (
            d.overdueVaccinations.map((v, i) => (
              <div
                key={i}
                className="bg-white border border-red-100 rounded-xl px-5 py-3 flex items-center gap-4"
              >
                <div
                  className={`w-2 h-10 rounded-full flex-shrink-0 ${v.days_overdue > 30 ? "bg-red-500" : v.days_overdue > 14 ? "bg-orange-400" : "bg-amber-400"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">
                    {v.full_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {v.vaccine_name} · Due{" "}
                    {new Date(v.recommended_date).toLocaleDateString()}
                  </p>
                  {v.assigned_nurse && (
                    <p className="text-xs text-teal-600 mt-0.5">
                      Nurse: {v.assigned_nurse}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-lg font-bold ${v.days_overdue > 30 ? "text-red-600" : v.days_overdue > 14 ? "text-orange-600" : "text-amber-600"}`}
                  >
                    {v.days_overdue}d
                  </p>
                  <p className="text-[10px] text-slate-400">overdue</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI Weekly Report ─────────────────────────────────────────────────────────

function AIWeeklyReport({ user }: { user: SafeUser | null }) {
  const [report, setReport] = useState<any>(null);
  const [reportMeta, setReportMeta] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const generateWeeklyReport = async () => {
    setReportLoading(true);
    setReportError("");
    setReport(null);
    try {
      const res = await apiRequest<{ report: any; meta: any }>(
        "/municipality/report",
        { method: "POST" },
      );
      setReport(res.report);
      setReportMeta(res.meta);
    } catch (e: any) {
      setReportError(e.message);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-7 h-7 text-teal-600" />
          AI Weekly Municipality Report
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {user?.municipality || "All Municipalities"} · Powered by Groq AI
        </p>
      </div>

      {/* Generate card */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-teal-300" />
              <span className="text-teal-300 text-xs font-bold uppercase tracking-widest">
                AI-Powered
              </span>
            </div>
            <h3 className="text-xl font-bold">Generate This Week's Report</h3>
            <p className="text-teal-200 text-sm mt-1">
              Groq AI analyses your municipality's real-time health data and
              generates an official narrative report with findings, risk
              assessment, and urgent action items.
            </p>
            <ul className="mt-3 space-y-1">
              {[
                "Live data from your municipality's records",
                "Risk trend analysis",
                "Urgent intervention recommendations",
                "Workforce performance summary",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-xs text-teal-200"
                >
                  <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={generateWeeklyReport}
              disabled={reportLoading}
              className="flex items-center gap-2 bg-white text-teal-700 font-bold px-5 py-3 rounded-xl hover:bg-teal-50 disabled:opacity-50 transition-colors text-sm"
            >
              <Zap
                className={`w-4 h-4 ${reportLoading ? "animate-pulse" : ""}`}
              />
              {reportLoading
                ? "Generating…"
                : report
                  ? "Regenerate Report"
                  : "Generate Report"}
            </button>
            {report && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 border border-teal-400 text-teal-200 font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-800 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Print / Export
              </button>
            )}
          </div>
        </div>
      </div>

      {reportError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {reportError}
        </div>
      )}

      {reportLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <Zap className="w-10 h-10 text-teal-300 mx-auto mb-3 animate-pulse" />
          <p className="font-semibold text-slate-700">
            AI is analysing your municipality data…
          </p>
          <p className="text-xs text-slate-400 mt-1">
            This takes about 10 seconds
          </p>
        </div>
      )}

      {!report && !reportLoading && !reportError && (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <Zap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            No report generated yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Generate Report" above to create this week's AI health report
          </p>
        </div>
      )}

      {report && reportMeta && !reportLoading && (
        <div className="space-y-4">
          {/* Report header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">
                    Official Report · Kosovo Child Health Platform
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Weekly Preventive Care Report
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {reportMeta.municipality} · Period: {reportMeta.period}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Generated {new Date(reportMeta.generatedAt).toLocaleString()}{" "}
                  by Groq AI
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-xl border-2 font-bold text-sm capitalize flex items-center gap-2 ${
                  report.trend === "improving"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : report.trend === "deteriorating"
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-amber-50 border-amber-300 text-amber-700"
                }`}
              >
                {report.trend === "improving" ? (
                  <TrendingUp className="w-4 h-4" />
                ) : report.trend === "deteriorating" ? (
                  <AlertOctagon className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                {report.trend}
              </div>
            </div>

            <div className="mt-4 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-teal-900">
                {report.headline}
              </p>
              {report.trendReason && (
                <p className="text-xs text-teal-600 mt-1">
                  {report.trendReason}
                </p>
              )}
            </div>

            {reportMeta.dataSnapshot && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  {
                    label: "Children",
                    value: reportMeta.dataSnapshot.totalChildren,
                  },
                  {
                    label: "Vac. Coverage",
                    value: `${reportMeta.dataSnapshot.vaccinationCoverage}%`,
                  },
                  {
                    label: "Overdue Vac.",
                    value: reportMeta.dataSnapshot.overdueVaccinations,
                    alert: reportMeta.dataSnapshot.overdueVaccinations > 0,
                  },
                  {
                    label: "New High Risk",
                    value: reportMeta.dataSnapshot.newHighRisk,
                    alert: reportMeta.dataSnapshot.newHighRisk > 0,
                  },
                  {
                    label: "Resolved",
                    value: reportMeta.dataSnapshot.resolvedCases,
                  },
                  {
                    label: "Visits / Week",
                    value: reportMeta.dataSnapshot.visitsThisWeek,
                  },
                ].map(({ label, value, alert }) => (
                  <div
                    key={label}
                    className={`rounded-xl p-3 text-center border ${alert ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}
                  >
                    <p
                      className={`text-lg font-bold ${alert ? "text-red-700" : "text-slate-900"}`}
                    >
                      {value}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {report.keyFindings?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-teal-600" /> Key Findings
              </h4>
              <ul className="space-y-2">
                {report.keyFindings.map((f: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-slate-700"
                  >
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Risk Assessment",
                content: report.riskSummary,
                icon: AlertOctagon,
                color: "text-red-600",
              },
              {
                title: "Vaccination Status",
                content: report.vaccinationSummary,
                icon: Syringe,
                color: "text-teal-600",
              },
              {
                title: "Workforce Activity",
                content: report.workforceSummary,
                icon: UserCheck,
                color: "text-emerald-600",
              },
            ]
              .filter(({ content }) => content)
              .map(({ title, content, icon: Icon, color }) => (
                <Card key={title} className="p-4">
                  <h5
                    className={`font-bold text-sm flex items-center gap-1.5 mb-2 ${color}`}
                  >
                    <Icon className="w-4 h-4" />
                    {title}
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {content}
                  </p>
                </Card>
              ))}
          </div>

          {report.urgentActions?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <h4 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                <BadgeAlert className="w-4 h-4" /> Urgent Actions Required
              </h4>
              <ul className="space-y-2">
                {report.urgentActions.map((a: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-red-700"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-center text-xs text-slate-400 pb-2">
            Report generated by VitaPath AI · {reportMeta.municipality} ·{" "}
            {new Date(reportMeta.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const [stats, setStats] = useState<any | null>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [adminRiskAlerts, setAdminRiskAlerts] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminChildren, setAdminChildren] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentNotice, setAssignmentNotice] = useState("");
  const [assignmentDraft, setAssignmentDraft] = useState({
    parentId: "",
    providerId: "",
    childId: "",
    notes: "",
  });
  const nurseData: any[] = [];

  useEffect(() => {
    apiRequest<{ stats: any }>("/dashboard/provider/stats")
      .then((data) => setStats(data.stats))
      .catch(() => setStats(null));
    apiRequest<{ visits: any[] }>("/visits")
      .then((data) => setVisits(data.visits))
      .catch(() => setVisits([]));
    apiRequest<{ alerts: any[] }>("/risk/alerts")
      .then((data) => setAdminRiskAlerts(data.alerts))
      .catch(() => setAdminRiskAlerts([]));
    refreshAdminDirectory();
  }, []);

  const refreshAdminDirectory = async () => {
    const [usersData, childrenData, assignmentsData] = await Promise.all([
      apiRequest<{ users: any[] }>("/users/care-team"),
      apiRequest<{ children: any[] }>("/children"),
      apiRequest<{ assignments: any[] }>("/users/assignments"),
    ]);
    setAdminUsers(usersData.users);
    setAdminChildren(childrenData.children);
    setAssignments(assignmentsData.assignments);
    setAssignmentDraft((draft) => ({
      ...draft,
      parentId:
        draft.parentId ||
        usersData.users.find((item) => item.role === "parent")?.id ||
        "",
      providerId:
        draft.providerId ||
        usersData.users.find((item) => item.role === "doctor")?.id ||
        "",
    }));
  };

  const liveNurseData =
    visits.length > 0
      ? Object.values(
          visits.reduce((acc: Record<string, any>, visit) => {
            const key = visit.nurse_name || "Unassigned provider";
            acc[key] ||= {
              name: key,
              zone: visit.location || "Care team",
              visits: 0,
              completed: 0,
              families: new Set(),
            };
            acc[key].visits += 1;
            if (visit.status === "completed") acc[key].completed += 1;
            if (visit.child_name) acc[key].families.add(visit.child_name);
            return acc;
          }, {}),
        ).map((item: any) => ({
          name: item.name,
          zone: item.zone,
          visits: item.visits,
          completion: Math.round(
            (item.completed / Math.max(item.visits, 1)) * 100,
          ),
          families: item.families.size,
        }))
      : nurseData;
  const parents = adminUsers.filter((item) => item.role === "parent");
  const providers = adminUsers.filter((item) => item.role === "doctor");
  const childrenForSelectedParent = adminChildren.filter(
    (child) => child.parent_id === assignmentDraft.parentId,
  );
  const createAssignment = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setAssignmentNotice("");
    try {
      await apiRequest("/users/assignments", {
        method: "POST",
        body: {
          parentId: assignmentDraft.parentId,
          providerId: assignmentDraft.providerId,
          childId: assignmentDraft.childId || undefined,
          relationship: "assigned_nurse",
          notes: assignmentDraft.notes || undefined,
        },
      });
      setAssignmentNotice("Nurse assigned successfully.");
      await refreshAdminDirectory();
    } catch (error) {
      setAssignmentNotice(
        error instanceof Error ? error.message : "Could not assign nurse",
      );
    }
  };

  const endAssignment = async (assignmentId: string) => {
    setAssignmentNotice("");
    try {
      await apiRequest(`/users/assignments/${assignmentId}/end`, {
        method: "PATCH",
      });
      setAssignmentNotice("Assignment ended.");
      await refreshAdminDirectory();
    } catch (error) {
      setAssignmentNotice(
        error instanceof Error ? error.message : "Could not end assignment",
      );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Municipal Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time public health intelligence from VitaPath database
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export Report
          </button>
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors">
            Share to Ministry
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KPICard
          label="Active Children"
          value={String(stats?.children_count ?? 0)}
          icon={Baby}
          color="teal"
          delta={`${stats?.parents_count ?? 0} parents`}
        />
        <KPICard
          label="Vaccination Gaps"
          value={String(stats?.vaccination_gaps ?? 0)}
          icon={Syringe}
          color="emerald"
          delta={`${stats?.overdue_vaccinations ?? 0} overdue`}
        />
        <KPICard
          label="Overdue Check-ups"
          value={String(stats?.overdue_checkups ?? 0)}
          icon={Clock}
          color="amber"
          delta={`${stats?.checkup_gaps ?? 0} gaps`}
        />
        <KPICard
          label="Home Visits"
          value={String(stats?.home_visits_count ?? 0)}
          icon={Stethoscope}
          color="blue"
          delta={`${stats?.completed_home_visits ?? 0} completed`}
        />
        <KPICard
          label="Risk Alerts"
          value={String(
            adminRiskAlerts.filter((alert) => alert.score >= 60).length,
          )}
          icon={AlertTriangle}
          color="red"
          delta="Live"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-5 mb-5">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Assign Nurse</h3>
            <Badge variant="info">{assignments.length} active</Badge>
          </div>
          <form onSubmit={createAssignment} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">
                Parent
              </label>
              <select
                value={assignmentDraft.parentId}
                onChange={(event) =>
                  setAssignmentDraft((draft) => ({
                    ...draft,
                    parentId: event.target.value,
                    childId: "",
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-teal-300"
              >
                <option value="">Select parent</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name} - {parent.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">
                Child
              </label>
              <select
                value={assignmentDraft.childId}
                onChange={(event) =>
                  setAssignmentDraft((draft) => ({
                    ...draft,
                    childId: event.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-teal-300"
              >
                <option value="">Whole family</option>
                {childrenForSelectedParent.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">
                Nurse / Provider
              </label>
              <select
                value={assignmentDraft.providerId}
                onChange={(event) =>
                  setAssignmentDraft((draft) => ({
                    ...draft,
                    providerId: event.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-teal-300"
              >
                <option value="">Select provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} - {provider.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">
                Notes
              </label>
              <input
                value={assignmentDraft.notes}
                onChange={(event) =>
                  setAssignmentDraft((draft) => ({
                    ...draft,
                    notes: event.target.value,
                  }))
                }
                placeholder="Zone, clinic, reason..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-300"
              />
            </div>
            <button
              type="submit"
              disabled={
                !assignmentDraft.parentId || !assignmentDraft.providerId
              }
              className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Assign Nurse
            </button>
            {assignmentNotice && (
              <p
                className={`text-xs font-semibold ${assignmentNotice.includes("Could") || assignmentNotice.includes("not") ? "text-red-600" : "text-emerald-600"}`}
              >
                {assignmentNotice}
              </p>
            )}
          </form>
        </Card>

        <Card className="lg:col-span-3">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Active Parent-Nurse Assignments
            </h3>
            <button
              onClick={refreshAdminDirectory}
              className="text-xs text-teal-600 font-semibold hover:underline"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Child
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Nurse
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assignments.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      No active assignments yet.
                    </td>
                  </tr>
                )}
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {assignment.parent_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {assignment.parent_email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {assignment.child_name || "Whole family"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {assignment.provider_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {assignment.provider_email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDisplayDate(assignment.assigned_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => endAssignment(assignment.id)}
                        className="text-xs text-red-600 font-semibold hover:underline"
                      >
                        End
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-5 mb-5">
        {/* Coverage by municipality */}
        <Card className="p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">
              Vaccination Coverage by Municipality
            </h3>
            <Badge variant="success">WHO Target: 90%</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={municipalityData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <YAxis
                domain={[75, 100]}
                tick={{ fontSize: 11, fill: "#94A3B8" }}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, "Coverage"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                }}
              />
              <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
                {municipalityData.map((m, i) => (
                  <Cell
                    key={i}
                    fill={
                      m.coverage >= 90
                        ? "#10B981"
                        : m.coverage >= 87
                          ? "#F59E0B"
                          : "#EF4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly trend */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            Coverage Trend — 2025
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={vaccinationTrend}>
              <defs>
                <linearGradient id="coverageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4338CA" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4338CA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} />
              <YAxis
                domain={[84, 97]}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
              />
              <Tooltip
                formatter={(v) => [`${v}%`, "Coverage"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#4338CA"
                strokeWidth={2}
                fill="url(#coverageGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Nurse performance table */}
      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Nurse Performance — This Month
          </h3>
          <button className="text-xs text-teal-600 font-semibold hover:underline">
            View all providers
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Nurse
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Zone
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Visits
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Completion
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Families
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {liveNurseData.map((n, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-[10px] font-bold text-teal-600">
                        {n.name
                          .split(" ")
                          .map((x) => x[0])
                          .join("")}
                      </div>
                      <span className="text-sm font-semibold text-slate-800">
                        {n.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">
                    {n.zone}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-slate-800 text-right">
                    {n.visits}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${n.completion >= 90 ? "bg-emerald-400" : n.completion >= 80 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${n.completion}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-bold ${n.completion >= 90 ? "text-emerald-600" : n.completion >= 80 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {n.completion}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600 text-right">
                    {n.families}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button className="text-xs text-teal-600 font-semibold hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Messaging Module ─────────────────────────────────────────────────────────

function MessagingModule({ user }: { user: SafeUser | null }) {
  const [activeConv, setActiveConv] = useState(0);
  const [message, setMessage] = useState("");
  const [apiMessages, setApiMessages] = useState<any[]>([]);
  const [careTeam, setCareTeam] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "online" | "offline"
  >("connecting");
  const [chatError, setChatError] = useState("");

  const loadChat = async () => {
    const [messagesData, usersData] = await Promise.all([
      apiRequest<{ messages: any[] }>("/messages"),
      apiRequest<{ users: any[] }>("/users/care-team"),
    ]);
    setApiMessages(messagesData.messages);
    setCareTeam(usersData.users.filter((item) => item.id !== user?.id));
  };

  useEffect(() => {
    if (!user) return;
    loadChat().catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !user) return;
    const nextSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    setSocket(nextSocket);
    setSocketStatus("connecting");

    nextSocket.on("connect", () => setSocketStatus("online"));
    nextSocket.on("disconnect", () => setSocketStatus("offline"));
    nextSocket.on("connect_error", () => setSocketStatus("offline"));
    nextSocket.on("message:new", (incoming) => {
      setApiMessages((current) =>
        current.some((item) => item.id === incoming.id)
          ? current
          : [...current, incoming],
      );
    });

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [user?.id]);

  const fallbackContact = {
    id: "",
    name: "VitaPath Care Team",
    role: "system",
    email: "",
    avatar: "SC",
  };
  const contacts = careTeam.length > 0 ? careTeam : [fallbackContact];
  const activeContact =
    contacts[Math.min(activeConv, contacts.length - 1)] || fallbackContact;
  const messagesForContact = apiMessages.filter(
    (item) =>
      item.sender_id === activeContact.id ||
      item.recipient_id === activeContact.id,
  );
  const visibleMessages =
    messagesForContact.length > 0
      ? messagesForContact.map((item) => ({
          id: item.id,
          sender: item.sender_id === user?.id ? "me" : "other",
          text: item.body,
          time: new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))
      : [
          {
            id: "empty",
            sender: "system",
            text: activeContact.id
              ? "Start a secure real-time conversation."
              : "No assigned contacts yet.",
            time: "Live",
          },
        ];
  const visibleConversations = contacts.map((contact) => {
    const last = [...apiMessages]
      .reverse()
      .find(
        (item) =>
          item.sender_id === contact.id || item.recipient_id === contact.id,
      );
    return {
      ...contact,
      avatar: initialsFor(contact.name),
      lastMessage:
        last?.body ||
        (contact.role === "admin"
          ? "Contact admin support"
          : "Start conversation"),
      time: last
        ? new Date(last.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Live",
      unread: apiMessages.filter(
        (item) =>
          item.sender_id === contact.id &&
          item.recipient_id === user?.id &&
          !item.read_at,
      ).length,
    };
  });

  const sendBackendMessage = async () => {
    const body = message.trim();
    if (!activeContact.id || !body) return;
    setChatError("");
    setMessage("");
    if (socket?.connected) {
      socket.emit(
        "message:send",
        { recipientId: activeContact.id, body },
        (response: any) => {
          if (!response?.ok) {
            setChatError(response?.error || "Could not send message");
            setMessage(body);
          }
        },
      );
      return;
    }
    try {
      const data = await apiRequest<{ message: any }>("/messages", {
        method: "POST",
        body: { recipientId: activeContact.id, body },
      });
      setApiMessages((current) =>
        current.some((item) => item.id === data.message.id)
          ? current
          : [...current, data.message],
      );
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Could not send message",
      );
      setMessage(body);
    }
  };

  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ maxHeight: "calc(100vh - 56px)" }}
    >
      <div className="w-72 flex-shrink-0 border-r border-slate-100 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-300 bg-slate-50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {visibleConversations.map((c, i) => (
            <button
              key={c.id || i}
              onClick={() => setActiveConv(i)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${activeConv === i ? "bg-teal-50" : ""}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${activeConv === i ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-semibold truncate ${activeConv === i ? "text-teal-700" : "text-slate-800"}`}
                  >
                    {c.name}
                  </p>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                    {c.time}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {c.lastMessage}
                </p>
              </div>
              {c.unread > 0 && (
                <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">
                  {c.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
            {initialsFor(activeContact.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {activeContact.name}
            </p>
            <p
              className={`text-xs font-medium ${socketStatus === "online" ? "text-emerald-600" : "text-amber-600"}`}
            >
              {socketStatus === "online"
                ? "Online - real-time chat"
                : socketStatus === "connecting"
                  ? "Connecting..."
                  : "Offline - REST fallback"}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="success">
              <Shield className="w-2.5 h-2.5" /> Secure chat
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {visibleMessages.map((m) => {
            if (m.sender === "system") {
              return (
                <div key={m.id} className="text-center">
                  <span className="text-[10px] text-slate-500 bg-white border border-slate-100 px-3 py-1 rounded-full">
                    {m.text}
                  </span>
                </div>
              );
            }
            const isMe = m.sender === "me";
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-xs lg:max-w-sm">
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-teal-600 text-white rounded-tr-sm" : "bg-white text-slate-800 border border-slate-100 shadow-sm rounded-tl-sm"}`}
                  >
                    {m.text}
                  </div>
                  <p
                    className={`text-[10px] text-slate-400 mt-1 ${isMe ? "text-right" : ""}`}
                  >
                    {m.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border-t border-slate-100 p-4">
          {chatError && (
            <p className="text-xs text-red-600 font-semibold mb-2">
              {chatError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendBackendMessage();
              }}
              placeholder={
                activeContact.id
                  ? "Type a secure message..."
                  : "No contact selected"
              }
              disabled={!activeContact.id}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-slate-50 disabled:opacity-60"
            />
            <button className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-teal-50 hover:text-teal-600 flex items-center justify-center transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={sendBackendMessage}
              disabled={!activeContact.id || !message.trim()}
              className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-teal-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({
  user,
  onUserUpdate,
}: {
  user: SafeUser | null;
  onUserUpdate: (user: SafeUser) => void;
}) {
  const [language, setLanguage] = useState("sq");
  const [notifications, setNotifications] = useState({
    sms: true,
    push: true,
    email: false,
    reminders: true,
  });
  const [settingsSaved, setSettingsSaved] = useState("");
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    municipality: user?.municipality || "",
    address: user?.address || "",
    password: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [settingsChildren, setSettingsChildren] = useState<any[]>([]);

  useEffect(() => {
    apiRequest<{ user: SafeUser }>("/users/me")
      .then((data) => {
        onUserUpdate(data.user);
        setProfile({
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          municipality: data.user.municipality || "",
          address: data.user.address || "",
          password: "",
        });
      })
      .catch(() => undefined);
    apiRequest<{ settings: any }>("/settings")
      .then((data) => {
        setLanguage(data.settings.language || "sq");
        setNotifications({
          sms: data.settings.sms_notifications,
          push: data.settings.push_notifications,
          email: data.settings.email_notifications,
          reminders: data.settings.reminder_notifications,
        });
      })
      .catch(() => undefined);
    apiRequest<{ children: any[] }>("/children")
      .then((data) => setSettingsChildren(data.children))
      .catch(() => setSettingsChildren([]));
  }, []);

  const saveProfile = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setProfileMessage("");
    try {
      const data = await apiRequest<{ user: SafeUser }>("/users/me", {
        method: "PATCH",
        body: {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          municipality: profile.municipality,
          address: profile.address,
          password: profile.password || undefined,
        },
      });
      const token = getStoredToken();
      if (token) storeSession(token, data.user);
      onUserUpdate(data.user);
      setProfile((value) => ({ ...value, password: "" }));
      setProfileMessage("Profile saved");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Could not save profile",
      );
    }
  };

  const toggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      apiRequest("/settings", {
        method: "PATCH",
        body: {
          smsNotifications: next.sms,
          pushNotifications: next.push,
          emailNotifications: next.email,
          reminderNotifications: next.reminders,
        },
      })
        .then(() => setSettingsSaved("Settings saved"))
        .catch(() => setSettingsSaved("Could not save settings"));
      return next;
    });
  };

  const saveLanguage = (code: string) => {
    setLanguage(code);
    apiRequest("/settings", { method: "PATCH", body: { language: code } })
      .then(() => setSettingsSaved("Settings saved"))
      .catch(() => setSettingsSaved("Could not save settings"));
  };

  const languages = [
    { code: "sq", label: "Albanian (Shqip)", flag: "🇽🇰" },
    { code: "sr", label: "Serbian (Srpski)", flag: "🇷🇸" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Family profile */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
          Family Information
        </h3>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-xl font-black text-teal-600">
            {(profile.name || "VitaPath")
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900">
              {profile.name || "Profile"}
            </p>
            <p className="text-sm text-slate-500">
              {profile.role === "parent"
                ? "Parent / Guardian"
                : profile.role === "doctor"
                  ? "Doctor / Provider"
                  : "Admin"}
              {profile.municipality ? ` - ${profile.municipality}` : ""}
            </p>
            <Badge variant="success">
              <Check className="w-2.5 h-2.5" /> Verified
            </Badge>
          </div>
          <button
            onClick={saveProfile}
            className="ml-auto px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Save Profile
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Full Name", value: profile.name },
            { label: "Phone", value: profile.phone },
            { label: "Municipality", value: profile.municipality },
            { label: "Address", value: profile.address },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs text-slate-400 font-semibold">
                {f.label}
              </label>
              <p className="text-sm font-medium text-slate-800 mt-0.5">
                {f.value}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
          {[
            { key: "name", label: "Full Name", type: "text" },
            { key: "email", label: "Email", type: "email" },
            { key: "phone", label: "Phone", type: "text" },
            { key: "municipality", label: "Municipality", type: "text" },
            { key: "address", label: "Address", type: "text" },
            { key: "password", label: "New Password", type: "password" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-xs text-slate-400 font-semibold">
                {field.label}
              </label>
              <input
                type={field.type}
                value={profile[field.key as keyof typeof profile]}
                onChange={(event) =>
                  setProfile((value) => ({
                    ...value,
                    [field.key]: event.target.value,
                  }))
                }
                placeholder={
                  field.key === "password"
                    ? "Leave blank to keep current password"
                    : field.label
                }
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-400"
              />
            </div>
          ))}
        </div>
        {profileMessage && (
          <p
            className={`text-xs font-semibold mt-3 ${profileMessage.includes("Could") || profileMessage.includes("exists") ? "text-red-600" : "text-emerald-600"}`}
          >
            {profileMessage}
          </p>
        )}
      </Card>

      {/* Child profiles */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Child Profiles</h3>
          <button className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add child
          </button>
        </div>
        <div className="space-y-3">
          {settingsChildren.length === 0 && (
            <p className="text-sm text-slate-500">No child profiles yet.</p>
          )}
          {settingsChildren.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
            >
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-xs font-black text-teal-600 flex-shrink-0">
                {c.full_name
                  .split(" ")
                  .map((part: string) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {c.full_name}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(c.date_of_birth).toLocaleDateString()} · {c.gender}
                </p>
              </div>
              <Badge variant="success">active</Badge>
              <button className="text-xs text-teal-600 font-semibold hover:underline">
                Manage
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Language */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
          Language / Gjuha / Jezik
        </h3>
        <div className="space-y-2">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => saveLanguage(l.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${language === l.code ? "border-teal-300 bg-teal-50" : "border-slate-100 hover:border-slate-200"}`}
            >
              <span className="text-lg">{l.flag}</span>
              <span
                className={`text-sm font-semibold ${language === l.code ? "text-teal-700" : "text-slate-700"}`}
              >
                {l.label}
              </span>
              {language === l.code && (
                <Check className="w-4 h-4 text-teal-600 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
          Notification Preferences
        </h3>
        {settingsSaved && (
          <p className="text-xs text-emerald-600 font-semibold mb-3">
            {settingsSaved}
          </p>
        )}
        <div className="space-y-3">
          {[
            {
              key: "sms" as const,
              label: "SMS Reminders",
              desc: "Vaccination and appointment reminders via SMS",
            },
            {
              key: "push" as const,
              label: "Push Notifications",
              desc: "App notifications for nurse messages and alerts",
            },
            {
              key: "email" as const,
              label: "Email Updates",
              desc: "Monthly health summary reports",
            },
            {
              key: "reminders" as const,
              label: "AI Health Insights",
              desc: "Preventive care recommendations from VitaPath AI",
            },
          ].map((n) => (
            <div key={n.key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {n.label}
                </p>
                <p className="text-xs text-slate-500">{n.desc}</p>
              </div>
              <button
                onClick={() => toggle(n.key)}
                className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${notifications[n.key] ? "bg-teal-600" : "bg-slate-200"}`}
                style={{ width: 40, height: 22 }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${notifications[n.key] ? "translate-x-[18px]" : "translate-x-0"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Privacy */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
          Privacy & Healthcare Consent
        </h3>
        <div className="space-y-3">
          {[
            {
              label: "Share data with Kosovo Ministry of Health",
              granted: true,
            },
            {
              label: "Allow anonymised data for national health research",
              granted: true,
            },
            { label: "Share child records with assigned nurse", granted: true },
            {
              label: "Allow VitaPath AI to analyse health patterns",
              granted: true,
            },
          ].map((c, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <p className="text-sm text-slate-700">{c.label}</p>
              <Badge variant={c.granted ? "success" : "muted"}>
                {c.granted ? "Granted" : "Denied"}
              </Badge>
            </div>
          ))}
        </div>
        <button className="mt-4 text-xs text-red-600 font-semibold hover:underline">
          Revoke all consent & delete data
        </button>
      </Card>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

// ─── Passport QR Viewer (scanned by nurse / anyone) ──────────────────────────

function PassportViewer({ token }: { token: string }) {
  const [data, setData] = useState<{
    passport: PassportData;
    scannedAt: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || "/api";

  useEffect(() => {
    fetch(`${API_URL}/passport/verify?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error.message);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const p = data?.passport;
  const child = p?.child;
  const dob = child?.date_of_birth ? new Date(child.date_of_birth) : null;
  const ageMonths = dob
    ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : 0;
  const ageLabel =
    ageMonths >= 24 ? `${Math.floor(ageMonths / 12)} yrs` : `${ageMonths} mo`;
  const vacCompleted =
    p?.vaccinations.filter((v) => v.status === "completed").length ?? 0;
  const vacTotal = p?.vaccinations.length ?? 0;
  const vacMissed =
    p?.vaccinations.filter((v) => v.status === "missed").length ?? 0;
  const riskColor: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-800 border-emerald-300",
    moderate: "bg-amber-100 text-amber-800 border-amber-300",
    high: "bg-orange-100 text-orange-800 border-orange-300",
    critical: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Verified header bar */}
      <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold">
        <ShieldCheck className="w-4 h-4" />
        Verified Health Passport · Kosovo Child Health Platform
        {data && (
          <span className="ml-4 text-emerald-200 text-xs font-normal">
            Scanned {new Date(data.scannedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {loading && (
          <div className="text-center py-20 text-slate-400">
            <ScanLine className="w-10 h-10 mx-auto mb-3 animate-pulse" />
            <p className="text-sm">Verifying passport…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="font-bold text-red-800 text-lg">
              Invalid or Expired QR Code
            </p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <p className="text-slate-500 text-xs mt-3">
              Ask the parent to generate a new QR code from their Health
              Passport.
            </p>
          </div>
        )}

        {p && child && (
          <>
            {/* Identity card */}
            <div
              className="rounded-2xl overflow-hidden shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, #0C3520 0%, #155C3A 50%, #25965E 100%)",
              }}
            >
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-teal-300 text-[10px] font-bold uppercase tracking-widest">
                    Republic of Kosovo · Child Health Passport
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-2xl font-bold">
                      {child.full_name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-white text-xl font-bold">
                      {child.full_name}
                    </h1>
                    <p className="text-teal-200 text-sm">
                      {ageLabel} · {child.gender} ·{" "}
                      {child.municipality || "Kosovo"}
                    </p>
                    <p className="text-teal-300 text-xs font-mono mt-1">
                      ID: {child.id.split("-")[0].toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Vaccines",
                      value: `${vacCompleted}/${vacTotal}`,
                      alert: vacMissed > 0,
                    },
                    {
                      label: "Risk",
                      value: p.risk?.level ?? "N/A",
                      alert: ["high", "critical"].includes(p.risk?.level ?? ""),
                    },
                    {
                      label: "Visits",
                      value: String(p.recentVisits.length),
                      alert: false,
                    },
                  ].map(({ label, value, alert }) => (
                    <div
                      key={label}
                      className="bg-white/10 rounded-xl p-3 border border-white/20 text-center"
                    >
                      <p className="text-teal-200 text-[10px] uppercase tracking-wide">
                        {label}
                      </p>
                      <p
                        className={`text-lg font-bold capitalize ${alert ? "text-red-300" : "text-white"}`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk alert banner */}
            {p.risk && ["high", "critical"].includes(p.risk.level) && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">
                    Preventive Risk Alert — {p.risk.level.toUpperCase()}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {p.risk.reasons?.map((r, i) => (
                      <li key={i} className="text-xs text-red-700">
                        · {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Vaccinations */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Syringe className="w-4 h-4 text-teal-600" /> Vaccination
                Status
              </h3>
              {p.vaccinations.length === 0 ? (
                <p className="text-sm text-slate-400">No records</p>
              ) : (
                <div className="space-y-2">
                  {p.vaccinations.map((v, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${v.status === "completed" ? "bg-emerald-400" : v.status === "missed" ? "bg-red-400" : "bg-blue-400"}`}
                      />
                      <span className="text-sm text-slate-700 flex-1">
                        {v.vaccine_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                          v.status === "completed"
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : v.status === "missed"
                              ? "text-red-700 bg-red-50 border-red-200"
                              : "text-blue-700 bg-blue-50 border-blue-200"
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent visit */}
            {p.recentVisits[0] && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-teal-600" /> Last Home
                  Visit
                </h3>
                <p className="text-sm text-slate-700">
                  {new Date(p.recentVisits[0].visited_at).toLocaleDateString()}{" "}
                  · Nurse: {p.recentVisits[0].nurse_name}
                </p>
                {p.recentVisits[0].notes && (
                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2">
                    {p.recentVisits[0].notes}
                  </p>
                )}
              </div>
            )}

            {/* Guardian */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-teal-600" /> Guardian Contact
              </h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="font-medium text-slate-800">
                    {child.parent_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-medium text-slate-800">
                    {child.parent_phone || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Municipality</span>
                  <span className="font-medium text-slate-800">
                    {child.municipality || "—"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 pb-4">
              This passport was verified at{" "}
              {new Date(data!.scannedAt).toLocaleString()} · VitaPath
              Kosovo
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // Check if this is a QR scan verification URL
  const verifyToken = new URLSearchParams(window.location.search).get("verify");
  if (verifyToken) return <PassportViewer token={verifyToken} />;

  const [activePage, setActivePage] = useState<Page>("landing");
  const [user, setUser] = useState<SafeUser | null>(() =>
    getStoredToken() ? getStoredUser() : null,
  );

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setActivePage("login");
  };

  useEffect(() => {
    if (!allowedPagesFor(user).includes(activePage)) {
      setActivePage(defaultPageFor(user));
    }
  }, [activePage, user]);

  return (
    <div
      className="flex h-screen bg-background overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {user && (
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          open
          user={user}
          onLogout={handleLogout}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          activePage={activePage}
          setActivePage={setActivePage}
          user={user}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          {activePage === "landing" && (
            <LandingPage setActivePage={setActivePage} user={user} />
          )}
          {activePage === "login" && (
            <AuthPage setActivePage={setActivePage} onLogin={setUser} />
          )}
          {activePage === "parent" && (
            <ParentDashboard user={user} onLogout={handleLogout} />
          )}
          {activePage === "passport" && <HealthPassport user={user} />}
          {activePage === "nurse" && <NurseDashboard user={user} />}
          {activePage === "visit" && <HomeVisitForm />}
          {activePage === "timeline" && <LiveChildTimeline />}
          {activePage === "ai-risk" && <AIRiskDashboard />}
          {activePage === "municipality" && (
            <MunicipalityDashboard user={user} />
          )}
          {activePage === "ai-report" && <AIWeeklyReport user={user} />}
          {activePage === "admin" && <AdminDashboard />}
          {activePage === "messaging" && <MessagingModule user={user} />}
          {activePage === "settings" && (
            <SettingsPage user={user} onUserUpdate={setUser} />
          )}
        </main>
      </div>
    </div>
  );
}
