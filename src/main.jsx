
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { EXTRACTS, SECURES } from "./crises";
import { CHARACTERS } from "./characters";
import "./styles.css";

import slowToken from "./assets/tokens/slow.png";
import shockToken from "./assets/tokens/shock.png";
import stunToken from "./assets/tokens/stun.png";
import bleedToken from "./assets/tokens/bleed.png";
import judgmentToken from "./assets/tokens/judgment.png";
import poisonToken from "./assets/tokens/poison.png";
import staggerToken from "./assets/tokens/stagger.png";
import rootToken from "./assets/tokens/root.png";
import incinerateToken from "./assets/tokens/incinerate.png";
import hexToken from "./assets/tokens/hex.png";
import activatedToken from "./assets/tokens/activated.png";
import dazedToken from "./assets/tokens/dazed.png";
import extractToken from "./assets/tokens/extract.png";

const CONDITION_TOKENS = [
  { id: "slow", label: "Slow", src: slowToken },
  { id: "shock", label: "Shock", src: shockToken },
  { id: "stun", label: "Stun", src: stunToken },
  { id: "bleed", label: "Bleed", src: bleedToken },
  { id: "judgment", label: "Judgment", src: judgmentToken },
  { id: "poison", label: "Poison", src: poisonToken },
  { id: "stagger", label: "Stagger", src: staggerToken },
  { id: "root", label: "Root", src: rootToken },
  { id: "incinerate", label: "Incinerate", src: incinerateToken },
  { id: "hex", label: "Hex", src: hexToken },
  { id: "activated", label: "Activated", src: activatedToken },
  { id: "dazed", label: "Dazed", src: dazedToken }
];
const CONDITION_BY_ID = Object.fromEntries(CONDITION_TOKENS.map(token => [token.id, token]));

const STORAGE_KEY = "mcp-stream-state-v3";

const DEFAULT_STATE = {
  playerOne: { name: "Jayden", faction: "Avengers", vp: 0, roster: [], tactics: ["", "", "", "", ""], tacticsUsed: [false, false, false, false, false] },
  playerTwo: { name: "Mike", faction: "X-Men", vp: 0, roster: [], tactics: ["", "", "", "", ""], tacticsUsed: [false, false, false, false, false] },
  round: 1, threat: 17,
  secure: "Gamma Wave Sweeps Across Midwest",
  extract: "Skrulls Infiltrate World Leadership",
  rosterScale: 100,
  tacticsScale: 100
};

function normalizeCharacter(character) {
  return {
    ...character,
    conditions: Array.isArray(character?.conditions) ? character.conditions.filter(id => CONDITION_BY_ID[id]) : [],
    hasExtract: Boolean(character?.hasExtract)
  };
}

function mergeState(saved) {
  return {
    ...DEFAULT_STATE, ...saved,
    playerOne: { ...DEFAULT_STATE.playerOne, ...(saved?.playerOne ?? {}), roster: (saved?.playerOne?.roster ?? []).map(normalizeCharacter), tactics: saved?.playerOne?.tactics ?? DEFAULT_STATE.playerOne.tactics, tacticsUsed: saved?.playerOne?.tacticsUsed ?? DEFAULT_STATE.playerOne.tacticsUsed },
    playerTwo: { ...DEFAULT_STATE.playerTwo, ...(saved?.playerTwo ?? {}), roster: (saved?.playerTwo?.roster ?? []).map(normalizeCharacter), tactics: saved?.playerTwo?.tactics ?? DEFAULT_STATE.playerTwo.tactics, tacticsUsed: saved?.playerTwo?.tacticsUsed ?? DEFAULT_STATE.playerTwo.tacticsUsed }
  };
}
function loadState() {
  try { return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")); }
  catch { return DEFAULT_STATE; }
}
async function publishState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  try {
    await fetch("/mcp-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      cache: "no-store"
    });
  } catch {
    // Keep the local saved copy even if the relay is temporarily unavailable.
  }
}
function useSharedState() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    const events = new EventSource("/mcp-events");

    events.onmessage = event => {
      try {
        const next = mergeState(JSON.parse(event.data));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setState(next);
      } catch {}
    };

    return () => events.close();
  }, []);

  const update = updater => setState(current => {
    const next = typeof updater === "function" ? updater(current) : updater;
    publishState(next);
    return next;
  });

  return [state, update];
}
const clamp = n => Math.max(0, Number(n) || 0);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function shortenCrisis(name) {
  const map = {
    "Gamma Wave Sweeps Across Midwest": "Gamma Shelters",
    "Skrulls Infiltrate World Leadership": "Skrulls",
    "Infinity Formula Goes Missing!": "Infinity Formula"
  };
  return map[name] ?? name;
}

function VPBadge({ side, value }) {
  return <div className={`vp-badge ${side}`}><strong>{value}</strong><span>VP</span></div>;
}
function PlayerSide({ side, player }) {
  return <section className={`overlay-player ${side}`}>
    <div className="player-copy"><div className="overlay-player-name">{player.name || "Player"}</div>
    <div className="overlay-faction">{player.faction || "Faction"}</div></div>
    <VPBadge side={side} value={player.vp}/>
  </section>;
}
function TokenImage({ token, className = "", title }) {
  return <img className={`token-image ${className}`} src={token.src} alt={title ?? token.label} title={title ?? token.label}/>;
}

function CharacterOverlayRow({ character, side }) {
  const sideState = character.sideState ?? (character.status === "injured" ? "dazed" : "healthy");
  const overlayState = character.overlayState ?? (character.status === "ko" ? "ko" : character.status === "injured" ? "dazed" : "none");
  const selected = new Set(character.conditions ?? []);
  const regularConditions = CONDITION_TOKENS.filter(token => token.id !== "activated" && selected.has(token.id));
  const activated = selected.has("activated");
  const hasTokens = regularConditions.length > 0 || Boolean(character.hasExtract) || activated;

  return <div className={`character-overlay-item ${side} ${hasTokens ? "has-tokens" : ""}`}>
    <div className={`character-overlay-row ${side} ${sideState} overlay-${overlayState}`}>
      <div className="character-row-main">
        <span className="character-overlay-name">{character.name}</span>
        <span className="overlay-health">♥ {character.health}/{character.maxHealth}</span>
        <span className="overlay-power">⚡ {character.power}</span>
      </div>

      {overlayState === "dazed" && <div className="comic-stamp dazed">DAZED!</div>}
      {overlayState === "ko" && <div className="comic-stamp ko"><span>☠</span><b>K.O.!</b><span>☠</span></div>}
    </div>

    {hasTokens && <div className={`character-overlay-token-row ${side}`}>
      <div className="overlay-condition-tokens">
        {regularConditions.map(token => <TokenImage key={token.id} token={token}/>) }
      </div>
      <div className="overlay-objective-tokens">
        {character.hasExtract && <TokenImage token={{ src: extractToken, label: "Extract" }} className="extract-token"/>}
        {activated && <TokenImage token={CONDITION_BY_ID.activated} className="activated-token"/>}
      </div>
    </div>}
  </div>;
}
function RosterRail({ side, roster }) {
  return <aside className={`roster-rail ${side}`}>
    {roster.map(c => <CharacterOverlayRow key={c.id} character={c} side={side}/>)}
  </aside>;
}

function TeamTacticsRail({ side, tactics = [], tacticsUsed = [] }) {
  const visibleTactics = tactics.map((name, index) => ({ name: name.trim(), used: Boolean(tacticsUsed[index]), index })).filter(card => card.name);
  if (!visibleTactics.length) return null;

  return <aside className={`team-tactics-rail ${side}`}>
    <div className="team-tactics-title">TEAM TACTICS</div>
    {visibleTactics.map(card =>
      <div className={`team-tactic-name ${card.used ? "used" : ""}`} key={`${card.name}-${card.index}`}>{card.name}</div>
    )}
  </aside>;
}

function Overlay({ preview=false }) {
  const [state] = useSharedState();
  const rosterScale = Math.min(150, Math.max(50, Number(state.rosterScale) || 100));
  const tacticsScale = Math.min(150, Math.max(50, Number(state.tacticsScale) || 100));
  return <main className={preview ? "preview-canvas" : "overlay-page"} style={{ "--roster-scale": rosterScale / 100, "--tactics-scale": tacticsScale / 100 }}>
    <div className="hud">
      <PlayerSide side="blue" player={state.playerOne}/>
      <section className="hud-center">
        <div className="center-top"><span>ROUND</span><strong>{state.round}</strong><i/><span>THREAT</span><strong>{state.threat}</strong></div>
        <div className="center-bottom"><div><b>S:</b> {shortenCrisis(state.secure)}</div><i/><div><b>E:</b> {shortenCrisis(state.extract)}</div></div>
      </section>
      <PlayerSide side="red" player={state.playerTwo}/>
    </div>
    <RosterRail side="blue" roster={state.playerOne.roster}/>
    <RosterRail side="red" roster={state.playerTwo.roster}/>
    <TeamTacticsRail side="blue" tactics={state.playerOne.tactics} tacticsUsed={state.playerOne.tacticsUsed}/>
    <TeamTacticsRail side="red" tactics={state.playerTwo.tactics} tacticsUsed={state.playerTwo.tacticsUsed}/>
  </main>;
}
function Stepper({ value, onMinus, onPlus, min=0, accent="orange", compact=false }) {
  return <div className={`stepper ${accent} ${compact ? "compact":""}`}>
    <button onClick={onMinus} disabled={value<=min}>−</button><output>{value}</output><button onClick={onPlus}>+</button>
  </div>;
}
function AddCharacter({ side, onAdd }) {
  const [open,setOpen]=useState(false), [query,setQuery]=useState(""), [health,setHealth]=useState(5), [power,setPower]=useState(1);
  const matches = useMemo(() => {
    const q=query.trim().toLowerCase();
    if (!q) return CHARACTERS.slice(0,8);
    return CHARACTERS.filter(n=>n.toLowerCase().includes(q)).slice(0,10);
  },[query]);
  const choose = name => { setQuery(name); };
  const add = () => {
    const name=query.trim(); if(!name) return;
    onAdd({id:uid(), name, maxHealth:clamp(health), health:clamp(health), power:clamp(power), sideState:"healthy", overlayState:"none", conditions:[], hasExtract:false});
    setOpen(false); setQuery(""); setHealth(5); setPower(1);
  };
  return <>
    <button className={`add-character ${side}`} onClick={()=>setOpen(true)}>＋ ADD CHARACTER</button>
    {open && <div className="modal-backdrop" onMouseDown={()=>setOpen(false)}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()}>
        <h2>Add Character — {side==="blue" ? "Player 1":"Player 2"}</h2>
        <label>Search or type a custom name<input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Start typing a character name..."/></label>
        <div className="search-results">
          {matches.map(name=><button key={name} onClick={()=>choose(name)}>{name}</button>)}
        </div>
        <div className="starting-values">
          <label>Starting Health<input type="number" min="0" value={health} onChange={e=>setHealth(e.target.value)}/></label>
          <label>Starting Power<input type="number" min="0" value={power} onChange={e=>setPower(e.target.value)}/></label>
        </div>
        <div className="modal-actions"><button onClick={()=>setOpen(false)}>CANCEL</button><button className={side} onClick={add}>ADD TO ROSTER</button></div>
      </div>
    </div>}
  </>;
}

function CharacterControl({ character, side, onChange, onRemove }) {
  const sideState = character.sideState ?? (character.status === "injured" ? "dazed" : "healthy");
  const overlayState = character.overlayState ?? (character.status === "ko" ? "ko" : character.status === "injured" ? "dazed" : "none");
  const set = patch => onChange({ ...character, sideState, overlayState, ...patch });

  const toggleSideState = () => {
    set({ sideState: sideState === "healthy" ? "dazed" : "healthy" });
  };

  const cycleOverlayState = () => {
    const next = overlayState === "none" ? "dazed" : overlayState === "dazed" ? "ko" : "none";
    set({ overlayState: next });
  };

  const overlayLabel = overlayState === "none"
    ? "—"
    : overlayState === "dazed"
      ? "DAZED!"
      : "☠ K.O.!";

  const selectedConditions = new Set(character.conditions ?? []);
  const toggleCondition = id => {
    const next = new Set(selectedConditions);
    next.has(id) ? next.delete(id) : next.add(id);
    set({ conditions: [...next] });
  };

  return <div className={`character-control-card compact-card ${side} ${sideState} overlay-${overlayState}`}>
    <div className="compact-name">
      <strong>{character.name}</strong>
    </div>

    <div className="compact-stat max-stat">
      <span>♥ MAX</span>
      <Stepper compact accent="red" value={character.maxHealth}
        onMinus={() => set({ maxHealth: clamp(character.maxHealth - 1) })}
        onPlus={() => set({ maxHealth: character.maxHealth + 1 })}/>
    </div>

    <div className="compact-stat health-stat">
      <span>♥ HEALTH</span>
      <Stepper compact accent="red" value={character.health}
        onMinus={() => set({ health: clamp(character.health - 1) })}
        onPlus={() => set({ health: character.health + 1 })}/>
    </div>

    <div className="compact-stat power-stat">
      <span>⚡ POWER</span>
      <Stepper compact accent="green" value={character.power}
        onMinus={() => set({ power: clamp(character.power - 1) })}
        onPlus={() => set({ power: character.power + 1 })}/>
    </div>

    <button className={`compact-status side-toggle ${sideState}`} onClick={toggleSideState}>
      {sideState === "healthy" ? "HEALTHY" : "DAZED"}
    </button>

    <button className={`compact-icon overlay-toggle ${overlayState}`} onClick={cycleOverlayState}>
      {overlayLabel}
    </button>

    <button className="compact-remove" onClick={onRemove}>×</button>

    <div className="character-token-controls">
      <div className="condition-token-buttons" aria-label={`${character.name} conditions`}>
        {CONDITION_TOKENS.map(token =>
          <button
            type="button"
            key={token.id}
            className={`token-toggle ${selectedConditions.has(token.id) ? "enabled" : ""}`}
            title={token.label}
            aria-label={`${selectedConditions.has(token.id) ? "Disable" : "Enable"} ${token.label}`}
            aria-pressed={selectedConditions.has(token.id)}
            onClick={() => toggleCondition(token.id)}
          >
            <TokenImage token={token}/>
          </button>
        )}
      </div>
      <button
        type="button"
        className={`token-toggle extract-toggle ${character.hasExtract ? "enabled" : ""}`}
        title="Extract"
        aria-label={`${character.hasExtract ? "Disable" : "Enable"} Extract`}
        aria-pressed={Boolean(character.hasExtract)}
        onClick={() => set({ hasExtract: !character.hasExtract })}
      >
        <TokenImage token={{ src: extractToken, label: "Extract" }}/>
      </button>
    </div>
  </div>;
}
function PlayerControls({ number, side, player, onChange }) {
  const updateRoster=(id,next)=>onChange({...player,roster:player.roster.map(c=>c.id===id?next:c)});
  const remove=id=>onChange({...player,roster:player.roster.filter(c=>c.id!==id)});
  const add=c=>onChange({...player,roster:[...player.roster,c]});
  return <section className="player-control">
    <h3 className={side}>PLAYER {number} ({side.toUpperCase()})</h3>
    <div className="field-row">
      <label>Name<input value={player.name} onChange={e=>onChange({...player,name:e.target.value})}/></label>
      <label>Faction<input value={player.faction} onChange={e=>onChange({...player,faction:e.target.value})}/></label>
    </div>
    <div className="roster-control-heading"><strong>ROSTER</strong><span>{player.roster.length}/10</span></div>
    <div className="character-control-list">
      {player.roster.map(c=><CharacterControl key={c.id} character={c} side={side} onChange={n=>updateRoster(c.id,n)} onRemove={()=>remove(c.id)}/>)}
    </div>
    {player.roster.length<10 && <AddCharacter side={side} onAdd={add}/>}
    <div className={`tactics-control ${side}`}>
      <div className="tactics-control-heading">
        <strong>TEAM TACTICS CARDS</strong>
        <span>Up to 5</span>
      </div>
      <div className="tactics-input-list">
        {(player.tactics ?? ["", "", "", "", ""]).map((name,index)=>
          <label key={index} className={(player.tacticsUsed ?? [false, false, false, false, false])[index] ? "used" : ""}>
            <span>{index+1}</span>
            <input
              value={name}
              onChange={e=>{
                const tactics=[...(player.tactics ?? ["", "", "", "", ""])];
                tactics[index]=e.target.value;
                onChange({...player,tactics});
              }}
              placeholder={`Team tactic card ${index+1}`}
            />
            <button
              type="button"
              className="tactic-used-button"
              disabled={!name.trim()}
              onClick={()=>{
                const tacticsUsed=[...(player.tacticsUsed ?? [false, false, false, false, false])];
                tacticsUsed[index]=!tacticsUsed[index];
                onChange({...player,tacticsUsed});
              }}
            >
              {(player.tacticsUsed ?? [false, false, false, false, false])[index] ? "UNDO" : "USED"}
            </button>
          </label>
        )}
      </div>
    </div>
  </section>;
}
function CrisisSelect({label,shortLabel,value,options,onChange,accent}) {
  return <label className="crisis-control"><span>{label} <b className={accent}>({shortLabel})</b></span>
    <select value={options.includes(value)?value:"Custom..."} onChange={e=>onChange(e.target.value==="Custom..."?"":e.target.value)}>
      {options.map(o=><option key={o}>{o}</option>)}
    </select>
    {(!options.includes(value)||value==="")&&<input placeholder={`Type custom ${label.toLowerCase()}`} value={value} onChange={e=>onChange(e.target.value)}/>}
  </label>;
}
function ControlPanel() {
  const [state,setState]=useSharedState();
  const overlayUrl=`${location.origin}/overlay`;
  const setField=(f,v)=>setState(s=>({...s,[f]:v}));
  const updatePlayer=(k,p)=>setState(s=>({...s,[k]:p}));
  const resetMatch=()=>setState(s=>({
    ...s,
    round:1,
    threat:17,
    playerOne:{...s.playerOne,vp:0,roster:[],tacticsUsed:[false,false,false,false,false]},
    playerTwo:{...s.playerTwo,vp:0,roster:[],tacticsUsed:[false,false,false,false,false]}
  }));

  return <main className="control-page compact-control-page">
    <header className="compact-app-header">
      <div>
        <h1>MCP STREAM CONTROL</h1>
        <p>All primary match controls on one screen.</p>
      </div>
      <div className="header-actions">
        <button onClick={resetMatch}>↻ RESET MATCH</button>
        <a href="/overlay" target="_blank">OPEN OVERLAY</a>
      </div>
    </header>

    <section className="match-control-strip panel">
      <div className="match-player-control blue-side">
        <label>PLAYER 1 VP</label>
        <Stepper compact accent="blue" value={state.playerOne.vp}
          onMinus={()=>updatePlayer("playerOne",{...state.playerOne,vp:clamp(state.playerOne.vp-1)})}
          onPlus={()=>updatePlayer("playerOne",{...state.playerOne,vp:state.playerOne.vp+1})}/>
      </div>

      <div className="round-control">
        <label>ROUND</label>
        <Stepper compact value={state.round} min={1}
          onMinus={()=>setField("round",Math.max(1,state.round-1))}
          onPlus={()=>setField("round",state.round+1)}/>
      </div>

      <div className="threat-control">
        <label>THREAT</label>
        <Stepper compact value={state.threat}
          onMinus={()=>setField("threat",clamp(state.threat-1))}
          onPlus={()=>setField("threat",state.threat+1)}/>
      </div>

      <div className="scale-control-stack">
        <div className="roster-scale-control">
          <label htmlFor="roster-scale">ROSTER SCALE</label>
          <input
            id="roster-scale"
            type="range"
            min="50"
            max="150"
            step="5"
            value={state.rosterScale ?? 100}
            onChange={e=>setField("rosterScale", Number(e.target.value))}
          />
          <output>{state.rosterScale ?? 100}%</output>
        </div>
        <div className="tactics-scale-control">
          <label htmlFor="tactics-scale">TACTICS SCALE</label>
          <input
            id="tactics-scale"
            type="range"
            min="50"
            max="150"
            step="5"
            value={state.tacticsScale ?? 100}
            onChange={e=>setField("tacticsScale", Number(e.target.value))}
          />
          <output>{state.tacticsScale ?? 100}%</output>
        </div>
      </div>

      <div className="match-player-control red-side">
        <label>PLAYER 2 VP</label>
        <Stepper compact accent="red" value={state.playerTwo.vp}
          onMinus={()=>updatePlayer("playerTwo",{...state.playerTwo,vp:clamp(state.playerTwo.vp-1)})}
          onPlus={()=>updatePlayer("playerTwo",{...state.playerTwo,vp:state.playerTwo.vp+1})}/>
      </div>
    </section>

    <div className="roster-dashboard compact-roster-dashboard">
      <section className="panel compact-player-panel">
        <PlayerControls number="1" side="blue" player={state.playerOne} onChange={p=>updatePlayer("playerOne",p)}/>
      </section>
      <section className="panel compact-player-panel">
        <PlayerControls number="2" side="red" player={state.playerTwo} onChange={p=>updatePlayer("playerTwo",p)}/>
      </section>
    </div>

    <section className="panel compact-bottom-strip">
      <CrisisSelect label="Secure Mission" shortLabel="S" value={state.secure} options={SECURES} accent="blue" onChange={v=>setField("secure",v)}/>
      <CrisisSelect label="Extract Mission" shortLabel="E" value={state.extract} options={EXTRACTS} accent="red" onChange={v=>setField("extract",v)}/>
      <div className="compact-obs">
        <span>OBS</span>
        <code>{overlayUrl}</code>
      </div>
    </section>
  </main>;
}
const IS_OVERLAY = location.pathname.toLowerCase().startsWith("/overlay");

document.documentElement.classList.toggle("overlay-mode", IS_OVERLAY);
document.documentElement.classList.toggle("control-mode", !IS_OVERLAY);
document.body.classList.toggle("overlay-mode", IS_OVERLAY);
document.body.classList.toggle("control-mode", !IS_OVERLAY);

if (IS_OVERLAY) {
  document.documentElement.style.setProperty("background", "transparent", "important");
  document.documentElement.style.setProperty("background-color", "rgba(0, 0, 0, 0)", "important");
  document.body.style.setProperty("background", "transparent", "important");
  document.body.style.setProperty("background-color", "rgba(0, 0, 0, 0)", "important");
}

function App(){return IS_OVERLAY?<Overlay/>:<ControlPanel/>}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
