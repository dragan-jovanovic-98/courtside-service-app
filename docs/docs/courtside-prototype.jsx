import { useState, useEffect, useRef } from "react";
import {
  Home, Megaphone, Users, Phone, CalendarDays, Settings,
  ChevronRight, ChevronLeft, Plus, Search, Bell, Clock,
  Check, Play, Pause, Upload, Mail, MessageSquare, User,
  TrendingUp, BarChart3, X, Filter, ArrowUpRight, Zap,
  CircleDot, PhoneOutgoing, CalendarCheck, Timer, Target,
  ChevronDown, PhoneCall, Calendar, Ban, XCircle, Bookmark,
  PhoneIncoming, ArrowDownLeft
} from "lucide-react";

/* ═══ DESIGN TOKENS ═══ */
const T = {
  bg: "#0e1117", bgSide: "#0a0d12", bgCard: "rgba(255,255,255,0.025)", bgCardH: "rgba(255,255,255,0.045)", bgIn: "rgba(255,255,255,0.04)",
  brd: "rgba(255,255,255,0.06)", brdL: "rgba(255,255,255,0.04)", tx: "#e8eaed", txM: "rgba(255,255,255,0.5)", txD: "rgba(255,255,255,0.3)", txF: "rgba(255,255,255,0.15)",
  em: "#34d399", emD: "#059669", emB: "rgba(52,211,153,0.08)", emB2: "rgba(52,211,153,0.15)",
  am: "#fbbf24", amB: "rgba(251,191,36,0.12)", bl: "#60a5fa", blB: "rgba(96,165,250,0.12)",
  rd: "#f87171", rdB: "rgba(248,113,113,0.12)", pu: "#a78bfa", puB: "rgba(167,139,250,0.12)",
};

/* ═══ UTILITIES ═══ */
function Num({ value, prefix = "", suffix = "" }) {
  const [d, setD] = useState(0);
  const r = useRef(null);
  useEffect(() => {
    let id;
    const step = (ts) => { if (!r.current) r.current = ts; const p = Math.min((ts - r.current) / 900, 1); setD(Math.round((1 - Math.pow(1 - p, 3)) * value)); if (p < 1) id = requestAnimationFrame(step); };
    r.current = null; id = requestAnimationFrame(step); return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{prefix}{d.toLocaleString()}{suffix}</>;
}

function Badge({ children, color = "default" }) {
  const c = { default: { b: "rgba(255,255,255,0.08)", c: "rgba(255,255,255,0.6)" }, emerald: { b: T.emB2, c: T.em }, amber: { b: T.amB, c: T.am }, blue: { b: T.blB, c: T.bl }, red: { b: T.rdB, c: T.rd }, purple: { b: T.puB, c: T.pu } }[color] || { b: "rgba(255,255,255,0.08)", c: "rgba(255,255,255,0.6)" };
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.b, color: c.c }}>{children}</span>;
}

function Btn({ children, v = "p", onClick, s, disabled }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s", fontFamily: "inherit", opacity: disabled ? 0.4 : 1 };
  const vs = { p: { ...base, background: T.emD, color: "#fff" }, g: { ...base, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" } };
  return <button style={{ ...(vs[v] || vs.p), ...s }} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Card({ children, style: s2, onClick, hover }) {
  const [h, setH] = useState(false);
  return <div onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)} onClick={onClick}
    style={{ background: h ? T.bgCardH : T.bgCard, border: `1px solid ${T.brd}`, borderRadius: 12, transition: "all 0.15s", cursor: onClick ? "pointer" : "default", ...s2 }}>{children}</div>;
}

function PBar({ value, max, color = T.em }) {
  return <div style={{ width: "100%", height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.8s" }} /></div>;
}

function SL({ children, color = T.txD }) { return <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color, fontWeight: 700, marginBottom: 12 }}>{children}</div>; }

function ORow({ label, value, max, color }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 90, textAlign: "right", fontSize: 12, color: T.txM, flexShrink: 0 }}>{label}</span><div style={{ flex: 1 }}><PBar value={value} max={max} color={color} /></div><span style={{ width: 30, textAlign: "right", fontSize: 12, color: T.txM, fontVariantNumeric: "tabular-nums" }}>{value}</span></div>;
}

function MC({ label, value, sub, icon, accent }) {
  return <Card style={{ padding: 16, borderTop: `2px solid ${accent}40` }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><span style={{ color: accent, opacity: 0.7 }}>{icon}</span><span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.txD, fontWeight: 600 }}>{label}</span></div><div style={{ fontSize: 26, fontWeight: 700, color: T.tx, fontVariantNumeric: "tabular-nums" }}><Num value={value} /></div>{sub && <div style={{ fontSize: 12, color: T.txD, marginTop: 4 }}>{sub}</div>}</Card>;
}

/* ═══ OUTCOME + STATUS HELPERS ═══ */
const OUTCOMES = ["Booked", "Interested", "Callback", "Voicemail", "No Answer", "Not Interested", "Wrong Number", "DNC"];
const STATUSES = ["New", "Contacted", "Interested", "Appt Set", "Showed", "Closed Won", "Closed Lost", "Bad Lead"];

const obadge = (o) => { const m = { Booked: "emerald", Interested: "blue", Callback: "amber", "Email Open": "amber", Voicemail: "default", "No Answer": "default", "Not Interested": "red", "Wrong Number": "red", DNC: "red" }; return <Badge color={m[o] || "default"}>{o}</Badge>; };
const sbadge = (s) => { const m = { active: "emerald", paused: "amber", completed: "blue", draft: "default" }; return <Badge color={m[s] || "default"}>{s[0].toUpperCase() + s.slice(1)}</Badge>; };

/* ═══ DROPDOWN SELECT ═══ */
function DropSelect({ label, value, options, onChange, allLabel = "All" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: value !== "all" ? T.emB : "rgba(255,255,255,0.04)", border: `1px solid ${value !== "all" ? "rgba(52,211,153,0.2)" : T.brd}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: value !== "all" ? T.em : T.txM, whiteSpace: "nowrap" }}>
        <Filter size={11} />{label}: {value === "all" ? allLabel : value}<ChevronDown size={10} style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 160, background: "#181b22", border: `1px solid ${T.brd}`, borderRadius: 10, padding: 4, zIndex: 50, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
          <div
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            onClick={() => { onChange("all"); setOpen(false); }}
            style={{ padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, color: value === "all" ? T.em : T.tx, fontWeight: value === "all" ? 700 : 400, transition: "background 0.1s" }}>
            {allLabel}
          </div>
          {options.map(o => (
            <div key={o}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={() => { onChange(o); setOpen(false); }}
              style={{ padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, color: value === o ? T.em : T.tx, fontWeight: value === o ? 700 : 400, transition: "background 0.1s" }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ ACTION DROPDOWN ═══ */
function ActionDrop({ label, icon, options, onSelect, variant = "g" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Btn v={variant} s={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setOpen(!open)}>
        {icon}{label}<ChevronDown size={10} style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </Btn>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 190, background: "#181b22", border: `1px solid ${T.brd}`, borderRadius: 10, padding: 4, zIndex: 50, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
          {options.map((o, i) => (
            <div key={i}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={() => { onSelect(o); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 7, cursor: "pointer", transition: "background 0.1s" }}>
              <span style={{ color: o.color || T.txM, display: "flex" }}>{o.icon}</span>
              <span style={{ fontSize: 12, color: T.tx, fontWeight: 500 }}>{o.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ DATE/TIME MODAL ═══ */
function DateTimeModal({ title, onConfirm, onClose }) {
  const [date, setDate] = useState("2026-02-18");
  const [time, setTime] = useState("10:00");
  const slots = ["9:00 AM", "10:00 AM", "10:30 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
  const [picked, setPicked] = useState(null);
  const inputS = { padding: "9px 12px", background: T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 8, fontSize: 13, color: T.tx, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 380, background: "#14171e", border: `1px solid ${T.brd}`, borderRadius: 16, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.tx, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.txD, display: "flex" }}><X size={16} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: T.txD, marginBottom: 4 }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputS, width: "100%", colorScheme: "dark" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: T.txD, marginBottom: 6 }}>Quick pick a time</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {slots.map(s => (
              <button key={s} onClick={() => setPicked(s)} style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: `1px solid ${picked === s ? "rgba(52,211,153,0.3)" : T.brd}`, cursor: "pointer", fontFamily: "inherit", background: picked === s ? T.emB2 : "rgba(255,255,255,0.03)", color: picked === s ? T.em : T.txM }}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: T.txD, marginBottom: 4 }}>Or enter custom time</label>
          <input type="time" value={time} onChange={e => { setTime(e.target.value); setPicked(null); }} style={{ ...inputS, width: "100%", colorScheme: "dark" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn v="g" onClick={onClose} s={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>Cancel</Btn>
          <Btn onClick={() => onConfirm(date, picked || time)} s={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══ DATA ═══ */
const D = {
  ap: [{ id: 1, t: "9:00 AM", n: "Sarah Mitchell", co: "First National Lending", ctx: "Spring Mortgage — strong interest in refinancing" }, { id: 2, t: "10:30 AM", n: "David Park", co: "Park Financial Group", ctx: "Insurance Outreach — whole life policy options" }, { id: 3, t: "1:00 PM", n: "Jennifer Torres", co: "Torres & Associates", ctx: "Follow-up — commercial lending terms" }, { id: 4, t: "3:30 PM", n: "Michael Brown", co: "Independent Broker", ctx: "Referral — investment property financing" }],
  act: [{ id: 1, n: "Robert Chen", r: "Replied to SMS: \"Yes, I'm interested. Call me tomorrow?\"", s: "Spring Mortgage", t: "12m ago", tp: "sms" }, { id: 2, n: "Lisa Nguyen", r: "Requested callback at 2:00 PM today", s: "Insurance Outreach", t: "45m ago", tp: "cb" }, { id: 3, n: "Marcus Johnson", r: "Strong interest — no slot available, needs manual booking", s: "Spring Mortgage", t: "1h ago", tp: "int" }, { id: 4, n: "Amanda Foster", r: "Opened email 3x, clicked booking link, didn't complete", s: "Q1 Refi Push", t: "2h ago", tp: "em" }, { id: 5, n: "Kevin Wright", r: "Left voicemail — call back this week", s: "Commercial Lending", t: "3h ago", tp: "cb" }],
  camp: [{ id: 1, nm: "Spring Mortgage Campaign", st: "active", ag: "Sarah — Mortgage", ld: 340, cl: 187, cn: 89, bk: 12, mn: 47, lf: 153, es: "2 days", rt: "47%" }, { id: 2, nm: "Insurance Outreach Q1", st: "active", ag: "James — Insurance", ld: 220, cl: 95, cn: 52, bk: 7, mn: 23, lf: 125, es: "3 days", rt: "55%" }, { id: 3, nm: "Commercial Lending Push", st: "paused", ag: "Sarah — Mortgage", ld: 150, cl: 43, cn: 21, bk: 3, mn: 11, lf: 107, es: "—", rt: "49%" }, { id: 4, nm: "Q1 Refinance Follow-Up", st: "completed", ag: "Sarah — Mortgage", ld: 180, cl: 180, cn: 94, bk: 18, mn: 89, lf: 0, es: "Done", rt: "52%" }, { id: 5, nm: "Home Equity Lines", st: "draft", ag: "Unassigned", ld: 0, cl: 0, cn: 0, bk: 0, mn: 0, lf: 0, es: "—", rt: "—" }],
  leads: [{ id: 1, n: "Sarah Mitchell", ph: "(555) 234-8901", em: "sarah@firstnat.com", co: "First National", st: "Appt Set", oc: "Booked", la: "Today", ca: "Spring Mortgage" }, { id: 2, n: "Robert Chen", ph: "(555) 345-6789", em: "rchen@gmail.com", co: "Chen Investments", st: "Interested", oc: "Interested", la: "Today", ca: "Spring Mortgage" }, { id: 3, n: "Lisa Nguyen", ph: "(555) 456-7890", em: "lisa@outlook.com", co: "Nguyen Financial", st: "Contacted", oc: "Callback", la: "Today", ca: "Insurance" }, { id: 4, n: "Marcus Johnson", ph: "(555) 567-8901", em: "mj@corp.com", co: "Johnson Props", st: "Interested", oc: "Interested", la: "Yesterday", ca: "Spring Mortgage" }, { id: 5, n: "Amanda Foster", ph: "(555) 678-9012", em: "af@email.com", co: "Foster Holdings", st: "Contacted", oc: "Voicemail", la: "Yesterday", ca: "Q1 Refi" }, { id: 6, n: "Kevin Wright", ph: "(555) 789-0123", em: "kw@biz.com", co: "Wright & Sons", st: "Contacted", oc: "Voicemail", la: "Yesterday", ca: "Commercial" }, { id: 7, n: "David Park", ph: "(555) 890-1234", em: "dp@parkfin.com", co: "Park Financial", st: "Appt Set", oc: "Booked", la: "2 days ago", ca: "Insurance" }, { id: 8, n: "Jennifer Torres", ph: "(555) 901-2345", em: "jt@torres.com", co: "Torres & Assoc", st: "Appt Set", oc: "Booked", la: "2 days ago", ca: "Commercial" }, { id: 9, n: "Tom Rivera", ph: "(555) 111-2222", em: "tr@bad.com", co: "Rivera LLC", st: "Bad Lead", oc: "Wrong Number", la: "3 days ago", ca: "Spring Mortgage" }, { id: 10, n: "Nancy Bell", ph: "(555) 333-4444", em: "nb@dnc.com", co: "Bell Corp", st: "Bad Lead", oc: "DNC", la: "3 days ago", ca: "Insurance" }],
  calls: [{ id: 1, dt: "Today 8:12 AM", n: "Sarah Mitchell", ph: "(555) 234-8901", ag: "Sarah", dur: "4:32", oc: "Booked", ca: "Spring Mortgage", dir: "out" }, { id: 2, dt: "Today 8:06 AM", n: "Robert Chen", ph: "(555) 345-6789", ag: "Sarah", dur: "2:15", oc: "Interested", ca: "Spring Mortgage", dir: "out" }, { id: 3, dt: "Today 7:58 AM", n: "Daniel Kim", ph: "(555) 222-3333", ag: "Sarah", dur: "1:03", oc: "No Answer", ca: "Spring Mortgage", dir: "out" }, { id: 4, dt: "Today 7:45 AM", n: "Lisa Nguyen", ph: "(555) 456-7890", ag: "James", dur: "3:47", oc: "Callback", ca: "Insurance", dir: "out" }, { id: 5, dt: "Today 7:30 AM", n: "Karen White", ph: "(555) 888-9999", ag: "James", dur: "0:45", oc: "Not Interested", ca: "Insurance", dir: "out" }, { id: 6, dt: "Yest 6:42 PM", n: "Marcus Johnson", ph: "(555) 567-8901", ag: "Sarah", dur: "5:12", oc: "Interested", ca: "Spring Mortgage", dir: "out" }, { id: 7, dt: "Yest 6:31 PM", n: "Amanda Foster", ph: "(555) 678-9012", ag: "Sarah", dur: "2:58", oc: "Voicemail", ca: "Q1 Refi", dir: "out" }, { id: 8, dt: "Yest 6:18 PM", n: "Kevin Wright", ph: "(555) 789-0123", ag: "Sarah", dur: "1:22", oc: "Voicemail", ca: "Commercial", dir: "out" }, { id: 9, dt: "Yest 6:05 PM", n: "Tom Rivera", ph: "(555) 111-2222", ag: "Sarah", dur: "0:18", oc: "Wrong Number", ca: "Spring Mortgage", dir: "out" }, { id: 10, dt: "Yest 5:50 PM", n: "Nancy Bell", ph: "(555) 333-4444", ag: "James", dur: "0:32", oc: "DNC", ca: "Insurance", dir: "out" }, { id: 11, dt: "Today 9:15 AM", n: "Patricia Gomez", ph: "(555) 444-5555", ag: "Sarah", dur: "3:21", oc: "Booked", ca: "Spring Mortgage", dir: "in" }, { id: 12, dt: "Today 10:02 AM", n: "Unknown", ph: "(555) 999-0000", ag: "James", dur: "0:42", oc: "No Answer", ca: "—", dir: "in" }],
};

/* ═══ HOVERABLE ROW ═══ */
function HRow({ children, style: s2, onClick }) {
  const [h, setH] = useState(false);
  return <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} style={{ background: h ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.1s", cursor: onClick ? "pointer" : "default", ...s2 }}>{children}</div>;
}

/* ═══════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════ */
function HomePage({ nav }) {
  const [range, setRange] = useState("7d");
  const [resolved, setResolved] = useState({});
  const [modal, setModal] = useState(null); // { actionId, type: "appt"|"followup" }

  const resolveOpts = [
    { label: "Appointment Scheduled", icon: <CalendarCheck size={13} />, color: T.em, needsDate: true, dateType: "appt" },
    { label: "Follow-up Scheduled", icon: <Bookmark size={13} />, color: T.bl, needsDate: true, dateType: "followup" },
    { label: "Not Interested", icon: <XCircle size={13} />, color: T.rd },
    { label: "Wrong Number", icon: <Ban size={13} />, color: T.rd },
    { label: "Dismiss", icon: <X size={13} />, color: T.txD },
  ];
  const followUpOpts = [
    { label: "Call Now", icon: <PhoneCall size={13} />, color: T.em },
    { label: "Send Text", icon: <MessageSquare size={13} />, color: T.bl },
    { label: "Schedule Callback", icon: <Calendar size={13} />, color: T.am, needsDate: true, dateType: "followup" },
    { label: "Send Email", icon: <Mail size={13} />, color: T.pu },
  ];

  const handleResolve = (actionId, option) => {
    if (option.needsDate) {
      setModal({ actionId, option });
    } else {
      setResolved(p => ({ ...p, [actionId]: option }));
    }
  };

  const handleFollowUp = (actionId, option) => {
    if (option.needsDate) {
      setModal({ actionId, option, isFollowUp: true });
    }
    // Call Now, Send Text, Send Email would navigate in real app
  };

  const handleModalConfirm = (date, time) => {
    if (modal) {
      setResolved(p => ({ ...p, [modal.actionId]: { ...modal.option, label: modal.option.label + ` · ${time}` } }));
    }
    setModal(null);
  };

  return (
    <div>
      {modal && <DateTimeModal
        title={modal.option.dateType === "appt" ? "Schedule Appointment" : "Schedule Follow-up"}
        onConfirm={handleModalConfirm}
        onClose={() => setModal(null)}
      />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 24, fontWeight: 700, color: T.tx, margin: 0 }}>Good morning, Alex</h1><p style={{ fontSize: 13, color: T.txD, margin: "4px 0 0" }}>Tuesday, February 17, 2026</p></div>
        <Btn onClick={() => nav("nc")}><Plus size={15} /> New Campaign</Btn>
      </div>
      <SL color={T.em}>Action Zone</SL>

      {/* Appointments — compact */}
      <Card style={{ marginBottom: 10, overflow: "hidden" }}>
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CalendarCheck size={13} style={{ color: T.em }} /><span style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>Today's Appointments</span></div>
          <span style={{ fontSize: 10, color: T.em, fontWeight: 600 }}>4 scheduled</span>
        </div>
        {D.ap.map((a, i) => (
          <HRow key={a.id} onClick={() => nav("leads")} style={{ padding: "9px 16px", display: "flex", gap: 10, alignItems: "center", borderBottom: i < 3 ? `1px solid ${T.brdL}` : "none" }}>
            <span style={{ fontSize: 12, color: T.em, fontWeight: 600, width: 60, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{a.t}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.tx, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.n}</span>
            <span style={{ fontSize: 11, color: T.txD, flexShrink: 0 }}>{a.co}</span>
            <ChevronRight size={12} style={{ color: T.txF, flexShrink: 0 }} />
          </HRow>
        ))}
      </Card>

      {/* Actions — compact */}
      <Card style={{ marginBottom: 24, overflow: "hidden" }}>
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Zap size={13} style={{ color: T.am }} /><span style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>Action Items</span></div>
          <span style={{ fontSize: 10, color: T.am, fontWeight: 600 }}>{D.act.filter(a => !resolved[a.id]).length} need attention</span>
        </div>
        {D.act.map((a, i, arr) => {
          const r = resolved[a.id];
          if (r) return (
            <div key={a.id} style={{ padding: "8px 16px", display: "flex", gap: 10, alignItems: "center", borderBottom: i < arr.length - 1 ? `1px solid ${T.brdL}` : "none", opacity: 0.45 }}>
              <Check size={12} style={{ color: r.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: T.txD }}>{a.n}</span>
              <span style={{ fontSize: 10, color: r.color, fontWeight: 600 }}>{r.label}</span>
              <button onClick={() => setResolved(p => { const c = {...p}; delete c[a.id]; return c; })} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: T.txF, fontSize: 10, fontFamily: "inherit", padding: "2px 6px" }}>Undo</button>
            </div>
          );
          return (
            <div key={a.id} style={{ padding: "10px 16px", display: "flex", gap: 10, alignItems: "center", borderBottom: i < arr.length - 1 ? `1px solid ${T.brdL}` : "none" }}>
              <span style={{ fontSize: 10, color: T.txD, width: 42, flexShrink: 0 }}>{a.t}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}><span style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>{a.n}</span><Badge color={a.tp === "sms" ? "emerald" : a.tp === "cb" ? "amber" : "blue"}>{a.tp === "sms" ? "SMS" : a.tp === "cb" ? "Callback" : a.tp === "em" ? "Email" : "Interest"}</Badge></div>
                <p style={{ fontSize: 11, color: T.txD, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.r}</p>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <ActionDrop label="Follow Up" variant="p" icon={<Phone size={10} />} options={followUpOpts} onSelect={(o) => handleFollowUp(a.id, o)} />
                <ActionDrop label="Resolve" variant="g" icon={<Check size={10} />} options={resolveOpts} onSelect={(o) => handleResolve(a.id, o)} />
              </div>
            </div>
          );
        })}
      </Card>

      {/* RESULTS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <SL>Results</SL>
        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 2 }}>
          {["Today", "7d", "30d", "All"].map(r => <button key={r} onClick={() => setRange(r)} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: range === r ? "rgba(255,255,255,0.1)" : "transparent", color: range === r ? T.tx : T.txD }}>{r}</button>)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <MC label="Appointments" value={42} sub="+8 this week" icon={<CalendarCheck size={14} />} accent={T.em} />
        <MC label="Est. Revenue" value={127500} sub="$127.5K attributed" icon={<TrendingUp size={14} />} accent={T.bl} />
        <MC label="Hours Saved" value={156} sub="of outreach calling" icon={<Timer size={14} />} accent={T.am} />
        <MC label="Active Pipeline" value={890} sub="total leads" icon={<Target size={14} />} accent={T.pu} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ background: `linear-gradient(135deg, ${T.emB} 0%, transparent 60%)`, border: `1px solid rgba(52,211,153,0.15)`, borderRadius: 12, padding: 18 }}>
          <SL color="rgba(52,211,153,0.5)">Engaged Leads</SL>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: T.tx, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}><Num value={347} /></div>
            <span style={{ fontSize: 12, color: T.em, opacity: 0.8 }}>47.2% engaged</span>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
            {[["New", 189, T.txM], ["Active", 112, T.em], ["Closed", 46, T.bl]].map(([l, v, c]) => <div key={l}><span style={{ fontSize: 10, color: T.txD }}>{l}</span><div style={{ fontSize: 18, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div></div>)}
          </div>
        </div>
        <Card style={{ padding: 18 }}>
          <SL>Call Outcomes</SL>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <ORow label="Booked" value={42} max={120} color={T.em} />
            <ORow label="Interested" value={67} max={120} color={T.bl} />
            <ORow label="Callback" value={28} max={120} color={T.am} />
            <ORow label="Voicemail" value={89} max={120} color="rgba(255,255,255,0.15)" />
            <ORow label="No Answer" value={54} max={120} color="rgba(255,255,255,0.08)" />
            <ORow label="Not Int." value={38} max={120} color="rgba(248,113,113,0.5)" />
            <ORow label="Wrong #" value={12} max={120} color="rgba(248,113,113,0.35)" />
            <ORow label="DNC" value={7} max={120} color="rgba(248,113,113,0.2)" />
          </div>
        </Card>
      </div>

      {/* Conversion Funnel — visual */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <SL>Conversion Funnel</SL>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 0 }}>
          {[["Leads", 890, 100], ["Attempts", 632, 71], ["Connected", 325, 37], ["Interested", 142, 16], ["Booked", 42, 5], ["Showed", 35, 4], ["Closed", 18, 2]].map(([l, v, pct], i, a) => {
            const barH = Math.max(16, (pct / 100) * 90);
            const colors = [T.txD, "rgba(255,255,255,0.25)", T.bl, T.am, T.em, T.em, T.em];
            return (
              <div key={l} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: i >= 4 ? T.em : T.tx, fontVariantNumeric: "tabular-nums" }}><Num value={v} /></div>
                <div style={{ width: "80%", height: barH, background: `${colors[i]}${i >= 4 ? "" : "30"}`, borderRadius: "4px 4px 0 0", transition: "height 0.8s" }} />
                <div style={{ fontSize: 9, color: T.txD, textAlign: "center" }}>{l}</div>
                {i < a.length - 1 && <div style={{ display: "none" }} />}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, padding: "8px 12px", background: "rgba(52,211,153,0.04)", borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: T.txD }}>Overall conversion</span>
          <span style={{ fontSize: 11, color: T.em, fontWeight: 700 }}>890 leads → 18 closed (2.0%)</span>
        </div>
      </Card>

      <SL>Active Campaigns</SL>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        {D.camp.filter(c => c.st === "active" || c.st === "paused").map(c => (
          <Card key={c.id} hover onClick={() => nav("campaigns")} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 600, color: T.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>{c.nm}</span>{sbadge(c.st)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}><PBar value={c.cl} max={c.ld} /></div>
              <span style={{ fontSize: 10, color: T.txD, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{Math.round((c.cl/c.ld)*100)}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: T.emB, borderRadius: 6, padding: "4px 10px", textAlign: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: T.em, fontVariantNumeric: "tabular-nums" }}>{c.bk}</span>
                <span style={{ fontSize: 8, color: T.em, opacity: 0.6, marginLeft: 3, fontWeight: 600 }}>BOOKED</span>
              </div>
              <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
                {[[c.cn, "Conn."], [c.lf, "Left"]].map(([v, l]) => <div key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 12, fontWeight: 600, color: T.tx, fontVariantNumeric: "tabular-nums" }}>{v}</div><div style={{ fontSize: 8, color: T.txD }}>{l}</div></div>)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══ CAMPAIGNS ═══ */
function CampaignsPage({ nav }) {
  const [f, setF] = useState("all");
  const list = f === "all" ? D.camp : D.camp.filter(c => c.st === f);
  const totalBk = D.camp.reduce((s, c) => s + c.bk, 0);
  const totalLd = D.camp.reduce((s, c) => s + c.ld, 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h1 style={{ fontSize: 24, fontWeight: 700, color: T.tx, margin: 0 }}>Campaigns</h1><Btn onClick={() => nav("nc")}><Plus size={15} /> New Campaign</Btn></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[[D.camp.length, "Total", T.tx], [D.camp.filter(c => c.st === "active").length, "Active", T.em], [totalLd, "Total Leads", T.bl], [totalBk, "Bookings", T.am]].map(([v, l, c]) => (
          <Card key={l} style={{ padding: "10px 16px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div><div style={{ fontSize: 10, color: T.txD }}>{l}</div></Card>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {["all", "active", "paused", "draft", "completed"].map(x => <button key={x} onClick={() => setF(x)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit", background: f === x ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: f === x ? T.tx : T.txD }}>{x}</button>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map(c => (
          <Card key={c.id} hover style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600, color: T.tx }}>{c.nm}</span>{sbadge(c.st)}</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <Btn v="g" s={{ padding: "4px 8px", fontSize: 10 }} title="Add Leads"><Plus size={12} /> Leads</Btn>
                {c.st === "active" && <Btn v="g" s={{ padding: "4px 8px" }}><Pause size={12} /></Btn>}
                {c.st === "paused" && <Btn s={{ padding: "4px 8px" }}><Play size={12} /></Btn>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: T.txD, marginBottom: 10 }}>Agent: {c.ag}</div>
            {c.ld > 0 ? <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}><PBar value={c.cl} max={c.ld} /></div>
                <span style={{ fontSize: 10, color: T.txM, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{c.cl}/{c.ld} called · {Math.round((c.cl / c.ld) * 100)}%</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ background: T.emB, borderRadius: 8, padding: "8px 14px", textAlign: "center", border: `1px solid rgba(52,211,153,0.12)` }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: T.em, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{c.bk}</div>
                  <div style={{ fontSize: 9, color: T.em, opacity: 0.7, marginTop: 2, fontWeight: 600 }}>BOOKED</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, flex: 1 }}>
                  {[
                    [c.cn, "Connected", c.cl > 0 ? Math.round((c.cn/c.cl)*100) + "%" : null],
                    [c.mn + "m", "Duration", null],
                    [c.lf, "Remaining", c.es !== "—" ? "~" + c.es : null],
                  ].map(([v, l, sub]) => (
                    <div key={l}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.tx, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                      <div style={{ fontSize: 9, color: T.txD }}>{l}{sub && <span style={{ color: T.em, marginLeft: 4, opacity: 0.7 }}>{sub}</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
            </> : <div style={{ fontSize: 12, color: T.txF, fontStyle: "italic" }}>No leads assigned yet</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══ NEW CAMPAIGN WIZARD ═══ */
function NewCampaign({ nav }) {
  const [step, setStep] = useState(1);
  const [agent, setAgent] = useState(null);
  const [nm, setNm] = useState("");
  const agents = [{ id: 1, n: "Sarah — Mortgage Specialist", tag: "Mortgage", d: "Warm, professional. Refinancing & home purchase." }, { id: 2, n: "James — Insurance Advisor", tag: "Insurance", d: "Consultative. Whole life & term life." }, { id: 3, n: "Alex — General Financial", tag: "Multi", d: "Versatile. General financial services." }];
  const steps = ["Select Agent", "Add Leads", "Schedule", "Review"];

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={() => step > 1 ? setStep(step - 1) : nav("campaigns")} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: T.txM, display: "flex" }}><ChevronLeft size={16} /></button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.tx, margin: 0 }}>New Campaign</h1>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 28, alignItems: "center" }}>
        {steps.map((s, i) => <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: step > i + 1 ? T.emB : step === i + 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: step > i + 1 ? T.em : step === i + 1 ? T.tx : T.txD }}>{step > i + 1 ? <Check size={12} /> : <span>{i + 1}</span>}<span>{s}</span></div>{i < 3 && <div style={{ width: 16, height: 1, background: T.brd }} />}</div>)}
      </div>

      {step === 1 && <div>
        <p style={{ fontSize: 13, color: T.txM, marginBottom: 16 }}>Choose the AI agent for this campaign.</p>
        {agents.map(a => <Card key={a.id} hover onClick={() => setAgent(a.id)} style={{ padding: 16, marginBottom: 8, cursor: "pointer", borderColor: agent === a.id ? "rgba(52,211,153,0.4)" : T.brd, background: agent === a.id ? T.emB : T.bgCard }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 14, fontWeight: 600, color: T.tx }}>{a.n}</span><Badge color={agent === a.id ? "emerald" : "default"}>{a.tag}</Badge></div><p style={{ fontSize: 12, color: T.txD, margin: "4px 0 0" }}>{a.d}</p></Card>)}
        <Btn onClick={() => setStep(2)} disabled={!agent} s={{ width: "100%", justifyContent: "center", marginTop: 12, padding: "10px 0" }}>Continue</Btn>
      </div>}

      {step === 2 && <div>
        <p style={{ fontSize: 13, color: T.txM, marginBottom: 16 }}>Name your campaign and add leads.</p>
        <input value={nm} onChange={e => setNm(e.target.value)} placeholder="Campaign name..." style={{ width: "100%", padding: "10px 14px", background: T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 8, fontSize: 13, color: T.tx, outline: "none", fontFamily: "inherit", marginBottom: 12, boxSizing: "border-box" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[["Upload CSV", "Drag & drop or browse"], ["Existing Leads", "Select from contacts"]].map(([t, d]) => <div key={t} style={{ padding: 32, border: `2px dashed ${T.brd}`, borderRadius: 12, textAlign: "center", cursor: "pointer" }}><div style={{ fontSize: 13, color: T.txM, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 11, color: T.txD, marginTop: 4 }}>{d}</div></div>)}
        </div>
        <Card style={{ padding: 14 }}><div style={{ fontSize: 12, color: T.txD }}>Preview: 150 leads · 3 DNC excluded</div><div style={{ fontSize: 11, color: T.em, marginTop: 4, opacity: 0.7 }}>DNC check passed</div></Card>
        <Btn onClick={() => setStep(3)} s={{ width: "100%", justifyContent: "center", marginTop: 12, padding: "10px 0" }}>Continue</Btn>
      </div>}

      {step === 3 && <div>
        <p style={{ fontSize: 13, color: T.txM, marginBottom: 16 }}>Set calling schedule, rules, and optional end date.</p>

        {/* Per-day schedule */}
        <Card style={{ padding: 16, marginBottom: 10 }}>
          <SL>Calling Schedule</SL>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { d: "Monday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
              { d: "Tuesday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
              { d: "Wednesday", on: true, slots: [["9:00 AM", "11:00 AM"], ["6:00 PM", "8:00 PM"]] },
              { d: "Thursday", on: true, slots: [["6:00 PM", "8:00 PM"]] },
              { d: "Friday", on: true, slots: [["5:00 PM", "8:00 PM"]] },
              { d: "Saturday", on: true, slots: [["12:00 PM", "4:00 PM"]] },
              { d: "Sunday", on: false, slots: [] },
            ].map(day => (
              <div key={day.d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${T.brdL}` }}>
                <div style={{ width: 34, height: 18, borderRadius: 9, background: day.on ? T.emD : "rgba(255,255,255,0.08)", cursor: "pointer", position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute", top: 2, left: day.on ? 18 : 2, transition: "left 0.15s" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: day.on ? T.tx : T.txD, width: 80, flexShrink: 0 }}>{day.d}</span>
                {day.on ? (
                  <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {day.slots.map((s, si) => (
                      <div key={si} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 6, border: `1px solid ${T.brdL}` }}>
                        <span style={{ fontSize: 11, color: T.tx, fontVariantNumeric: "tabular-nums" }}>{s[0]}</span>
                        <span style={{ fontSize: 10, color: T.txD }}>→</span>
                        <span style={{ fontSize: 11, color: T.tx, fontVariantNumeric: "tabular-nums" }}>{s[1]}</span>
                        {day.slots.length > 1 && <button style={{ background: "none", border: "none", cursor: "pointer", color: T.txD, display: "flex", padding: 0, marginLeft: 2 }}><X size={10} /></button>}
                      </div>
                    ))}
                    <button style={{ display: "flex", alignItems: "center", gap: 2, padding: "3px 8px", background: "none", border: `1px dashed ${T.brd}`, borderRadius: 6, cursor: "pointer", fontSize: 10, color: T.txD, fontFamily: "inherit" }}><Plus size={9} /> Add slot</button>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: T.txF, fontStyle: "italic" }}>Off</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Rules + End Date */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          {[["Daily Limit", "150", "calls/day"], ["Retries", "2", "per lead"], ["Timezone", "EST", "Toronto"]].map(([l, v, s]) => (
            <Card key={l} style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: T.txD, marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.tx }}>{v}</div>
              <div style={{ fontSize: 9, color: T.txF }}>{s}</div>
            </Card>
          ))}
          <Card style={{ padding: 12 }}>
            <div style={{ fontSize: 11, color: T.txD, marginBottom: 3 }}>End Date</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.tx }}>Optional</div>
            <input type="date" style={{ marginTop: 4, width: "100%", padding: "4px 6px", background: T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 6, fontSize: 11, color: T.tx, outline: "none", fontFamily: "inherit", boxSizing: "border-box", colorScheme: "dark" }} />
          </Card>
        </div>

        <Btn onClick={() => setStep(4)} s={{ width: "100%", justifyContent: "center", padding: "10px 0" }}>Continue</Btn>
      </div>}

      {step === 4 && <div>
        <p style={{ fontSize: 13, color: T.txM, marginBottom: 16 }}>Review and launch.</p>
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[["Campaign", nm || "Spring Mortgage"], ["Agent", agents.find(a => a.id === agent)?.n || "Sarah"], ["Leads", "147"], ["DNC Removed", "3"], ["Schedule", "Mon–Sat, per-day slots"], ["Limit", "150/day"], ["Est. Duration", "~2 days"], ["Retries", "2 × 24hr"]].map(([l, v]) => <div key={l}><span style={{ fontSize: 11, color: T.txD, display: "block" }}>{l}</span><span style={{ fontSize: 13, fontWeight: 600, color: l === "DNC Removed" ? T.rd : T.tx }}>{v}</span></div>)}
          </div>
        </Card>
        <div style={{ display: "flex", gap: 10 }}><Btn v="g" onClick={() => nav("campaigns")} s={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>Save Draft</Btn><Btn onClick={() => nav("campaigns")} s={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>Save & Activate</Btn></div>
      </div>}
    </div>
  );
}

/* ═══ LEADS ═══ */
function LeadsPage({ nav }) {
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("all");
  const [of2, setOf] = useState("all");
  const [det, setDet] = useState(null);
  const fl = D.leads.filter(l => {
    const ms = !q || (l.n + l.ph + l.em + l.co).toLowerCase().includes(q.toLowerCase());
    const mf = sf === "all" || l.st === sf;
    const mo = of2 === "all" || l.oc === of2;
    return ms && mf && mo;
  });

  if (det) {
    const ld = D.leads.find(l => l.id === det);
    const tl = [{ tp: "call", t: "Today 8:12 AM", tx: "AI call — 4:32 — Booked Thu 10:30 AM", d: "Strong refinancing interest. Rate 6.2%. Booked consultation." }, { tp: "sms", t: "Today 8:15 AM", tx: "Confirmation SMS sent", d: "\"Your appointment is confirmed for Thursday 10:30 AM.\"" }, { tp: "email", t: "Today 8:16 AM", tx: "Confirmation email sent", d: "Calendar invite attached" }, { tp: "call", t: "Yest 6:18 PM", tx: "AI call — 1:45 — Interested, no appt", d: "Was driving. Asked to call back tomorrow morning." }, { tp: "sms", t: "Feb 14", tx: "Follow-up SMS sent", d: "\"We'd love to help explore refinancing options.\"" }];
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}><button onClick={() => setDet(null)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: T.txM, display: "flex" }}><ChevronLeft size={16} /></button><h1 style={{ fontSize: 22, fontWeight: 700, color: T.tx, margin: 0 }}>{ld.n}</h1>{obadge(ld.oc)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
          <div>
            <Card style={{ padding: 20, marginBottom: 12 }}>
              <SL>Contact</SL>
              {[[<Phone size={13} key="p" />, ld.ph], [<Mail size={13} key="m" />, ld.em], [<User size={13} key="u" />, ld.co]].map(([ic, v], i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.tx, marginBottom: 8 }}>{ic} {v}</div>)}
            </Card>
            {/* Status management */}
            <Card style={{ padding: 16, marginBottom: 12 }}>
              <SL>Lead Status</SL>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Badge color={ld.st === "Appt Set" ? "emerald" : ld.st === "Interested" ? "blue" : ld.st === "Closed Won" ? "emerald" : ld.st === "Closed Lost" ? "red" : ld.st === "Showed" ? "purple" : ld.st === "Bad Lead" ? "red" : "default"}>{ld.st}</Badge>
              </div>
              {/* Suggested next action based on status */}
              {ld.st === "Interested" && <Btn s={{ width: "100%", justifyContent: "center", marginBottom: 8, fontSize: 12 }}><CalendarCheck size={12} /> Mark as Booked</Btn>}
              {ld.st === "Appt Set" && <Btn s={{ width: "100%", justifyContent: "center", marginBottom: 8, fontSize: 12 }}><Check size={12} /> Mark as Showed</Btn>}
              {ld.st === "Showed" && <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <Btn s={{ flex: 1, justifyContent: "center", fontSize: 12 }}><Check size={12} /> Closed Won</Btn>
                <Btn v="g" s={{ flex: 1, justifyContent: "center", fontSize: 12, color: T.rd }}><XCircle size={12} /> Closed Lost</Btn>
              </div>}
              {ld.st === "Contacted" && <Btn s={{ width: "100%", justifyContent: "center", marginBottom: 8, fontSize: 12 }}><TrendingUp size={12} /> Mark Interested</Btn>}
              {/* Manual override dropdown */}
              <select defaultValue={ld.st} style={{ width: "100%", padding: "8px 10px", background: T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 8, fontSize: 12, color: T.txM, outline: "none", fontFamily: "inherit", boxSizing: "border-box", appearance: "none" }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Btn s={{ justifyContent: "center" }}><Phone size={13} /> Call Now</Btn>
              <Btn v="g" s={{ justifyContent: "center" }}><MessageSquare size={13} /> Text</Btn>
              <Btn v="g" s={{ justifyContent: "center" }}><Mail size={13} /> Email</Btn>
            </div>
          </div>
          <Card style={{ padding: 20 }}>
            <SL>Timeline</SL>
            {tl.map((t, i) => <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < tl.length - 1 ? 16 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: t.tp === "call" ? T.emB2 : t.tp === "sms" ? T.blB : T.puB, color: t.tp === "call" ? T.em : t.tp === "sms" ? T.bl : T.pu }}>{t.tp === "call" ? <Phone size={12} /> : t.tp === "sms" ? <MessageSquare size={12} /> : <Mail size={12} />}</div>
                {i < tl.length - 1 && <div style={{ width: 1, flex: 1, background: T.brd, marginTop: 4 }} />}
              </div>
              <div style={{ paddingBottom: 4 }}><div style={{ fontSize: 11, color: T.txD }}>{t.t}</div><div style={{ fontSize: 13, fontWeight: 600, color: T.tx, marginTop: 1 }}>{t.tx}</div><div style={{ fontSize: 12, color: T.txD, marginTop: 2 }}>{t.d}</div></div>
            </div>)}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h1 style={{ fontSize: 24, fontWeight: 700, color: T.tx, margin: 0 }}>Leads</h1><div style={{ display: "flex", gap: 8 }}><Btn v="g"><Upload size={14} /> Import</Btn><Btn><Plus size={14} /> Add Lead</Btn></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[["Total", D.leads.length, T.tx], ["Follow-ups", 5, T.am], ["Appointments", 3, T.em], ["New", 1, T.bl]].map(([l, v, c]) => <Card key={l} style={{ padding: "10px 16px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div><div style={{ fontSize: 10, color: T.txD }}>{l}</div></Card>)}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}><Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.txD }} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, email..." style={{ width: "100%", padding: "9px 14px 9px 34px", background: T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 8, fontSize: 13, color: T.tx, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} /></div>
        <DropSelect label="Status" value={sf} options={STATUSES} onChange={setSf} />
        <DropSelect label="Outcome" value={of2} options={OUTCOMES} onChange={setOf} />
      </div>
      <Card style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.brd}` }}>{["Name", "Phone", "Status", "Outcome", "Last", "Campaign"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.txD, fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>{fl.length > 0 ? fl.map((l, i) => (
            <tr key={l.id} onClick={() => setDet(l.id)} style={{ borderBottom: i < fl.length - 1 ? `1px solid ${T.brdL}` : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <td style={{ padding: "10px 16px" }}><div style={{ fontSize: 13, fontWeight: 600, color: T.tx }}>{l.n}</div><div style={{ fontSize: 11, color: T.txD }}>{l.co}</div></td>
              <td style={{ padding: "10px 16px", fontSize: 13, color: T.txM, fontVariantNumeric: "tabular-nums" }}>{l.ph}</td>
              <td style={{ padding: "10px 16px" }}><Badge color={l.st === "Appt Set" ? "emerald" : l.st === "Interested" ? "blue" : l.st === "Bad Lead" ? "red" : "default"}>{l.st}</Badge></td>
              <td style={{ padding: "10px 16px" }}>{obadge(l.oc)}</td>
              <td style={{ padding: "10px 16px", fontSize: 12, color: T.txD }}>{l.la}</td>
              <td style={{ padding: "10px 16px", fontSize: 12, color: T.txD }}>{l.ca}</td>
            </tr>
          )) : <tr><td colSpan={6} style={{ padding: "24px 16px", textAlign: "center", color: T.txD, fontSize: 13 }}>No leads match your filters</td></tr>}</tbody>
        </table>
      </Card>
    </div>
  );
}

/* ═══ CALLS ═══ */
function CallsPage({ nav }) {
  const [q, setQ] = useState("");
  const [ocf, setOcf] = useState("all");
  const [caf, setCaf] = useState("all");
  const [dirf, setDirf] = useState("out"); // default to outbound
  const [det, setDet] = useState(null);
  const campaigns = [...new Set(D.calls.map(c => c.ca).filter(c => c !== "—"))];
  const fl = D.calls.filter(c => {
    const ms = !q || (c.n + c.oc + c.ca + c.ph).toLowerCase().includes(q.toLowerCase());
    const mo = ocf === "all" || c.oc === ocf;
    const mc = caf === "all" || c.ca === caf;
    const md = dirf === "all" || c.dir === dirf;
    return ms && mo && mc && md;
  });

  const DirIcon = ({ dir, size = 11 }) => dir === "in"
    ? <ArrowDownLeft size={size} style={{ color: T.bl }} />
    : <PhoneOutgoing size={size} style={{ color: T.em }} />;

  if (det) {
    const c = D.calls.find(x => x.id === det);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}><button onClick={() => setDet(null)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: T.txM, display: "flex" }}><ChevronLeft size={16} /></button><h1 style={{ fontSize: 22, fontWeight: 700, color: T.tx, margin: 0 }}>Call with {c.n}</h1><DirIcon dir={c.dir} size={14} />{obadge(c.oc)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[["Date", c.dt], ["Phone", c.ph], ["Duration", c.dur], ["Agent", c.ag], ["Campaign", c.ca]].map(([l, v]) => <Card key={l} style={{ padding: 14 }}><div style={{ fontSize: 11, color: T.txD }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, color: T.tx, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{v}</div></Card>)}
        </div>
        <Card style={{ padding: 20, marginBottom: 12 }}><SL>AI Summary</SL><p style={{ fontSize: 13, color: T.txM, lineHeight: 1.7, margin: 0 }}>Strong interest in refinancing. Current rate 6.2%, looking to lower payments. Agreed to follow-up Thursday. Very positive sentiment.</p></Card>
        {/* Recording player */}
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{ width: 36, height: 36, borderRadius: 18, background: T.emB2, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Play size={14} style={{ color: T.em, marginLeft: 2 }} /></button>
            <div style={{ flex: 1 }}>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ width: "35%", height: "100%", background: T.em, borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.txD, fontVariantNumeric: "tabular-nums" }}>
                <span>1:35</span><span>{c.dur}</span>
              </div>
            </div>
          </div>
        </Card>
        <Card style={{ padding: 20, marginBottom: 12 }}>
          <SL>Transcript</SL>
          {[["Agent", "Hi, is this Sarah? Calling from Courtside Finance about refinancing options."], ["Sarah", "Yes! I've been thinking about it. Our rate is around 6.2%."], ["Agent", "Great timing! Rates are favorable. Would you like a consultation with our specialist?"], ["Sarah", "Yes, when are they available?"], ["Agent", "Thursday at 10:30 AM?"], ["Sarah", "Perfect, book that."]].map(([s, t], i) => <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}><span style={{ fontSize: 12, fontWeight: 700, width: 48, flexShrink: 0, color: s === "Agent" ? T.em : T.bl }}>{s}</span><span style={{ fontSize: 13, color: T.txM, lineHeight: 1.5 }}>{t}</span></div>)}
        </Card>
        <div style={{ display: "flex", gap: 8 }}><Btn><Phone size={13} /> Call Again</Btn><Btn v="g" onClick={() => { setDet(null); nav("leads"); }}><User size={13} /> View Lead</Btn></div>
      </div>
    );
  }

  const todayCalls = fl.filter(c => c.dt.startsWith("Today")).length;
  const booked = fl.filter(c => c.oc === "Booked").length;
  const connected = fl.filter(c => !["No Answer", "Voicemail"].includes(c.oc)).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: T.tx, margin: 0 }}>Calls</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[[fl.length, "Total Calls", T.tx], [todayCalls, "Today", T.bl], [connected, "Connected", T.em], [booked, "Booked", T.am]].map(([v, l, c]) => (
          <Card key={l} style={{ padding: "10px 16px", textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div><div style={{ fontSize: 10, color: T.txD }}>{l}</div></Card>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}><Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.txD }} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone number, outcome..." style={{ width: "100%", padding: "9px 14px 9px 34px", background: T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 8, fontSize: 13, color: T.tx, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} /></div>
        <DropSelect label="Direction" value={dirf} options={["out", "in"]} onChange={setDirf} allLabel="All" />
        <DropSelect label="Outcome" value={ocf} options={OUTCOMES} onChange={setOcf} />
        <DropSelect label="Campaign" value={caf} options={campaigns} onChange={setCaf} />
      </div>
      <Card style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.brd}` }}>{["", "Date", "Lead", "Phone", "Agent", "Dur.", "Outcome", "Campaign"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.txD, fontWeight: 600, width: h === "" ? 24 : "auto" }}>{h}</th>)}</tr></thead>
          <tbody>{fl.length > 0 ? fl.map((c, i) => (
            <tr key={c.id} onClick={() => setDet(c.id)} style={{ borderBottom: i < fl.length - 1 ? `1px solid ${T.brdL}` : "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <td style={{ padding: "10px 8px 10px 12px", width: 24 }}><DirIcon dir={c.dir} /></td>
              <td style={{ padding: "10px 12px", fontSize: 12, color: T.txD }}>{c.dt}</td>
              <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: c.n === "Unknown" ? T.txD : T.tx }}>{c.n}</td>
              <td style={{ padding: "10px 12px", fontSize: 12, color: T.txM, fontVariantNumeric: "tabular-nums" }}>{c.ph}</td>
              <td style={{ padding: "10px 12px", fontSize: 12, color: T.txM }}>{c.ag}</td>
              <td style={{ padding: "10px 12px", fontSize: 12, color: T.txM, fontVariantNumeric: "tabular-nums" }}>{c.dur}</td>
              <td style={{ padding: "10px 12px" }}>{obadge(c.oc)}</td>
              <td style={{ padding: "10px 12px", fontSize: 11, color: T.txD }}>{c.ca}</td>
            </tr>
          )) : <tr><td colSpan={8} style={{ padding: "24px 16px", textAlign: "center", color: T.txD, fontSize: 13 }}>No calls match your filters</td></tr>}</tbody>
        </table>
      </Card>
    </div>
  );
}

/* ═══ CALENDAR ═══ */
function CalendarPage() {
  const today = 17;
  const [selected, setSelected] = useState(null); // { day, idx }
  const [panelOpen, setPanelOpen] = useState(false);

  // Richer appointment data with campaign colors and details
  const apptData = {
    12: [{ t: "2:00 PM", n: "Patricia Gomez", co: "Gomez Properties", ph: "(555) 444-5555", ca: "Spring Mortgage", oc: "Booked", dur: "3:21", sum: "Interested in refinancing investment property. Currently at 6.8%. Booked consultation." },
         { t: "4:00 PM", n: "James Harris", co: "Harris Financial", ph: "(555) 555-6666", ca: "Insurance", oc: "Booked", dur: "4:12", sum: "Wants to review whole life policy options for family coverage." }],
    14: [{ t: "10:00 AM", n: "Thomas Reed", co: "Reed Investments", ph: "(555) 666-7777", ca: "Commercial", oc: "Booked", dur: "2:55", sum: "Commercial lending for new office space. Looking for competitive rates." }],
    17: [{ t: "9:00 AM", n: "Sarah Mitchell", co: "First National", ph: "(555) 234-8901", ca: "Spring Mortgage", oc: "Booked", dur: "4:32", sum: "Strong refinancing interest. Current rate 6.2%. Booked consultation for rate review." },
         { t: "10:30 AM", n: "David Park", co: "Park Financial", ph: "(555) 890-1234", ca: "Insurance", oc: "Booked", dur: "3:18", sum: "Whole life policy discussion. Has existing term life, wants to explore conversion." },
         { t: "1:00 PM", n: "Jennifer Torres", co: "Torres & Assoc", ph: "(555) 901-2345", ca: "Commercial", oc: "Booked", dur: "5:12", sum: "Follow-up on commercial lending terms. Ready to move forward with application." },
         { t: "3:30 PM", n: "Michael Brown", co: "Independent", ph: "(555) 777-8888", ca: "Spring Mortgage", oc: "Booked", dur: "2:45", sum: "Referral from existing client. Investment property financing." }],
    18: [{ t: "11:00 AM", n: "Robert Chen", co: "Chen Investments", ph: "(555) 345-6789", ca: "Spring Mortgage", oc: "Booked", dur: "2:15", sum: "Refinancing discussion scheduled. Very engaged lead." },
         { t: "2:00 PM", n: "Lisa Nguyen", co: "Nguyen Financial", ph: "(555) 456-7890", ca: "Insurance", oc: "Booked", dur: "3:47", sum: "Callback requested. Interested in term life options for business partners." }],
    19: [{ t: "10:00 AM", n: "Marcus Johnson", co: "Johnson Props", ph: "(555) 567-8901", ca: "Spring Mortgage", oc: "Booked", dur: "5:12", sum: "High interest in refinancing. Multiple properties." }],
    20: [{ t: "9:30 AM", n: "Amanda Foster", co: "Foster Holdings", ph: "(555) 678-9012", ca: "Q1 Refi", oc: "Booked", dur: "2:58", sum: "Follow-up appointment. Previously left voicemail, called back interested." },
         { t: "3:00 PM", n: "Kevin Wright", co: "Wright & Sons", ph: "(555) 789-0123", ca: "Commercial", oc: "Booked", dur: "1:22", sum: "Commercial lending inquiry. Small business expansion." }]
  };
  const total = Object.values(apptData).flat().length;
  const campColor = (ca) => ({ "Spring Mortgage": T.em, "Insurance": T.bl, "Commercial": T.am, "Q1 Refi": T.pu }[ca] || T.txM);

  const selAppt = selected ? (apptData[selected.day] || [])[selected.idx] : null;

  // Upcoming this week (days 17-23)
  const upcoming = [];
  for (let d = 17; d <= 23; d++) {
    (apptData[d] || []).forEach(a => upcoming.push({ ...a, day: d }));
  }

  return (
    <div style={{ display: "flex", gap: 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.tx, margin: 0 }}>Calendar</h1>
            <p style={{ fontSize: 13, color: T.txM, margin: "4px 0 0" }}>February 2026</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
              {[["Spring Mortgage", T.em], ["Insurance", T.bl], ["Commercial", T.am], ["Q1 Refi", T.pu]].map(([l, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: 3, background: c }} /><span style={{ color: T.txD }}>{l}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats row — ascending time scale */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            [4, "Today"],
            [upcoming.length, "This Week"],
            [total, "This Month"],
            ["87%", "Show Rate (Past 30d)"]
          ].map(([v, l]) => (
            <div key={l} style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.025)", border: `1px solid ${T.brd}`, borderRadius: 10, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.tx, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              <div style={{ fontSize: 10, color: T.txD }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <Card style={{ overflow: "hidden", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${T.brd}` }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} style={{ textAlign: "center", padding: 8, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.txD, fontWeight: 600 }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {Array.from({ length: 28 }, (_, i) => {
              const day = i + 1;
              const appts = apptData[day] || [];
              const isPast = day < today;
              return (
                <div key={day} style={{ minHeight: 86, borderBottom: `1px solid ${T.brdL}`, borderRight: `1px solid ${T.brdL}`, padding: 6, background: day === today ? "rgba(52,211,153,0.04)" : "transparent", opacity: isPast ? 0.5 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: day === today ? 800 : 400, color: day === today ? T.em : T.txD, fontVariantNumeric: "tabular-nums" }}>{day}</span>
                    {appts.length > 0 && <span style={{ fontSize: 9, color: T.txD, fontWeight: 600 }}>{appts.length}</span>}
                  </div>
                  {appts.map((a, j) => (
                    <div key={j} onClick={() => { setSelected({ day, idx: j }); setPanelOpen(true); }}
                      style={{ fontSize: 9, background: `${campColor(a.ca)}15`, color: campColor(a.ca), borderLeft: `2px solid ${campColor(a.ca)}`, borderRadius: "0 3px 3px 0", padding: "3px 5px", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = `${campColor(a.ca)}25`}
                      onMouseLeave={e => e.currentTarget.style.background = `${campColor(a.ca)}15`}>
                      {a.t} · {a.n.split(" ")[1] || a.n}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Upcoming This Week */}
        <SL>Upcoming This Week</SL>
        <Card style={{ overflow: "hidden" }}>
          {upcoming.length > 0 ? upcoming.map((a, i) => {
            const dayLabel = a.day === 17 ? "Today" : a.day === 18 ? "Tomorrow" : `Feb ${a.day}`;
            return (
              <HRow key={i} onClick={() => { setSelected({ day: a.day, idx: (apptData[a.day] || []).indexOf(a) }); setPanelOpen(true); }}
                style={{ padding: "10px 16px", display: "flex", gap: 12, alignItems: "center", borderBottom: i < upcoming.length - 1 ? `1px solid ${T.brdL}` : "none" }}>
                <div style={{ width: 60, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: a.day === 17 ? T.em : T.txD, fontWeight: 600 }}>{dayLabel}</div>
                  <div style={{ fontSize: 12, color: T.tx, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{a.t}</div>
                </div>
                <div style={{ width: 3, height: 28, borderRadius: 2, background: campColor(a.ca), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.tx }}>{a.n}</div>
                  <div style={{ fontSize: 11, color: T.txD, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.co} · {a.ca}</div>
                </div>
                <ChevronRight size={14} style={{ color: T.txD, flexShrink: 0 }} />
              </HRow>
            );
          }) : <div style={{ padding: 20, textAlign: "center", color: T.txD, fontSize: 13 }}>No upcoming appointments</div>}
        </Card>
      </div>

      {/* Slide-out detail panel */}
      {panelOpen && selAppt && (
        <div style={{ width: 300, flexShrink: 0, marginLeft: 16, background: T.bgCard, border: `1px solid ${T.brd}`, borderRadius: 12, padding: 20, alignSelf: "flex-start", position: "sticky", top: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.txD, fontWeight: 700 }}>Appointment Details</span>
            <button onClick={() => setPanelOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.txD, display: "flex" }}><X size={14} /></button>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.tx, marginBottom: 2 }}>{selAppt.n}</div>
            <div style={{ fontSize: 12, color: T.txD }}>{selAppt.co}</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, padding: "8px 10px", background: `${campColor(selAppt.ca)}10`, borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: campColor(selAppt.ca) }}>{selAppt.t}</div>
              <div style={{ fontSize: 9, color: T.txD }}>Feb {selected.day}</div>
            </div>
            <div style={{ flex: 1, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.tx }}>{selAppt.dur}</div>
              <div style={{ fontSize: 9, color: T.txD }}>AI Call</div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            {[[<Phone size={12} key="p" />, selAppt.ph], [<Megaphone size={12} key="c" />, selAppt.ca]].map(([ic, v], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.txM, marginBottom: 6 }}>{ic} {v}</div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.txD, fontWeight: 600, marginBottom: 6 }}>AI Call Summary</div>
            <p style={{ fontSize: 12, color: T.txM, lineHeight: 1.6, margin: 0 }}>{selAppt.sum}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Btn s={{ justifyContent: "center", fontSize: 12 }}><Phone size={12} /> Call Now</Btn>
            <Btn v="g" s={{ justifyContent: "center", fontSize: 12 }}><Calendar size={12} /> Reschedule</Btn>
            <Btn v="g" s={{ justifyContent: "center", fontSize: 12, color: T.rd }}><XCircle size={12} /> Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ SETTINGS ═══ */
function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [agentView, setAgentView] = useState(null); // null = list, "new" = request form
  const [verStep, setVerStep] = useState(1);
  const [verCountry, setVerCountry] = useState("CA");
  const tabs = [
    { id: "profile", l: "Profile" },
    { id: "billing", l: "Billing" },
    { id: "organization", l: "Organization" },
    { id: "team", l: "Team" },
    { id: "agents", l: "Agents" },
    { id: "verification", l: "Verification" },
    { id: "integrations", l: "Integrations" },
    { id: "compliance", l: "Compliance" },
  ];
  const Inp = ({ l, v, ph, disabled, area }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: T.txD, marginBottom: 4, fontWeight: 500 }}>{l}</label>
      {area ? <textarea defaultValue={v} placeholder={ph} rows={4} style={{ width: "100%", padding: "9px 12px", background: disabled ? "rgba(255,255,255,0.02)" : T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 8, fontSize: 13, color: disabled ? T.txD : T.tx, outline: "none", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", opacity: disabled ? 0.6 : 1 }} disabled={disabled} />
        : <input defaultValue={v} placeholder={ph} style={{ width: "100%", padding: "9px 12px", background: disabled ? "rgba(255,255,255,0.02)" : T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 8, fontSize: 13, color: disabled ? T.txD : T.tx, outline: "none", fontFamily: "inherit", boxSizing: "border-box", opacity: disabled ? 0.6 : 1 }} disabled={disabled} />}
    </div>
  );
  const Sel = ({ l, v, opts }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: T.txD, marginBottom: 4, fontWeight: 500 }}>{l}</label>
      <select defaultValue={v} style={{ width: "100%", padding: "9px 12px", background: T.bgIn, border: `1px solid ${T.brd}`, borderRadius: 8, fontSize: 13, color: T.tx, outline: "none", fontFamily: "inherit", boxSizing: "border-box", appearance: "none" }}>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  const Toggle = ({ l, on, sub }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.brdL}` }}>
      <div><div style={{ fontSize: 13, color: T.tx }}>{l}</div>{sub && <div style={{ fontSize: 11, color: T.txD, marginTop: 1 }}>{sub}</div>}</div>
      <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? T.emD : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background 0.15s" }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 2, left: on ? 18 : 2, transition: "left 0.15s" }} />
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.tx, margin: "0 0 20px" }}>Settings</h1>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setAgentView(null); }}
            style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", background: tab === t.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: tab === t.id ? T.tx : T.txD, transition: "all 0.1s" }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── PROFILE (with notifications) ── */}
      {tab === "profile" && <div style={{ maxWidth: 520 }}>
        <Card style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: T.emB2, display: "flex", alignItems: "center", justifyContent: "center", color: T.em, fontSize: 18, fontWeight: 700 }}>AJ</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.tx }}>Alex Johnson</div>
              <div style={{ fontSize: 12, color: T.txD }}>alex@courtsidefinance.com</div>
              <div style={{ fontSize: 11, color: T.em, marginTop: 2 }}>Owner</div>
            </div>
            <Btn v="g" s={{ fontSize: 11, padding: "6px 12px" }}>Change Photo</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Inp l="First Name" v="Alex" />
            <Inp l="Last Name" v="Johnson" />
          </div>
          <Inp l="Email" v="alex@courtsidefinance.com" />
          <Inp l="Phone" v="(555) 123-4567" />
          <Inp l="Timezone" v="EST (Eastern Standard Time)" />
          <Btn s={{ marginTop: 4 }}>Save Changes</Btn>
        </Card>

        <Card style={{ padding: 24 }}>
          <SL>Notification Preferences</SL>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 50px 50px", gap: 0, marginBottom: 6 }}>
              <div />
              {["Push", "SMS", "Email"].map(h => <div key={h} style={{ textAlign: "center", fontSize: 10, color: T.txD, fontWeight: 600, letterSpacing: "0.05em" }}>{h}</div>)}
            </div>
            {[
              ["Appointment Booked", [1, 1, 1]],
              ["Hot Lead Alert", [1, 1, 0]],
              ["SMS Reply Received", [1, 0, 0]],
              ["Campaign Completed", [1, 0, 1]],
              ["Daily Summary Digest", [0, 0, 1]],
              ["Agent Status Change", [1, 0, 1]],
              ["Verification Update", [1, 0, 1]],
            ].map(([l, chs]) => (
              <div key={l} style={{ display: "grid", gridTemplateColumns: "1fr 50px 50px 50px", gap: 0, padding: "8px 0", borderBottom: `1px solid ${T.brdL}` }}>
                <span style={{ fontSize: 13, color: T.tx }}>{l}</span>
                {chs.map((c, ci) => (
                  <div key={ci} style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${c ? T.em : "rgba(255,255,255,0.15)"}`, background: c ? T.emD : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      {c === 1 && <Check size={10} color="#fff" />}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <Btn s={{ marginTop: 8 }}>Save Preferences</Btn>
        </Card>
      </div>}

      {/* ── BILLING ── */}
      {tab === "billing" && <div style={{ maxWidth: 520 }}>
        <div style={{ background: `linear-gradient(135deg, ${T.emB} 0%, transparent 70%)`, border: `1px solid rgba(52,211,153,0.15)`, borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: T.em, opacity: 0.6, fontWeight: 700, marginBottom: 4 }}>Current Plan</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.tx }}>Professional</div>
              <div style={{ fontSize: 12, color: T.txD, marginTop: 2 }}>$299/mo · Renews Mar 17, 2026</div>
            </div>
            <Btn>Upgrade</Btn>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.txD, marginBottom: 5 }}><span>AI Call Minutes</span><span style={{ color: T.tx, fontWeight: 600 }}>2,847 / 5,000</span></div>
            <PBar value={2847} max={5000} color={T.em} />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.txD, marginBottom: 5 }}><span>Phone Numbers</span><span style={{ color: T.tx, fontWeight: 600 }}>3 / 5</span></div>
            <PBar value={3} max={5} color={T.bl} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[["$299", "Monthly Cost", T.tx], ["$0.06", "Per Extra Min", T.am], ["$2,153", "Saved vs. Manual", T.em]].map(([v, l, c]) => (
            <Card key={l} style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: T.txD }}>{l}</div>
            </Card>
          ))}
        </div>

        <Card style={{ padding: 20, marginBottom: 10 }}>
          <SL>Recent Invoices</SL>
          {[["Feb 2026", "$299.00", "Paid"], ["Jan 2026", "$299.00", "Paid"], ["Dec 2025", "$248.40", "Paid"]].map(([d, a, s], i, arr) => (
            <div key={d} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.brdL}` : "none" }}>
              <span style={{ fontSize: 13, color: T.tx }}>{d}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: T.txM, fontVariantNumeric: "tabular-nums" }}>{a}</span>
                <Badge color="emerald">{s}</Badge>
              </div>
            </div>
          ))}
        </Card>
        {/* Your Phone Numbers */}
        <Card style={{ padding: 20, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SL style={{ marginBottom: 0 }}>Your Phone Numbers</SL>
            <Btn v="g" s={{ fontSize: 11, padding: "5px 10px" }}><Plus size={11} /> Request Number</Btn>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: `1px solid ${T.brd}` }}>
              {["Number", "Type", "Assigned To", "Texts", "Calls", "Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 0", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.txD, fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[
                ["(555) 200-1000", "Texting", "Spring Mortgage", 342, "—", "Active"],
                ["(555) 200-1001", "Texting", "Insurance Outreach", 187, "—", "Active"],
                ["(555) 200-1002", "Inbound", "James — Insurance", "—", 94, "Active"],
              ].map(([ph, tp, assign, texts, calls, st], i, arr) => (
                <tr key={ph} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.brdL}` : "none" }}>
                  <td style={{ padding: "8px 0", fontSize: 13, color: T.tx, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{ph}</td>
                  <td style={{ padding: "8px 0" }}><Badge color={tp === "Inbound" ? "blue" : "default"}>{tp}</Badge></td>
                  <td style={{ padding: "8px 0", fontSize: 12, color: T.txM }}>{assign}</td>
                  <td style={{ padding: "8px 0", fontSize: 12, color: T.txM, fontVariantNumeric: "tabular-nums" }}>{texts}</td>
                  <td style={{ padding: "8px 0", fontSize: 12, color: T.txM, fontVariantNumeric: "tabular-nums" }}>{calls}</td>
                  <td style={{ padding: "8px 0" }}><Badge color="emerald">{st}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card hover style={{ padding: 14, textAlign: "center", cursor: "pointer" }}>
          <span style={{ fontSize: 13, color: T.txM }}>Open Stripe Billing Portal →</span>
        </Card>
      </div>}

      {/* ── ORGANIZATION ── */}
      {tab === "organization" && <Card style={{ padding: 24, maxWidth: 520 }}>
        <SL>Organization Details</SL>
        <Inp l="Organization Name" v="Courtside Finance" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Inp l="Industry" v="Mortgage Brokerage" />
          <Inp l="Business Type" v="LLC" />
        </div>
        <Inp l="Business Phone" v="(555) 100-2000" />
        <Inp l="Website" v="https://courtsidefinance.com" />
        <Inp l="Address" v="123 Finance St, Suite 400, Toronto, ON M5V 2T6" />
        <Btn s={{ marginTop: 4 }}>Save Changes</Btn>
      </Card>}

      {/* ── TEAM ── */}
      {tab === "team" && <div style={{ maxWidth: 580 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 13, color: T.txM }}>Manage team members and roles.</span>
            <div style={{ fontSize: 11, color: T.txD, marginTop: 2 }}>3 members · 1 pending invite</div>
          </div>
          <Btn><Plus size={13} /> Invite Member</Btn>
        </div>
        <Card style={{ overflow: "hidden" }}>
          {[
            ["Alex Johnson", "alex@courtsidefinance.com", "Owner", "Active", true],
            ["Maria Garcia", "maria@courtsidefinance.com", "Admin", "Active", true],
            ["James Wilson", "james@courtsidefinance.com", "Member", "Active", true],
            ["Sarah Kim", "sarah@courtsidefinance.com", "Member", "Invited", false],
          ].map(([n, e, r, st, active], i, arr) => (
            <div key={i} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < arr.length - 1 ? `1px solid ${T.brdL}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 17, background: active ? T.emB2 : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: active ? T.em : T.txD }}>{n.split(" ").map(x => x[0]).join("")}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.tx }}>{n}</div>
                  <div style={{ fontSize: 11, color: T.txD }}>{e}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge color={active ? "emerald" : "amber"}>{st}</Badge>
                <Badge>{r}</Badge>
                {r !== "Owner" && <button style={{ background: "none", border: "none", cursor: "pointer", color: T.txD, display: "flex", padding: 4 }}><X size={12} /></button>}
              </div>
            </div>
          ))}
        </Card>
      </div>}

      {/* ── AGENTS ── */}
      {tab === "agents" && agentView === null && <div style={{ maxWidth: 600 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 13, color: T.txM }}>Your AI voice agents.</span>
            <div style={{ fontSize: 11, color: T.txD, marginTop: 2 }}>2 active · 1 pending setup</div>
          </div>
          <Btn onClick={() => setAgentView("new")}><Plus size={13} /> Request New Agent</Btn>
        </div>
        {[
          { n: "Sarah — Mortgage Specialist", tp: "Mortgage", dir: "outbound", st: "active", calls: 523, bk: 42, rate: "8.0%", camps: 3, voice: "Female" },
          { n: "James — Insurance Advisor", tp: "Insurance", dir: "inbound", st: "active", calls: 217, bk: 15, rate: "6.9%", camps: 2, ph: "(555) 200-1002", voice: "Male" },
          { n: "Alex — General Financial", tp: "General", dir: "outbound", st: "pending", calls: 0, bk: 0, rate: "—", camps: 0, voice: "Male" },
        ].map((ag, i) => (
          <Card key={i} style={{ padding: 18, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.tx }}>{ag.n}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <Badge color={ag.st === "active" ? "emerald" : "amber"}>{ag.st === "active" ? "Active" : "Pending Setup"}</Badge>
                  <Badge color={ag.tp === "Mortgage" ? "blue" : ag.tp === "Insurance" ? "purple" : "default"}>{ag.tp}</Badge>
                  <Badge color={ag.dir === "inbound" ? "blue" : "default"}>{ag.dir === "inbound" ? "Inbound" : "Outbound"}</Badge>
                </div>
              </div>
              {ag.st === "active" && <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.em, lineHeight: 1 }}>{ag.bk}</div>
                <div style={{ fontSize: 9, color: T.em, opacity: 0.7, fontWeight: 600 }}>BOOKED</div>
              </div>}
            </div>
            {ag.st === "active" ? (
              <div style={{ display: "grid", gridTemplateColumns: ag.dir === "inbound" ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr", gap: 10 }}>
                {[
                  [ag.calls, "Total Calls"],
                  [ag.rate, "Book Rate"],
                  [ag.camps, "Campaigns"],
                  ...(ag.dir === "inbound" ? [[ag.ph, "Dedicated Line"]] : []),
                ].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.tx, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                    <div style={{ fontSize: 10, color: T.txD }}>{l}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.06)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.12)" }}>
                <div style={{ fontSize: 12, color: T.am }}>Agent setup in progress. Our team is configuring this agent and will notify you when it's ready.</div>
              </div>
            )}
          </Card>
        ))}
      </div>}

      {/* Agent Request Form */}
      {tab === "agents" && agentView === "new" && <div style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setAgentView(null)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: T.txM, display: "flex" }}><ChevronLeft size={16} /></button>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.tx, margin: 0 }}>Request New Agent</h2>
        </div>
        <Card style={{ padding: 24 }}>
          <p style={{ fontSize: 12, color: T.txD, marginBottom: 20 }}>Fill out the details below and our team will configure your new AI voice agent. You'll be notified when it's ready.</p>
          <Inp l="Agent Name" ph="e.g., Sarah — Mortgage Specialist" />
          <Sel l="Agent Type" v="Mortgage" opts={["Mortgage", "Insurance", "Commercial Lending", "General Financial", "Custom"]} />
          <Sel l="Preferred Voice" v="Female" opts={["Female", "Male"]} />
          <Inp l="Purpose & Description" ph="What should this agent do? Describe its role, tone, and focus area..." area />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: T.txD, marginBottom: 8, fontWeight: 500 }}>Campaign Goals</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {["Schedule Appointments", "Qualify Leads", "Collect Information", "Follow-up / Re-engage", "Custom / Other"].map((g, i) => (
                <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${i < 2 ? T.em : "rgba(255,255,255,0.15)"}`, background: i < 2 ? T.emD : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i < 2 && <Check size={10} color="#fff" />}
                  </div>
                  <span style={{ fontSize: 13, color: T.tx }}>{g}</span>
                </div>
              ))}
            </div>
          </div>
          <Inp l="Preferred Greeting" ph="e.g., Hi, this is Sarah calling from Courtside Finance..." />
          <Inp l="Additional Notes" ph="Objection handling, booking rules, anything else..." area />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn v="g" onClick={() => setAgentView(null)} s={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
            <Btn onClick={() => setAgentView(null)} s={{ flex: 1, justifyContent: "center" }}>Submit Request</Btn>
          </div>
        </Card>
      </div>}

      {/* ── VERIFICATION ── */}
      {tab === "verification" && <div style={{ maxWidth: 580 }}>
        {/* Status banner */}
        <div style={{ padding: "14px 18px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Clock size={16} style={{ color: T.am, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.am }}>Verification In Progress</div>
            <div style={{ fontSize: 11, color: T.txD }}>Submitted Feb 10, 2026 · Estimated 3–5 business days</div>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, alignItems: "center" }}>
          {["Business Details", "Authorized Representative"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: verStep > i + 1 ? T.emB : verStep === i + 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", color: verStep > i + 1 ? T.em : verStep === i + 1 ? T.tx : T.txD }}>
                {verStep > i + 1 ? <Check size={12} /> : <span>{i + 1}</span>}
                <span>{s}</span>
              </div>
              {i < 1 && <div style={{ width: 16, height: 1, background: T.brd }} />}
            </div>
          ))}
        </div>

        {verStep === 1 && <Card style={{ padding: 24 }}>
          <SL>Business Details</SL>
          {/* Country selector */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, color: T.txD, marginBottom: 6, fontWeight: 500 }}>Country</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[["CA", "Canada"], ["US", "United States"]].map(([code, label]) => (
                <button key={code} onClick={() => setVerCountry(code)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1.5px solid ${verCountry === code ? "rgba(52,211,153,0.4)" : T.brd}`, cursor: "pointer", fontFamily: "inherit", background: verCountry === code ? T.emB : "rgba(255,255,255,0.02)", color: verCountry === code ? T.em : T.txM, transition: "all 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Inp l="Legal Business Name (as registered)" v="Courtside Finance LLC" />
          <Inp l="DBA / Trade Name (if different)" v="Courtside Finance" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Inp l={verCountry === "CA" ? "Business Number (BN)" : "EIN / Tax ID Number"} v={verCountry === "CA" ? "123456789 RC0001" : "12-3456789"} />
            <Sel l="Business Type" v="LLC" opts={verCountry === "CA" ? ["Corporation", "Sole Proprietorship", "Partnership", "Cooperative", "Non-Profit"] : ["LLC", "Corporation (C-Corp)", "Corporation (S-Corp)", "Sole Proprietorship", "Partnership", "Non-Profit"]} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Inp l={verCountry === "CA" ? "Provincial Registration Number" : "State Registration Number"} v={verCountry === "CA" ? "ON-2024-CF-001234" : "S-2024-CF-005678"} />
            <Sel l={verCountry === "CA" ? "Province" : "State"} v={verCountry === "CA" ? "Ontario" : "California"} opts={verCountry === "CA" ? ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland", "Nova Scotia", "Ontario", "PEI", "Quebec", "Saskatchewan"] : ["California", "Florida", "Illinois", "New York", "Texas", "Washington", "Other"]} />
          </div>
          <Inp l="Business Address" v={verCountry === "CA" ? "123 Finance St, Suite 400, Toronto, ON M5V 2T6" : "456 Market St, Suite 200, San Francisco, CA 94105"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Inp l="Website URL" v="https://courtsidefinance.com" />
            <Sel l="Industry" v="Financial Services" opts={["Financial Services", "Insurance", "Real Estate", "Mortgage Lending", "Investment Advisory", "Other"]} />
          </div>
          <Btn onClick={() => setVerStep(2)} s={{ width: "100%", justifyContent: "center", marginTop: 8, padding: "10px 0" }}>Continue to Representative</Btn>
        </Card>}

        {verStep === 2 && <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setVerStep(1)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", color: T.txM, display: "flex" }}><ChevronLeft size={16} /></button>
            <SL style={{ marginBottom: 0 }}>Authorized Representative</SL>
          </div>
          <p style={{ fontSize: 12, color: T.txD, marginBottom: 16 }}>This person will be the primary point of contact for verification and compliance matters.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Inp l="Full Legal Name" v="Alex Johnson" />
            <Inp l="Job Title" v="CEO / Managing Director" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Inp l="Email Address" v="alex@courtsidefinance.com" />
            <Inp l="Phone Number" v="(555) 123-4567" />
          </div>
          <Inp l="Date of Birth" v="1988-05-15" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn v="g" onClick={() => setVerStep(1)} s={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>Back</Btn>
            <Btn s={{ flex: 1, justifyContent: "center", padding: "10px 0" }}>Submit Verification</Btn>
          </div>
        </Card>}
      </div>}

      {/* ── INTEGRATIONS ── */}
      {tab === "integrations" && <div style={{ maxWidth: 520 }}>
        <SL>Connected Services</SL>
        {[
          { n: "Google Calendar", d: "Sync AI-booked appointments to your calendar", st: "available" },
          { n: "Outlook Calendar", d: "Sync appointments to Microsoft Outlook", st: "soon" },
          { n: "HubSpot CRM", d: "Import and sync contacts, push call outcomes", st: "soon" },
          { n: "Salesforce", d: "Bi-directional contact sync, log activities", st: "soon" },
          { n: "GoHighLevel", d: "Sync leads, triggers, and appointments", st: "soon" },
          { n: "Zapier", d: "Connect to 5,000+ apps via Zapier workflows", st: "soon" },
        ].map((svc, i) => (
          <Card key={i} style={{ padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: svc.st === "soon" ? 0.55 : 1 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.tx }}>{svc.n}</span>
                {svc.st === "soon" && <span style={{ fontSize: 9, fontWeight: 700, color: T.am, background: T.amB, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.05em" }}>COMING SOON</span>}
              </div>
              <div style={{ fontSize: 12, color: T.txD }}>{svc.d}</div>
            </div>
            {svc.st === "available" && <Btn v="g" s={{ fontSize: 12 }}>Connect</Btn>}
          </Card>
        ))}
        <Card style={{ padding: 20, marginTop: 12, textAlign: "center", borderStyle: "dashed" }}>
          <div style={{ fontSize: 13, color: T.txM }}>Need a different integration?</div>
          <div style={{ fontSize: 12, color: T.txD, marginTop: 2 }}>Contact us at integrations@courtside.com</div>
        </Card>
      </div>}

      {/* ── COMPLIANCE ── */}
      {tab === "compliance" && <div style={{ maxWidth: 540 }}>
        {/* Compliance status */}
        <div style={{ padding: "14px 18px", background: T.emB, border: `1px solid rgba(52,211,153,0.15)`, borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <Check size={16} style={{ color: T.em, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.em }}>Compliant</div>
            <div style={{ fontSize: 11, color: T.txD }}>All compliance requirements met · Last reviewed Feb 15, 2026</div>
          </div>
        </div>

        {/* Terms of Service */}
        <Card style={{ padding: 20, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.tx, marginBottom: 4 }}>Terms of Service</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.em }}><Check size={12} /> Accepted Jan 3, 2026</div>
            </div>
            <Btn v="g" s={{ fontSize: 11, padding: "5px 10px" }}>View Terms</Btn>
          </div>
        </Card>

        {/* Regulatory Compliance */}
        <Card style={{ padding: 20, marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.tx, marginBottom: 12 }}>Regulatory Compliance</div>
          <Toggle l="CASL Compliance" on={true} sub="Canadian Anti-Spam Legislation compliance for messages" />
          <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginTop: 10 }}>
            <div style={{ fontSize: 12, color: T.txM, marginBottom: 4 }}>By using Courtside AI, you confirm that:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {["You have consent to contact the leads in your campaigns", "Your business complies with local and federal telemarketing laws", "You will not use the platform for fraudulent or deceptive purposes"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: T.txD }}><Check size={10} style={{ color: T.em, marginTop: 2, flexShrink: 0 }} />{t}</div>
              ))}
            </div>
          </div>
        </Card>

        {/* DNC Management */}
        <Card style={{ padding: 20, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.tx, marginBottom: 2 }}>Do Not Call (DNC) List</div>
              <div style={{ fontSize: 12, color: T.txD }}>Numbers that will never be called by any campaign.</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn v="g" s={{ fontSize: 11, padding: "5px 10px" }}><Upload size={11} /> Upload CSV</Btn>
              <Btn v="g" s={{ fontSize: 11, padding: "5px 10px" }}><Plus size={11} /> Add</Btn>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[["47", "Numbers Blocked"], ["Feb 15", "Last Updated"], ["3", "Auto-Added"]].map(([v, l]) => (
              <div key={l} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.tx }}>{v}</div>
                <div style={{ fontSize: 9, color: T.txD }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Auto Opt-Out Rules */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.tx, marginBottom: 12 }}>Auto Opt-Out Rules</div>
          <Toggle l='SMS "STOP" → Remove from all campaigns' on={true} sub="Instant removal when keyword detected" />
          <Toggle l="Verbal DNC → Auto-flag on calls" on={true} sub="AI detects do-not-call requests during conversation" />
          <Toggle l="Email Unsubscribe → Remove from sequences" on={true} sub="Honors unsubscribe links automatically" />
          <Toggle l="National DNC Registry Check" on={true} sub="Cross-reference with Canadian DNCL before calling" />
        </Card>
      </div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   APP SHELL
   ═══════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("home");
  const navItems = [{ id: "home", l: "Home", I: Home }, { id: "campaigns", l: "Campaigns", I: Megaphone }, { id: "leads", l: "Leads", I: Users }, { id: "calls", l: "Calls", I: Phone }, { id: "calendar", l: "Calendar", I: CalendarDays }];

  const render = () => {
    switch (page) {
      case "home": return <HomePage nav={setPage} />;
      case "campaigns": return <CampaignsPage nav={setPage} />;
      case "nc": return <NewCampaign nav={setPage} />;
      case "leads": return <LeadsPage nav={setPage} />;
      case "calls": return <CallsPage nav={setPage} />;
      case "calendar": return <CalendarPage />;
      case "settings": return <SettingsPage />;
      default: return <HomePage nav={setPage} />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, color: T.tx, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", fontSize: 14, overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&display=swap');`}</style>
      {/* Sidebar */}
      <div style={{ width: 210, flexShrink: 0, background: T.bgSide, borderRight: `1px solid ${T.brd}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "22px 16px 20px", borderBottom: `1px solid ${T.brd}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(28,171,176,0.1)", borderRadius: 9, flexShrink: 0, border: "1px solid rgba(28,171,176,0.12)" }}>
              <svg width="18" height="18" viewBox="0 0 375 375">
                <path fill="#1cabb0" d="M 234.636719 11.613281 L 215.921875 81.367188 L 146.164062 100.082031 L 109.792969 109.828125 L 100.046875 146.199219 L 81.332031 215.957031 L 117.707031 206.214844 L 187.5 187.5 L 177.753906 223.871094 L 168.820312 257.253906 L 132.445312 267 L 99.0625 275.933594 L 62.691406 285.679688 L 11.613281 234.636719 L 30.292969 164.878906 L 58.75 58.75 L 164.878906 30.328125 Z"/>
                <path fill="#1cabb0" d="M 312.308594 89.320312 L 363.386719 140.359375 L 344.707031 210.117188 L 316.28125 316.246094 L 246.527344 334.925781 L 210.152344 344.671875 L 176.769531 353.605469 L 140.359375 363.386719 L 159.039062 293.628906 L 195.378906 283.882812 L 265.136719 265.207031 L 274.878906 228.832031 L 293.59375 159.074219 L 223.835938 177.753906 L 187.5 187.5 L 206.179688 117.742188 L 242.550781 107.996094 Z"/>
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: T.tx, letterSpacing: "0.01em", fontFamily: "'Lora', Georgia, serif" }}>Courtside AI</span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {navItems.map(({ id, l, I }) => {
            const active = page === id || (id === "campaigns" && page === "nc");
            return <button key={id} onClick={() => setPage(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", marginBottom: 2, textAlign: "left", background: active ? T.emB2 : "transparent", color: active ? T.em : T.txM }}>
              <I size={16} /><span>{l}</span>
              {id === "home" && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, background: T.amB, color: T.am, padding: "1px 6px", borderRadius: 4 }}>5</span>}
            </button>;
          })}
        </nav>
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${T.brd}` }}>
          <button onClick={() => setPage("settings")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", background: page === "settings" ? T.emB2 : "transparent", color: page === "settings" ? T.em : T.txM }}>
            <Settings size={16} /> Settings
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: T.emB2, display: "flex", alignItems: "center", justifyContent: "center", color: T.em, fontSize: 9, fontWeight: 700 }}>AJ</div>
            <div><div style={{ fontSize: 11, color: T.txM }}>Alex Johnson</div><div style={{ fontSize: 10, color: T.txD }}>Professional</div></div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div key={page} style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>{render()}</div>
      </div>
    </div>
  );
}
