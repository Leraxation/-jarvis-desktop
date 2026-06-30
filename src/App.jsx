import { useState, useEffect, useRef, useCallback } from "react";

const CLAUDE_MODEL  = "claude-sonnet-4-6";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

// ── Palette & tokens ──────────────────────────────────────────────
const C = {
  bg:        "#050A0F",
  panel:     "#0B1820",
  panelAlt:  "#0D2030",
  border:    "#0F3347",
  borderBright:"#1A5070",
  cyan:      "#00D4FF",
  cyanDim:   "#0099BB",
  cyanFaint: "#00D4FF18",
  cyanGlow:  "#00D4FF40",
  green:     "#00FF9D",
  greenDim:  "#00CC7A",
  amber:     "#FFB300",
  red:       "#FF4560",
  text:      "#C8E8F0",
  textDim:   "#5A8A9F",
  textFaint: "#2A5060",
  white:     "#E8F8FF",
};

// ── Inline styles helper ──────────────────────────────────────────
const s = (obj) => obj;

// ── Global CSS injected once ──────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Inter:wght@300;400;500&family=Share+Tech+Mono&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Inter', sans-serif;
    overflow: hidden;
    height: 100vh;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: ${C.panel}; }
  ::-webkit-scrollbar-thumb { background: ${C.cyanDim}; border-radius: 2px; }

  .hud-font { font-family: 'Rajdhani', sans-serif; }
  .mono-font { font-family: 'Share Tech Mono', monospace; }

  @keyframes pulse-ring {
    0%   { transform: scale(0.9); opacity: 0.8; }
    50%  { transform: scale(1.08); opacity: 0.4; }
    100% { transform: scale(0.9); opacity: 0.8; }
  }
  @keyframes pulse-ring-2 {
    0%   { transform: scale(1); opacity: 0.5; }
    50%  { transform: scale(1.18); opacity: 0.15; }
    100% { transform: scale(1); opacity: 0.5; }
  }
  @keyframes pulse-ring-3 {
    0%   { transform: scale(1.1); opacity: 0.25; }
    50%  { transform: scale(1.28); opacity: 0.05; }
    100% { transform: scale(1.1); opacity: 0.25; }
  }
  @keyframes orb-glow {
    0%, 100% { box-shadow: 0 0 30px ${C.cyanGlow}, 0 0 60px ${C.cyanFaint}, inset 0 0 20px ${C.cyanFaint}; }
    50%       { box-shadow: 0 0 50px ${C.cyan}60, 0 0 100px ${C.cyan}30, inset 0 0 30px ${C.cyan}20; }
  }
  @keyframes orb-listen {
    0%, 100% { box-shadow: 0 0 40px ${C.green}80, 0 0 80px ${C.green}40, inset 0 0 25px ${C.green}30; }
    50%       { box-shadow: 0 0 70px ${C.green}AA, 0 0 130px ${C.green}60, inset 0 0 40px ${C.green}40; }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes grid-pulse {
    0%, 100% { opacity: 0.03; }
    50%       { opacity: 0.07; }
  }
  @keyframes typing-dot {
    0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
    30%            { opacity: 1;   transform: translateY(-4px); }
  }
  @keyframes corner-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes data-scroll {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }

  .orb-idle    { animation: orb-glow 3s ease-in-out infinite; }
  .orb-listen  { animation: orb-listen 1s ease-in-out infinite; }
  .orb-think   { animation: orb-glow 0.6s ease-in-out infinite; }

  .ring-1 { animation: pulse-ring   3s ease-in-out infinite; }
  .ring-2 { animation: pulse-ring-2 3s ease-in-out infinite 0.4s; }
  .ring-3 { animation: pulse-ring-3 3s ease-in-out infinite 0.8s; }

  .ring-listen-1 { animation: pulse-ring   0.8s ease-in-out infinite; }
  .ring-listen-2 { animation: pulse-ring-2 0.8s ease-in-out infinite 0.15s; }
  .ring-listen-3 { animation: pulse-ring-3 0.8s ease-in-out infinite 0.3s; }

  .cursor-blink { animation: blink 1.1s step-end infinite; }
  .fade-in-up   { animation: fade-in-up 0.35s ease both; }

  .grid-bg {
    background-image:
      linear-gradient(${C.cyan}08 1px, transparent 1px),
      linear-gradient(90deg, ${C.cyan}08 1px, transparent 1px);
    background-size: 40px 40px;
    animation: grid-pulse 4s ease-in-out infinite;
  }

  .scanline-overlay::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(transparent, ${C.cyan}15, transparent);
    animation: scanline 6s linear infinite;
    pointer-events: none;
  }

  .hud-border {
    border: 1px solid ${C.border};
    position: relative;
  }
  .hud-border::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    background: linear-gradient(135deg, ${C.cyan}20, transparent 40%, transparent 60%, ${C.cyan}10);
    pointer-events: none;
    z-index: 0;
  }

  .nav-item {
    cursor: pointer;
    transition: all 0.2s;
    border-left: 2px solid transparent;
  }
  .nav-item:hover { background: ${C.cyanFaint}; border-left-color: ${C.cyanDim}; }
  .nav-item.active { background: ${C.cyan}15; border-left-color: ${C.cyan}; }

  .chat-input {
    background: transparent;
    border: none;
    outline: none;
    color: ${C.white};
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    width: 100%;
    resize: none;
  }
  .chat-input::placeholder { color: ${C.textFaint}; }

  .send-btn {
    background: ${C.cyan};
    border: none;
    cursor: pointer;
    border-radius: 6px;
    padding: 8px 16px;
    color: ${C.bg};
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 1px;
    transition: all 0.2s;
  }
  .send-btn:hover { background: ${C.white}; }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .stat-card {
    background: ${C.panel};
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 14px 16px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  .stat-card:hover { border-color: ${C.borderBright}; }
  .stat-card::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${C.cyan}50, transparent);
  }

  .typing-dot { animation: typing-dot 1.2s ease infinite; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }

  .section-header {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: ${C.cyanDim};
  }

  .corner-decoration {
    position: absolute;
    width: 12px; height: 12px;
    border-color: ${C.cyan};
    border-style: solid;
    opacity: 0.6;
  }
  .corner-tl { top: 6px; left: 6px; border-width: 1px 0 0 1px; }
  .corner-tr { top: 6px; right: 6px; border-width: 1px 1px 0 0; }
  .corner-bl { bottom: 6px; left: 6px; border-width: 0 0 1px 1px; }
  .corner-br { bottom: 6px; right: 6px; border-width: 0 1px 1px 0; }

  .data-stream {
    animation: data-scroll 12s linear infinite;
  }
`;

// ── Utility components ────────────────────────────────────────────
function Corner() {
  return (
    <>
      <span className="corner-decoration corner-tl" />
      <span className="corner-decoration corner-tr" />
      <span className="corner-decoration corner-bl" />
      <span className="corner-decoration corner-br" />
    </>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={s({ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 })}>
      <span className="section-header">{children}</span>
      {right && <span style={s({ fontSize:10, color:C.textDim, fontFamily:"'Share Tech Mono',monospace" })}>{right}</span>}
    </div>
  );
}

function StatusDot({ color = C.green, pulse = true }) {
  return (
    <span style={s({
      display:"inline-block", width:6, height:6, borderRadius:"50%",
      background: color,
      boxShadow: pulse ? `0 0 6px ${color}` : "none",
    })} />
  );
}

// ── Clock widget ──────────────────────────────────────────────────
function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = now.getHours().toString().padStart(2,"0");
  const mm = now.getMinutes().toString().padStart(2,"0");
  const ss = now.getSeconds().toString().padStart(2,"0");
  const date = now.toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric", year:"numeric" });

  return (
    <div style={s({ textAlign:"center" })}>
      <div className="hud-font" style={s({ fontSize:42, fontWeight:700, letterSpacing:4, color:C.white, lineHeight:1 })}>
        {hh}<span className="cursor-blink" style={s({ color:C.cyan })}>:</span>{mm}
        <span style={s({ fontSize:24, color:C.cyanDim, marginLeft:4 })}>.{ss}</span>
      </div>
      <div className="mono-font" style={s({ fontSize:11, color:C.textDim, marginTop:4, letterSpacing:1 })}>{date.toUpperCase()}</div>
    </div>
  );
}

// ── Central Orb ───────────────────────────────────────────────────
function CentralOrb({ mode = "idle", onClick }) {
  const ringClass = mode === "listen" ? "ring-listen" : "ring";
  const orbClass  = `orb-${mode}`;
  const color     = mode === "listen" ? C.green : C.cyan;

  return (
    <div onClick={onClick} style={s({ position:"relative", width:160, height:160, cursor:"pointer", flexShrink:0 })}>
      {/* Outer rings */}
      <div className={`${ringClass}-3`} style={s({
        position:"absolute", inset:-40,
        borderRadius:"50%", border:`1px solid ${color}18`,
      })} />
      <div className={`${ringClass}-2`} style={s({
        position:"absolute", inset:-20,
        borderRadius:"50%", border:`1px solid ${color}30`,
      })} />
      <div className={`${ringClass}-1`} style={s({
        position:"absolute", inset:-8,
        borderRadius:"50%", border:`1px solid ${color}50`,
      })} />
      {/* Core orb */}
      <div className={orbClass} style={s({
        position:"absolute", inset:0,
        borderRadius:"50%",
        background: `radial-gradient(circle at 35% 35%, ${color}30, ${color}08 60%, transparent)`,
        border: `1.5px solid ${color}80`,
        display:"flex", alignItems:"center", justifyContent:"center",
        backdropFilter:"blur(4px)",
      })}>
        {/* Inner detail */}
        <div style={s({
          width:60, height:60, borderRadius:"50%",
          border: `1px solid ${color}40`,
          display:"flex", alignItems:"center", justifyContent:"center",
        })}>
          <div style={s({
            width:24, height:24, borderRadius:"50%",
            background: `radial-gradient(circle, ${color}80, ${color}20)`,
            boxShadow: `0 0 12px ${color}`,
          })} />
        </div>
      </div>
      {/* Mode label */}
      <div className="hud-font" style={s({
        position:"absolute", bottom:-26, left:"50%", transform:"translateX(-50%)",
        fontSize:10, letterSpacing:3, color: color, whiteSpace:"nowrap",
        textTransform:"uppercase",
      })}>
        {mode === "idle" ? "STANDBY" : mode === "listen" ? "LISTENING" : mode === "think" ? "PROCESSING" : "SPEAKING"}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={s({ display:"flex", gap:4, alignItems:"center", padding:"10px 14px" })}>
      {[0,1,2].map(i => (
        <div key={i} className="typing-dot" style={s({
          width:6, height:6, borderRadius:"50%",
          background: C.cyan, opacity:0.2,
          animationDelay: `${i * 0.2}s`,
        })} />
      ))}
    </div>
  );
}

// ── Chat message ──────────────────────────────────────────────────
function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className="fade-in-up" style={s({
      display:"flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap:10, marginBottom:16, alignItems:"flex-start",
    })}>
      {/* Avatar */}
      <div style={s({
        width:28, height:28, borderRadius:"50%", flexShrink:0,
        background: isUser ? `${C.cyan}20` : `${C.green}20`,
        border: `1px solid ${isUser ? C.cyan : C.green}40`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:10, fontWeight:700, fontFamily:"'Rajdhani',sans-serif",
        color: isUser ? C.cyan : C.green,
      })}>
        {isUser ? "YOU" : "J"}
      </div>
      {/* Bubble */}
      <div style={s({
        maxWidth:"75%",
        background: isUser ? `${C.cyan}10` : `${C.panel}`,
        border: `1px solid ${isUser ? C.cyan : C.border}30`,
        borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
        padding:"10px 14px",
        fontSize:13.5, lineHeight:1.6, color:C.text,
      })}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Stat cards data ───────────────────────────────────────────────
const STATS = [
  { label:"NEURAL LINK",  value:"ACTIVE",  unit:"",    color:C.green,  icon:"◈" },
  { label:"RESPONSE",     value:"142",     unit:"ms",  color:C.cyan,   icon:"⚡" },
  { label:"UPTIME",       value:"99.9",    unit:"%",   color:C.green,  icon:"◉" },
  { label:"MEMORY",       value:"2.4",     unit:"GB",  color:C.amber,  icon:"▣" },
];

// ── Data stream lines ─────────────────────────────────────────────
const STREAM_LINES = [
  "SYS.INIT → NEURAL CORE LOADED",
  "AUTH.TOKEN → VERIFIED [SHA-256]",
  "API.CLAUDE → CONNECTED",
  "MEM.STORE → 847 CONTEXTS LOADED",
  "VOICE.ENGINE → READY",
  "TASK.SCHEDULER → 3 PENDING",
  "NET.LATENCY → 12ms",
  "GPU.TEMP → 61°C",
  "MODEL → claude-sonnet-4-6",
  "REGION → MUSCAT / GST+4",
  "PROC.THREADS → 16 ACTIVE",
  "CACHE.HIT → 94.2%",
];

// ── Navigation items ──────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"chat",     icon:"◈", label:"NEURAL CHAT" },
  { id:"status",   icon:"◉", label:"SYSTEMS"     },
  { id:"tasks",    icon:"▦", label:"DIRECTIVES"  },
  { id:"settings", icon:"⚙", label:"CONFIG"      },
];

// ── Tasks panel ───────────────────────────────────────────────────
const INITIAL_TASKS = [
  { id:1, text:"Review Oman Air People & Culture deck",    done:false, priority:"HIGH"   },
  { id:2, text:"Follow up with Ahmed on OD initiatives",   done:false, priority:"HIGH"   },
  { id:3, text:"WAHDA transformation phase 2 planning",    done:false, priority:"MED"    },
  { id:4, text:"Update shift pattern standardization doc", done:true,  priority:"LOW"    },
  { id:5, text:"Lerax AI assistant — add new tools",       done:false, priority:"MED"    },
];

function TasksPanel() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [input, setInput] = useState("");

  const toggle = (id) => setTasks(t => t.map(x => x.id === id ? {...x, done:!x.done} : x));
  const add = () => {
    if (!input.trim()) return;
    setTasks(t => [...t, { id: Date.now(), text:input.trim(), done:false, priority:"MED" }]);
    setInput("");
  };

  const pColor = { HIGH:C.red, MED:C.amber, LOW:C.cyanDim };

  return (
    <div style={s({ height:"100%", display:"flex", flexDirection:"column", gap:12 })}>
      <SectionLabel right={`${tasks.filter(x=>!x.done).length} ACTIVE`}>DIRECTIVES</SectionLabel>

      {/* Add task */}
      <div style={s({ display:"flex", gap:8 })}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="New directive..."
          style={s({
            flex:1, background:C.panel, border:`1px solid ${C.border}`,
            borderRadius:6, padding:"8px 12px", color:C.text,
            fontFamily:"'Inter',sans-serif", fontSize:13, outline:"none",
          })}
        />
        <button onClick={add} className="send-btn">ADD</button>
      </div>

      {/* Task list */}
      <div style={s({ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 })}>
        {tasks.map(task => (
          <div key={task.id} onClick={() => toggle(task.id)} style={s({
            display:"flex", alignItems:"center", gap:10,
            background: task.done ? `${C.panel}80` : C.panel,
            border: `1px solid ${task.done ? C.border : C.borderBright}`,
            borderRadius:8, padding:"10px 14px", cursor:"pointer",
            opacity: task.done ? 0.5 : 1, transition:"all 0.2s",
          })}>
            <div style={s({
              width:16, height:16, borderRadius:3, flexShrink:0,
              border: `1.5px solid ${task.done ? C.green : C.textDim}`,
              background: task.done ? C.green : "transparent",
              display:"flex", alignItems:"center", justifyContent:"center",
            })}>
              {task.done && <span style={s({ fontSize:10, color:C.bg, lineHeight:1 })}>✓</span>}
            </div>
            <span style={s({ flex:1, fontSize:13, textDecoration: task.done ? "line-through" : "none", color: task.done ? C.textDim : C.text })}>
              {task.text}
            </span>
            <span style={s({ fontSize:9, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:1, color:pColor[task.priority] })}>
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Systems panel ─────────────────────────────────────────────────
function SystemsPanel() {
  const [metrics, setMetrics] = useState({ cpu:34, ram:62, net:18, temp:61 });

  useEffect(() => {
    const t = setInterval(() => {
      setMetrics(m => ({
        cpu:  Math.min(95, Math.max(10, m.cpu  + (Math.random()-0.5)*8)),
        ram:  Math.min(90, Math.max(40, m.ram  + (Math.random()-0.5)*4)),
        net:  Math.min(80, Math.max(5,  m.net  + (Math.random()-0.5)*12)),
        temp: Math.min(85, Math.max(50, m.temp + (Math.random()-0.5)*3)),
      }));
    }, 1800);
    return () => clearInterval(t);
  }, []);

  const bars = [
    { label:"CPU",  value:metrics.cpu,  unit:"%",  color:C.cyan  },
    { label:"RAM",  value:metrics.ram,  unit:"%",  color:C.amber },
    { label:"NET",  value:metrics.net,  unit:"Mb", color:C.green },
    { label:"TEMP", value:metrics.temp, unit:"°C", color: metrics.temp > 75 ? C.red : C.cyanDim },
  ];

  return (
    <div style={s({ display:"flex", flexDirection:"column", gap:14 })}>
      <SectionLabel right="LIVE">SYSTEM VITALS</SectionLabel>
      {bars.map(b => (
        <div key={b.label}>
          <div style={s({ display:"flex", justifyContent:"space-between", marginBottom:5 })}>
            <span className="mono-font" style={s({ fontSize:11, color:C.textDim })}>{b.label}</span>
            <span className="mono-font" style={s({ fontSize:11, color:b.color })}>
              {Math.round(b.value)}{b.unit}
            </span>
          </div>
          <div style={s({ height:4, background:C.border, borderRadius:2, overflow:"hidden" })}>
            <div style={s({
              height:"100%", borderRadius:2,
              width:`${(b.value / (b.label==="TEMP" ? 100 : b.label==="NET" ? 80 : 100)) * 100}%`,
              background: `linear-gradient(90deg, ${b.color}80, ${b.color})`,
              boxShadow: `0 0 6px ${b.color}60`,
              transition:"width 1s ease",
            })} />
          </div>
        </div>
      ))}

      <div style={s({ marginTop:8 })}>
        <SectionLabel>ACTIVE MODULES</SectionLabel>
        {[
          { name:"Claude API",      status:"ONLINE", color:C.green },
          { name:"Voice Engine",    status:"READY",  color:C.cyan  },
          { name:"Memory Store",    status:"ONLINE", color:C.green },
          { name:"Task Scheduler",  status:"ONLINE", color:C.green },
          { name:"Google Calendar", status:"LINKED", color:C.cyan  },
        ].map(m => (
          <div key={m.name} style={s({ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}` })}>
            <span style={s({ fontSize:12, color:C.text })}>{m.name}</span>
            <div style={s({ display:"flex", alignItems:"center", gap:6 })}>
              <StatusDot color={m.color} />
              <span className="mono-font" style={s({ fontSize:10, color:m.color })}>{m.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────
function SettingsPanel() {
  const [name, setName] = useState("LERAX");
  const [voice, setVoice] = useState("JARVIS-MALE");
  const [wake, setWake] = useState("Hey Jarvis");

  return (
    <div style={s({ display:"flex", flexDirection:"column", gap:20 })}>
      <SectionLabel>CONFIGURATION</SectionLabel>

      {[
        { label:"ASSISTANT NAME", value:name,  set:setName,  placeholder:"e.g. JARVIS" },
        { label:"VOICE PROFILE",  value:voice, set:setVoice, placeholder:"e.g. JARVIS-MALE" },
        { label:"WAKE WORD",      value:wake,  set:setWake,  placeholder:"e.g. Hey Jarvis" },
      ].map(f => (
        <div key={f.label}>
          <div className="section-header" style={s({ marginBottom:6, fontSize:10 })}>{f.label}</div>
          <input
            value={f.value}
            onChange={e => f.set(e.target.value)}
            placeholder={f.placeholder}
            style={s({
              width:"100%", background:C.panel, border:`1px solid ${C.border}`,
              borderRadius:6, padding:"9px 12px", color:C.text,
              fontFamily:"'Share Tech Mono',monospace", fontSize:13, outline:"none",
            })}
          />
        </div>
      ))}

      <div style={s({ padding:"14px 0", borderTop:`1px solid ${C.border}` })}>
        <div className="section-header" style={s({ marginBottom:10 })}>INTEGRATIONS</div>
        {[
          { name:"ElevenLabs TTS", connected:false },
          { name:"Deepgram STT",   connected:false },
          { name:"Google Calendar",connected:true  },
        ].map(i => (
          <div key={i.name} style={s({ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0" })}>
            <span style={s({ fontSize:13, color:C.text })}>{i.name}</span>
            <div style={s({
              padding:"3px 10px", borderRadius:4,
              background: i.connected ? `${C.green}15` : `${C.amber}15`,
              border: `1px solid ${i.connected ? C.green : C.amber}40`,
              fontSize:10, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:1,
              color: i.connected ? C.green : C.amber,
            })}>
              {i.connected ? "LINKED" : "CONNECT"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function JarvisApp() {
  const [activeNav, setActiveNav] = useState("chat");
  const [orbMode, setOrbMode] = useState("idle"); // idle | listen | think | speak
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Good day. I am JARVIS — Just A Rather Very Intelligent System. All systems are online and ready. How may I assist you?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(m => [...m, { role:"user", content:text }]);
    setLoading(true);
    setOrbMode("think");

    try {
      const history = [...messages, { role:"user", content:text }];
      const res = await fetch("https://khalfan-production.up.railway.app/chat", {
        method:"POST",
        headers:{
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          system: `You are JARVIS, a sophisticated personal AI assistant with the voice and manner of the AI from the Iron Man films — calm, precise, slightly dry wit, highly capable. You assist your operator with tasks, questions, and executive work. The operator's name is Lerax. They work at Oman Air in People & Culture / HR & Organizational Development, reporting to CPO Kumail, with a key stakeholder named Ahmed. They are based in Muscat, Oman (GST+4). They have built a personal AI assistant (also named Lerax) using Anthropic SDK, Deepgram STT, ElevenLabs TTS, and Python. Keep responses concise and sharp. When appropriate, address them by name.`,
          messages: history.map(m => ({ role:m.role, content:m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "I'm afraid I encountered an error, sir.";
      setMessages(m => [...m, { role:"assistant", content:reply }]);
      setOrbMode("speak");
      setTimeout(() => setOrbMode("idle"), 2000);
    } catch {
      setMessages(m => [...m, { role:"assistant", content:"Connection to neural core interrupted. Please try again." }]);
      setOrbMode("idle");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListen = () => {
    setOrbMode(m => m === "listen" ? "idle" : "listen");
  };

  // Detect if running inside Electron
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* Outer wrapper — column flex so title bar sits above app */}
      <div style={s({ display:"flex", flexDirection:"column", height:"100vh", width:"100vw", overflow:"hidden", background:C.bg })}>

      {/* ── Custom Title Bar (Electron only) ── */}
      {isElectron && (
        <div style={s({
          height:32, flexShrink:0,
          background:`${C.panel}F0`,
          borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center",
          WebkitAppRegion:"drag",   // Makes the bar draggable
          userSelect:"none",
          zIndex:9999,
          paddingLeft:14,
        })}>
          {/* App label */}
          <span className="hud-font" style={s({ fontSize:11, letterSpacing:3, color:C.cyanDim })}>
            J.A.R.V.I.S  //  NEURAL INTERFACE
          </span>
          {/* Window controls */}
          <div style={s({ marginLeft:"auto", display:"flex", WebkitAppRegion:"no-drag" })}>
            {[
              { label:"─", action:"minimize", color:C.amber },
              { label:"□", action:"maximize", color:C.green },
              { label:"✕", action:"close",    color:C.red   },
            ].map(btn => (
              <button key={btn.action} onClick={() => window.electronAPI[btn.action]()} style={s({
                width:46, height:32, border:"none", background:"transparent",
                color:C.textDim, cursor:"pointer", fontSize:13,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.15s",
              })}
              onMouseEnter={e => { e.currentTarget.style.background = `${btn.color}20`; e.currentTarget.style.color = btn.color; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textDim; }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Root layout */}
      <div style={s({ display:"flex", flex:1, overflow:"hidden", position:"relative" })}>

        {/* Grid background */}
        <div className="grid-bg" style={s({ position:"absolute", inset:0, pointerEvents:"none" })} />

        {/* ── Left Nav ── */}
        <div style={s({
          width:200, flexShrink:0, display:"flex", flexDirection:"column",
          background:`${C.panel}CC`, borderRight:`1px solid ${C.border}`,
          backdropFilter:"blur(8px)", zIndex:10, position:"relative",
        })}>
          {/* Logo */}
          <div style={s({ padding:"20px 16px 14px", borderBottom:`1px solid ${C.border}` })}>
            <div className="hud-font" style={s({ fontSize:22, fontWeight:700, letterSpacing:4, color:C.white })}>
              J.A.R.V.I.S
            </div>
            <div className="mono-font" style={s({ fontSize:9, color:C.cyanDim, letterSpacing:2, marginTop:2 })}>
              NEURAL INTERFACE v2.6
            </div>
          </div>

          {/* Status strip */}
          <div style={s({ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderBottom:`1px solid ${C.border}` })}>
            <StatusDot color={C.green} />
            <span className="mono-font" style={s({ fontSize:10, color:C.green })}>ALL SYSTEMS GO</span>
          </div>

          {/* Nav items */}
          <nav style={s({ flex:1, padding:"8px 0" })}>
            {NAV_ITEMS.map(item => (
              <div
                key={item.id}
                className={`nav-item${activeNav===item.id?" active":""}`}
                onClick={() => setActiveNav(item.id)}
                style={s({ display:"flex", alignItems:"center", gap:10, padding:"11px 16px" })}
              >
                <span style={s({ fontSize:15, color: activeNav===item.id ? C.cyan : C.textDim })}>{item.icon}</span>
                <span className="hud-font" style={s({ fontSize:13, fontWeight:600, letterSpacing:1.5, color: activeNav===item.id ? C.cyan : C.textDim })}>
                  {item.label}
                </span>
              </div>
            ))}
          </nav>

          {/* Bottom data stream */}
          <div style={s({ height:140, overflow:"hidden", borderTop:`1px solid ${C.border}`, padding:"8px 0", position:"relative" })}>
            <div className="data-stream">
              {[...STREAM_LINES, ...STREAM_LINES].map((line, i) => (
                <div key={i} className="mono-font" style={s({ fontSize:9, color:C.textFaint, padding:"2px 12px", whiteSpace:"nowrap", overflow:"hidden" })}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Center Column ── */}
        <div style={s({ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative" })}>

          {/* Top bar */}
          <div style={s({
            height:52, display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"0 24px", borderBottom:`1px solid ${C.border}`,
            background:`${C.panel}80`, backdropFilter:"blur(8px)", flexShrink:0,
          })}>
            <ClockWidget />
            <div style={s({ display:"flex", gap:20 })}>
              {STATS.map(st => (
                <div key={st.label} style={s({ textAlign:"center" })}>
                  <div className="mono-font" style={s({ fontSize:9, color:C.textDim, letterSpacing:1 })}>{st.label}</div>
                  <div className="hud-font" style={s({ fontSize:14, fontWeight:700, color:st.color, lineHeight:1.2 })}>
                    {st.value}<span style={s({ fontSize:10, color:C.textDim })}>{st.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orb area */}
          <div style={s({
            display:"flex", justifyContent:"center", alignItems:"center",
            padding:"28px 0 22px", flexShrink:0, position:"relative",
          })}>
            <div className="scanline-overlay" style={s({ position:"relative" })}>
              <CentralOrb mode={orbMode} onClick={toggleListen} />
            </div>
          </div>

          {/* Chat area — only visible in chat mode */}
          {activeNav === "chat" && (
            <div style={s({
              flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
              margin:"0 16px 16px", background:`${C.panel}80`,
              border:`1px solid ${C.border}`, borderRadius:10, position:"relative",
              backdropFilter:"blur(4px)",
            })}>
              <Corner />

              {/* Messages */}
              <div style={s({ flex:1, overflowY:"auto", padding:"16px 16px 8px" })}>
                {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
                {loading && (
                  <div style={s({ display:"flex", gap:10, alignItems:"flex-start", marginBottom:16 })}>
                    <div style={s({
                      width:28, height:28, borderRadius:"50%",
                      background:`${C.green}20`, border:`1px solid ${C.green}40`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, fontWeight:700, fontFamily:"'Rajdhani',sans-serif", color:C.green,
                    })}>J</div>
                    <div style={s({
                      background:C.panel, border:`1px solid ${C.border}30`,
                      borderRadius:"4px 12px 12px 12px",
                    })}>
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={s({
                borderTop:`1px solid ${C.border}`, padding:"12px 14px",
                display:"flex", gap:10, alignItems:"flex-end",
              })}>
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Issue a directive…"
                  style={s({ maxHeight:80, overflowY:"auto" })}
                />
                <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
                  SEND
                </button>
              </div>
            </div>
          )}

          {/* Other panels */}
          {activeNav !== "chat" && (
            <div style={s({
              flex:1, overflow:"auto", margin:"0 16px 16px",
              background:`${C.panel}80`, border:`1px solid ${C.border}`,
              borderRadius:10, padding:20, backdropFilter:"blur(4px)", position:"relative",
            })}>
              <Corner />
              {activeNav === "tasks"    && <TasksPanel />}
              {activeNav === "status"   && <SystemsPanel />}
              {activeNav === "settings" && <SettingsPanel />}
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div style={s({
          width:220, flexShrink:0, display:"flex", flexDirection:"column", gap:0,
          background:`${C.panel}CC`, borderLeft:`1px solid ${C.border}`,
          backdropFilter:"blur(8px)", zIndex:10, overflow:"auto", padding:16,
        })}>
          <SectionLabel>OPERATOR</SectionLabel>
          {/* Profile */}
          <div style={s({
            background:C.panelAlt, border:`1px solid ${C.borderBright}`, borderRadius:8,
            padding:"14px 12px", marginBottom:16, position:"relative",
          })}>
            <Corner />
            <div style={s({ display:"flex", alignItems:"center", gap:10, marginBottom:10 })}>
              <div style={s({
                width:38, height:38, borderRadius:"50%",
                background:`linear-gradient(135deg, ${C.cyan}30, ${C.green}20)`,
                border:`1.5px solid ${C.cyan}60`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Rajdhani',sans-serif", fontSize:14, fontWeight:700, color:C.cyan,
              })}>LX</div>
              <div>
                <div className="hud-font" style={s({ fontSize:14, fontWeight:700, color:C.white, letterSpacing:1 })}>LERAX</div>
                <div style={s({ fontSize:10, color:C.textDim })}>People & Culture</div>
              </div>
            </div>
            <div style={s({ fontSize:11, color:C.textDim, lineHeight:1.5 })}>Oman Air · Muscat</div>
            <div style={s({ fontSize:11, color:C.textDim })}>GST +4:00</div>
          </div>

          {/* Quick actions */}
          <SectionLabel>QUICK OPS</SectionLabel>
          <div style={s({ display:"flex", flexDirection:"column", gap:6, marginBottom:16 })}>
            {[
              { label:"New Directive", icon:"+" },
              { label:"Voice Mode",    icon:"◎" },
              { label:"Daily Brief",   icon:"▤" },
              { label:"Clear Chat",    icon:"✕" },
            ].map(a => (
              <button key={a.label} onClick={() => {
                if (a.label === "Clear Chat") setMessages([{ role:"assistant", content:"Memory cleared. Ready for new directives." }]);
                if (a.label === "Voice Mode") toggleListen();
                if (a.label === "New Directive") setActiveNav("tasks");
                if (a.label === "Daily Brief") {
                  setActiveNav("chat");
                  setInput("Give me a sharp daily brief — priorities for today based on what you know about my work at Oman Air.");
                }
              }} style={s({
                display:"flex", alignItems:"center", gap:8,
                background:"transparent", border:`1px solid ${C.border}`,
                borderRadius:6, padding:"8px 10px", cursor:"pointer",
                color:C.text, fontFamily:"'Rajdhani',sans-serif",
                fontSize:12, fontWeight:600, letterSpacing:1,
                textAlign:"left", transition:"all 0.2s",
              })}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.cyan; e.currentTarget.style.color = C.cyan; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
              >
                <span style={s({ color:C.cyan, fontSize:14 })}>{a.icon}</span>
                {a.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Recent log */}
          <SectionLabel right="TODAY">ACTIVITY LOG</SectionLabel>
          <div style={s({ flex:1 })}>
            {[
              { time:"09:14", event:"System initialized" },
              { time:"09:15", event:"Neural link established" },
              { time:"09:16", event:"Claude API connected" },
              { time:"09:18", event:"Operator authenticated" },
            ].map((log, i) => (
              <div key={i} style={s({ display:"flex", gap:8, padding:"5px 0", borderBottom:`1px solid ${C.border}` })}>
                <span className="mono-font" style={s({ fontSize:9, color:C.cyan, flexShrink:0, marginTop:1 })}>{log.time}</span>
                <span style={s({ fontSize:11, color:C.textDim, lineHeight:1.4 })}>{log.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>   {/* end inner flex row */}
      </div>   {/* end outer column wrapper */}
    </>
  );
}
