import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownRight, ArrowUpRight, Beaker,
  Check, ChevronRight, CircleHelp, Droplets, Edit3, Flame, Footprints,
  HeartPulse, Home, LineChart, Menu, Moon, MoreHorizontal, Pencil, Plus,
  Ruler, Scale, Settings, Sparkles, Target, Trash2, TrendingDown, UserRound,
  Waves, X, Zap,
} from 'lucide-react';
import { Route, Switch } from 'wouter';

type Profile = {
  name: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  startDate: string;
};
type Measurement = {
  id: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  hipCm?: number;
  armCm?: number;
  bodyFatPct?: number;
  notes?: string;
};
type HabitState = { sleep: boolean; movement: boolean; nutrition: boolean; mood: boolean };
type DailyLog = { date: string; waterMl: number; habits: HabitState };
type View = 'overview' | 'progress' | 'habits' | 'profile';

const STORAGE = {
  profile: 'mylife-profile',
  measurements: 'mylife-measurements',
  logs: 'mylife-logs',
};
const today = () => new Date().toISOString().slice(0, 10);
const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
};
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  month: 'short', day: 'numeric', year: 'numeric',
}).format(new Date(`${value}T12:00:00`));
const shortDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  month: 'short', day: 'numeric',
}).format(new Date(`${value}T12:00:00`));
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const emptyHabits = (): HabitState => ({ sleep: false, movement: false, nutrition: false, mood: false });

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function App() {
  return <Switch><Route path="/" component={FitnessApp} /><Route component={FitnessApp} /></Switch>;
}

function FitnessApp() {
  const [profile, setProfile] = useState<Profile | null>(() => read<Profile | null>(STORAGE.profile, null));
  const [measurements, setMeasurements] = useState<Measurement[]>(() => read(STORAGE.measurements, []));
  const [logs, setLogs] = useState<Record<string, DailyLog>>(() => read(STORAGE.logs, {}));
  const [view, setView] = useState<View>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [dialog, setDialog] = useState<'profile' | 'measurement' | 'delete' | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [notice, setNotice] = useState('');

  const currentLog = logs[today()] ?? { date: today(), waterMl: 0, habits: emptyHabits() };
  const sortedMeasurements = useMemo(() => [...measurements].sort((a, b) => b.date.localeCompare(a.date)), [measurements]);
  const latest = sortedMeasurements[0];
  const previous = sortedMeasurements[1];
  const currentWeight = latest?.weightKg ?? profile?.currentWeightKg ?? 0;
  const bmi = profile && profile.heightCm ? currentWeight / ((profile.heightCm / 100) ** 2) : 0;
  const waterGoal = profile ? Math.round(Math.max(1500, currentWeight * 32) / 50) * 50 : 2000;
  const waterPercent = Math.min(100, Math.round((currentLog.waterMl / waterGoal) * 100));
  const goalTotal = profile ? Math.abs(profile.currentWeightKg - profile.goalWeightKg) : 0;
  const goalDone = profile ? Math.max(0, Math.abs(profile.currentWeightKg - currentWeight)) : 0;
  const goalPercent = goalTotal ? Math.min(100, Math.round((goalDone / goalTotal) * 100)) : 100;
  const habitDone = Object.values(currentLog.habits).filter(Boolean).length;

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  };
  const changeView = (next: View) => { setView(next); setMobileNav(false); };
  const updateLog = (patch: Partial<DailyLog>) => {
    const next = { ...currentLog, ...patch, date: today() };
    const nextLogs = { ...logs, [today()]: next };
    setLogs(nextLogs); save(STORAGE.logs, nextLogs);
  };
  const addWater = (amount: number) => { updateLog({ waterMl: Math.max(0, currentLog.waterMl + amount) }); flash(`${amount / 1000}L added to today`); };
  const resetWater = () => { updateLog({ waterMl: 0 }); flash('Water reset for today'); };
  const toggleHabit = (habit: keyof HabitState) => {
    updateLog({ habits: { ...currentLog.habits, [habit]: !currentLog.habits[habit] } });
  };
  const openNewMeasurement = () => { setEditingMeasurement(null); setDialog('measurement'); };
  const editMeasurement = (measurement: Measurement) => { setEditingMeasurement(measurement); setDialog('measurement'); };
  const removeMeasurement = () => {
    if (!editingMeasurement) return;
    const next = measurements.filter((item) => item.id !== editingMeasurement.id);
    setMeasurements(next); save(STORAGE.measurements, next); setDialog(null); setEditingMeasurement(null); flash('Medição removida');
  };
  const navItems: { id: View; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Visão geral', icon: Home },
    { id: 'progress', label: 'Evolução', icon: LineChart },
    { id: 'habits', label: 'Hábitos', icon: Sparkles },
    { id: 'profile', label: 'Meu perfil', icon: UserRound },
  ];

  return (
    <div className="app-grain min-h-[100dvh] bg-background text-foreground">
      <div className="flex min-h-[100dvh]">
        <aside className="hidden w-[248px] shrink-0 flex-col bg-sidebar px-5 py-6 text-sidebar-foreground md:flex">
          <Brand />
          <div className="mt-12 flex-1">
             <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-sidebar-foreground/45">Seu espaço</p>
            <nav className="space-y-1" aria-label="Main navigation">
              {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => changeView(item.id)} />)}
            </nav>
          </div>
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-4">
             <div className="mb-3 flex items-center gap-2 text-sidebar-primary"><CircleHelp size={15} /><span className="text-xs font-bold">Um ritmo mais leve</span></div>
             <p className="text-xs leading-relaxed text-sidebar-foreground/60">Pequenos passos também contam. Estes são seus dados, seu ritmo.</p>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-5">
            <div data-testid="avatar-user" className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary font-mono-app text-xs font-bold text-sidebar-primary-foreground">{profile ? initials(profile.name) : 'ML'}</div>
             <div className="min-w-0"><p data-testid="text-sidebar-name" className="truncate text-sm font-semibold">{profile?.name || 'Seu novo capítulo'}</p><p className="text-[11px] text-sidebar-foreground/50">Bem-estar pessoal</p></div>
             <button data-testid="button-sidebar-settings" onClick={() => changeView('profile')} className="ml-auto text-sidebar-foreground/50 transition hover:text-sidebar-primary" aria-label="Abrir configurações do perfil"><Settings size={16} /></button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-12">
            <button data-testid="button-mobile-menu" onClick={() => setMobileNav(!mobileNav)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label="Toggle navigation"><Menu size={21} /></button>
            <div className="hidden text-xs font-semibold tracking-wide text-muted-foreground md:block">{view === 'overview' ? 'Um momento para você' : navItems.find((item) => item.id === view)?.label}</div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex"><span className="size-2 rounded-full bg-chart-2" /> Salvo localmente</div>
              <button data-testid="button-header-profile" onClick={() => changeView('profile')} className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm" aria-label="Abrir meu perfil">{profile ? initials(profile.name) : <UserRound size={16} />}</button>
            </div>
          </header>
          {mobileNav && <div className="absolute inset-x-0 top-[76px] z-20 border-b border-border bg-sidebar p-4 text-sidebar-foreground shadow-lg md:hidden">
            <Brand compact />
            <nav className="mt-5 grid grid-cols-2 gap-2">{navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => changeView(item.id)} />)}</nav>
          </div>}
          <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
            {!profile ? <Onboarding onStart={() => setDialog('profile')} /> : (
              <>
                {view === 'overview' && <Overview profile={profile} currentWeight={currentWeight} bmi={bmi} waterGoal={waterGoal} waterPercent={waterPercent} currentLog={currentLog} habitDone={habitDone} latest={latest} previous={previous} measurements={sortedMeasurements} goalPercent={goalPercent} onWater={addWater} onResetWater={resetWater} onHabit={toggleHabit} onView={changeView} />}
                {view === 'progress' && <Progress profile={profile} currentWeight={currentWeight} bmi={bmi} goalPercent={goalPercent} measurements={sortedMeasurements} latest={latest} onAdd={openNewMeasurement} onEdit={editMeasurement} onDelete={(measurement) => { setEditingMeasurement(measurement); setDialog('delete'); }} />}
                {view === 'habits' && <Habits currentLog={currentLog} logs={logs} onHabit={toggleHabit} onView={changeView} />}
                {view === 'profile' && <ProfilePage profile={profile} measurements={sortedMeasurements} onEditProfile={() => setDialog('profile')} onAdd={openNewMeasurement} onEditMeasurement={editMeasurement} onDelete={(measurement) => { setEditingMeasurement(measurement); setDialog('delete'); }} />}
              </>
            )}
          </div>
        </main>
      </div>
      {notice && <div data-testid="status-toast" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl"><Check size={16} />{notice}</div>}
      {dialog === 'profile' && <ProfileDialog profile={profile} onClose={() => setDialog(null)} onSave={(next) => { setProfile(next); save(STORAGE.profile, next); setDialog(null); flash(profile ? 'Profile updated' : 'Your space is ready'); }} />}
      {dialog === 'measurement' && <MeasurementDialog measurement={editingMeasurement} onClose={() => setDialog(null)} onSave={(next) => {
        const nextMeasurements = editingMeasurement ? measurements.map((item) => item.id === next.id ? next : item) : [next, ...measurements];
        setMeasurements(nextMeasurements); save(STORAGE.measurements, nextMeasurements);
        setDialog(null); setEditingMeasurement(null); flash(editingMeasurement ? 'Measurement updated' : 'Measurement saved');
      }} />}
      {dialog === 'delete' && <ConfirmDialog title="Remove this entry?" description="This measurement will be removed from your local history. The rest of your progress stays untouched." onCancel={() => { setDialog(null); setEditingMeasurement(null); }} onConfirm={removeMeasurement} />}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`flex items-center gap-3 ${compact ? 'px-1' : 'px-3'}`}><div className="relative flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Waves size={20} strokeWidth={2.5} /><span className="absolute -right-1 -top-1 size-2 rounded-full bg-chart-4" /></div><div><div className="font-display text-[22px] leading-none tracking-tight">my<span className="text-sidebar-primary">life</span></div><div className="mt-1 text-[9px] font-bold uppercase tracking-[.2em] text-sidebar-foreground/45">fitness, made personal</div></div></div>;
}

function NavButton({ item, active, onClick }: { item: { id: View; label: string; icon: LucideIcon }; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <button data-testid={`button-nav-${item.id}`} onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Icon size={18} strokeWidth={active ? 2.5 : 2} /><span>{item.label}</span>{active && <ChevronRight size={15} className="ml-auto" />}</button>;
}

function Onboarding({ onStart }: { onStart: () => void }) {
  return <div className="rise mx-auto max-w-5xl py-4 lg:py-12">
    <div className="grid overflow-hidden rounded-[2rem] border border-border bg-card soft-shadow lg:grid-cols-[1.1fr_.9fr]">
      <div className="relative overflow-hidden bg-primary px-7 py-12 text-primary-foreground sm:px-12 lg:px-16 lg:py-16">
        <div className="absolute -right-20 -top-24 size-72 rounded-full border-[44px] border-accent/20" /><div className="absolute -bottom-20 -left-20 size-64 rounded-full border-[26px] border-chart-2/20" />
         <div className="relative"><p className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-accent"><Sparkles size={15} /> Bem-vindo ao seu espaço</p><h1 className="max-w-md font-display text-6xl leading-[.92] tracking-tight sm:text-7xl">Sinta-se bem<br /><em className="text-accent">do seu jeito.</em></h1><p className="mt-8 max-w-sm text-[15px] leading-7 text-primary-foreground/65">Um lugar só seu para perceber pequenas mudanças, criar hábitos constantes e se encontrar onde você está.</p><button data-testid="button-start-profile" onClick={onStart} className="mt-9 flex items-center gap-3 rounded-full bg-accent px-5 py-3.5 text-sm font-bold text-accent-foreground transition hover:-translate-y-0.5 hover:shadow-lg">Criar meu perfil <ChevronRight size={17} /></button></div>
      </div>
       <div className="flex flex-col justify-between bg-card px-7 py-10 sm:px-12 lg:px-12 lg:py-14"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-muted-foreground">Um começo leve</p><h2 className="mt-3 max-w-sm font-display text-4xl leading-tight text-foreground">Sua evolução, <em>sem pressão.</em></h2><div className="mt-10 space-y-5"><OnboardingPoint icon={Target} title="Uma meta que é sua" text="Escolha uma direção, não um prazo." /><OnboardingPoint icon={Droplets} title="Rituais visíveis no dia a dia" text="Água e hábitos que cabem na vida real." /><OnboardingPoint icon={LineChart} title="Perceba a tendência" text="Medidas que contam uma história mais gentil." /></div></div><div className="mt-10 rounded-2xl bg-secondary/65 p-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-secondary-foreground/65">Uma pequena prévia</p><div className="mt-4 flex items-end gap-1.5">{[30, 39, 35, 52, 47, 66, 73].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-secondary-foreground/20" style={{ height }} />)}</div><p className="mt-3 text-xs text-secondary-foreground/70">Seu primeiro registro vai tornar este gráfico seu.</p></div></div>
    </div>
  </div>;
}
function OnboardingPoint({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="flex gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground"><Icon size={17} /></div><div><p className="text-sm font-bold">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{text}</p></div></div>;
}

function PageIntro({ eyebrow, title, sub, action }: { eyebrow: string; title: ReactNode; sub: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-accent-foreground/70">{eyebrow}</p><h1 data-testid="text-page-title" className="font-display text-5xl leading-none tracking-tight sm:text-6xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{sub}</p></div>{action}</div>;
}

function Overview({ profile, currentWeight, bmi, waterGoal, waterPercent, currentLog, habitDone, latest, previous, goalPercent, onWater, onResetWater, onHabit, onView }: { profile: Profile; currentWeight: number; bmi: number; waterGoal: number; waterPercent: number; currentLog: DailyLog; habitDone: number; latest?: Measurement; previous?: Measurement; goalPercent: number; onWater: (n: number) => void; onResetWater: () => void; onHabit: (h: keyof HabitState) => void; onView: (v: View) => void }) {
  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  return <div className="rise"><PageIntro eyebrow={`${formatDate(today())} · ${new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date())} em foco`} title={<>{greeting}, <em>{profile.name.split(' ')[0]}.</em></>} sub="Aqui está o retrato do seu dia até agora. Nada para consertar — apenas algumas coisas para perceber." action={<button data-testid="button-quick-measurement" onClick={() => onView('progress')} className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-bold transition hover:border-primary hover:bg-muted"><Plus size={16} /> Registrar medida</button>} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
       <MetricCard label="Peso atual" value={`${currentWeight.toFixed(1)}`} unit="kg" icon={Scale} tone="plum" detail={latest && previous ? `${Math.abs(currentWeight - previous.weightKg).toFixed(1)} kg desde a última medida` : 'Seu último registro'} trend={latest && previous ? currentWeight <= previous.weightKg : undefined} />
       <MetricCard label="Índice de massa corporal" value={bmi.toFixed(1)} unit="IMC" icon={HeartPulse} tone="mint" detail={bmi < 25 ? 'Uma faixa de referência' : 'Um dado, não um julgamento'} />
       <MetricCard label="Progresso da meta" value={`${goalPercent}`} unit="%" icon={Target} tone="coral" detail={`${Math.abs(profile.currentWeightKg - profile.goalWeightKg).toFixed(1)} kg de jornada total`} progress={goalPercent} />
       <MetricCard label="Rituais de hoje" value={`${habitDone}/4`} unit="feitos" icon={Zap} tone="sand" detail={habitDone === 4 ? 'Tudo completo' : `${4 - habitDone} ainda em aberto`} progress={habitDone * 25} />
    </section>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
       <TrendCard measurements={measurements} onView={() => onView('progress')} />
      <WaterCard water={currentLog.waterMl} goal={waterGoal} percent={waterPercent} onAdd={onWater} onReset={onResetWater} />
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[.82fr_1.18fr]">
      <TodayCard habits={currentLog.habits} onHabit={onHabit} />
      <ReflectionCard profile={profile} />
    </div>
  </div>;
}

function MetricCard({ label, value, unit, icon: Icon, tone, detail, progress, trend }: { label: string; value: string; unit: string; icon: LucideIcon; tone: string; detail: string; progress?: number; trend?: boolean }) {
  const tones: Record<string, string> = { plum: 'bg-primary text-primary-foreground', mint: 'bg-secondary text-secondary-foreground', coral: 'bg-accent text-accent-foreground', sand: 'bg-chart-4/40 text-foreground' };
  return <div data-testid={`card-metric-${label.toLowerCase().replaceAll(' ', '-')}`} className={`rounded-2xl p-5 ${tones[tone]} soft-shadow`}><div className="flex items-start justify-between"><p className="text-[11px] font-bold uppercase tracking-[.14em] opacity-65">{label}</p><Icon size={18} className="opacity-70" /></div><div className="mt-5 flex items-baseline gap-1"><span data-testid={`text-metric-${label.toLowerCase().replaceAll(' ', '-')}`} className="font-mono-app text-3xl font-bold tracking-tight">{value}</span><span className="text-xs font-bold opacity-60">{unit}</span>{trend !== undefined && (trend ? <ArrowDownRight size={15} className="ml-1 text-chart-2" /> : <ArrowUpRight size={15} className="ml-1" />)}</div><p className="mt-2 text-xs opacity-65">{detail}</p>{progress !== undefined && <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-current opacity-70 transition-all duration-500" style={{ width: `${progress}%` }} /></div>}</div>;
}

function TrendCard({ measurements, onView }: { measurements: Measurement[]; onView: () => void }) {
  const points = measurements.length ? [...measurements].reverse().map((item) => item.weightKg) : [74, 73.3, 73.8, 72.9, 72.5, 72.1, 71.6];
  const min = Math.min(...points) - 1; const max = Math.max(...points) + 1;
  const coords = points.map((point, index) => `${(index / Math.max(1, points.length - 1)) * 92 + 4},${72 - ((point - min) / (max - min)) * 56}`).join(' ');
  return <section className="rounded-2xl border border-border bg-card p-5 soft-shadow sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Evolução</p><h2 className="mt-1 text-lg font-bold">Seu corpo ao longo do tempo</h2></div><button data-testid="button-view-progress" onClick={onView} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Ver toda a evolução"><MoreHorizontal size={19} /></button></div><div className="mt-5 h-[150px] overflow-hidden rounded-xl bg-secondary/35 px-2 pt-3"><svg viewBox="0 0 100 82" className="h-full w-full" preserveAspectRatio="none"><path d="M4 72H96 M4 44H96 M4 16H96" stroke="hsl(var(--border))" strokeWidth=".45" strokeDasharray="2 2" fill="none" /><polyline points={coords} fill="none" stroke="hsl(var(--chart-1))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="chart-line" />{points.map((point, i) => <circle key={i} cx={(i / Math.max(1, points.length - 1)) * 92 + 4} cy={72 - ((point - min) / (max - min)) * 56} r="1.8" fill="hsl(var(--card))" stroke="hsl(var(--chart-1))" strokeWidth="1" />)}</svg></div><div className="mt-3 flex justify-between text-[10px] font-mono-app text-muted-foreground"><span>{measurements.length ? shortDate(measurements[measurements.length - 1].date) : 'Seu primeiro registro'}</span><span>agora</span></div></section>;
}

function WaterCard({ water, goal, percent, onAdd, onReset }: { water: number; goal: number; percent: number; onAdd: (n: number) => void; onReset: () => void }) {
  return <section className="rounded-2xl border border-border bg-card p-5 soft-shadow sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Hidratação</p><h2 className="mt-1 text-lg font-bold">Beba no seu ritmo</h2></div><div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><Droplets size={19} /></div></div><div className="mt-6 flex items-end gap-2"><span data-testid="text-water-progress" className="font-mono-app text-4xl font-bold">{(water / 1000).toFixed(1)}</span><span className="mb-1 text-sm text-muted-foreground">/ {(goal / 1000).toFixed(1)} L</span><span className="mb-1 ml-auto text-sm font-bold text-secondary-foreground">{percent}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-secondary-foreground transition-all duration-500" style={{ width: `${percent}%` }} /></div><div className="mt-5 grid grid-cols-3 gap-2"><WaterButton amount={250} onClick={() => onAdd(250)} /><WaterButton amount={350} onClick={() => onAdd(350)} /><WaterButton amount={500} onClick={() => onAdd(500)} /></div><button data-testid="button-reset-water" onClick={onReset} className="mt-3 w-full text-center text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Reiniciar hoje</button></section>;
}
function WaterButton({ amount, onClick }: { amount: number; onClick: () => void }) { return <button data-testid={`button-add-water-${amount}`} onClick={onClick} className="flex items-center justify-center gap-1 rounded-xl border border-border bg-background py-2 text-xs font-bold transition hover:border-secondary-foreground hover:bg-secondary"><Plus size={13} />{amount} ml</button>; }

function TodayCard({ habits, onHabit }: { habits: HabitState; onHabit: (h: keyof HabitState) => void }) {
  const items: { key: keyof HabitState; label: string; note: string; icon: LucideIcon }[] = [{ key: 'sleep', label: 'Descanso', note: 'Uma pausa de verdade', icon: Moon }, { key: 'movement', label: 'Movimento', note: 'Todo jeito de se mexer conta', icon: Footprints }, { key: 'nutrition', label: 'Alimentação', note: 'Nutrir-se com cuidado', icon: Beaker }, { key: 'mood', label: 'Humor', note: 'Dê nome ao que sente', icon: HeartPulse }];
  return <section className="rounded-2xl border border-border bg-card p-5 soft-shadow sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Rituais de hoje</p><h2 className="mt-1 text-lg font-bold">Como você está?</h2></div><span className="font-mono-app text-sm text-muted-foreground">{Object.values(habits).filter(Boolean).length}<span className="opacity-40">/4</span></span></div><div className="mt-5 grid grid-cols-2 gap-2">{items.map(({ key, label, note, icon: Icon }) => <button key={key} data-testid={`button-habit-${key}`} onClick={() => onHabit(key)} className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition ${habits[key] ? 'border-secondary-foreground/35 bg-secondary/65' : 'border-border hover:bg-muted'}`}><span className={`flex size-9 items-center justify-center rounded-lg transition ${habits[key] ? 'bg-secondary-foreground text-secondary' : 'bg-muted text-muted-foreground'}`}>{habits[key] ? <Check size={17} className="check-pop" /> : <Icon size={17} />}</span><span className="min-w-0"><span className="block text-sm font-bold">{label}</span><span className="block truncate text-[10px] text-muted-foreground">{habits[key] ? 'Feito hoje' : note}</span></span></button>)}</div></section>;
}
function ReflectionCard({ profile }: { profile: Profile }) { return <section className="relative overflow-hidden rounded-2xl bg-accent p-6 text-accent-foreground soft-shadow"><div className="absolute -right-8 -top-10 size-36 rounded-full border-[18px] border-accent-foreground/10" /><div className="relative"><div className="flex items-center gap-2 text-accent-foreground/65"><Sparkles size={16} /><span className="text-[11px] font-bold uppercase tracking-[.14em]">Uma nota para levar</span></div><p className="mt-6 max-w-md font-display text-3xl leading-tight">“Você não precisa merecer o descanso, {profile.name.split(' ')[0]}.”</p><p className="mt-5 text-xs font-semibold text-accent-foreground/60">Continue com leveza.</p></div></section>; }

function Progress({ profile, currentWeight, bmi, goalPercent, measurements, latest, onAdd, onEdit, onDelete }: { profile: Profile; currentWeight: number; bmi: number; goalPercent: number; measurements: Measurement[]; latest?: Measurement; onAdd: () => void; onEdit: (m: Measurement) => void; onDelete: (m: Measurement) => void }) {
  return <div className="rise"><PageIntro eyebrow="A visão mais ampla" title={<>Perceba a <em>evolução.</em></>} sub="Progresso é uma coleção de observações. Olhe para trás com curiosidade, nunca com comparação." action={<button data-testid="button-add-measurement" onClick={onAdd} className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-lg"><Plus size={16} /> Adicionar medida</button>} />
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Peso atual" value={currentWeight.toFixed(1)} unit="kg" icon={Scale} tone="plum" detail={`Meta: ${profile.goalWeightKg.toFixed(1)} kg`} /><MetricCard label="Retrato do IMC" value={bmi.toFixed(1)} unit="IMC" icon={HeartPulse} tone="mint" detail="Um dado útil para observar" /><MetricCard label="Jornada percorrida" value={`${goalPercent}`} unit="%" icon={TrendingDown} tone="coral" detail="Em direção à sua meta" progress={goalPercent} /></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><ProgressChart measurements={measurements} /><LatestSnapshot measurement={latest} previous={measurements[1]} /></div>
    <MeasurementsTable measurements={measurements} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
  </div>;
}
function ProgressChart({ measurements }: { measurements: Measurement[] }) {
  const values = measurements.length > 1 ? [...measurements].reverse().map((m) => m.weightKg) : [76, 75.4, 75.1, 74.6, 74.2, 73.8, 73.2];
  const min = Math.min(...values) - 1; const max = Math.max(...values) + 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 92 + 4},${78 - ((v - min) / (max - min)) * 62}`).join(' ');
  return <section className="rounded-2xl border border-border bg-card p-5 soft-shadow sm:p-6"><div className="flex justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Evolução do peso</p><h2 className="mt-1 text-lg font-bold">Uma linha, não um julgamento</h2></div><div className="flex items-center gap-1.5 text-xs font-semibold text-chart-1"><span className="size-2 rounded-full bg-chart-1" /> kg</div></div><div className="mt-6 h-[220px] rounded-xl bg-secondary/25 p-3"><svg viewBox="0 0 100 90" className="h-full w-full" preserveAspectRatio="none">{[16, 38, 60, 82].map((y) => <line key={y} x1="4" x2="96" y1={y} y2={y} stroke="hsl(var(--border))" strokeWidth=".5" strokeDasharray="2 2" />)}<polyline points={points} fill="none" stroke="hsl(var(--chart-1))" strokeWidth="1.8" strokeLinecap="round" className="chart-line" />{values.map((v, i) => <circle key={i} cx={(i / (values.length - 1)) * 92 + 4} cy={78 - ((v - min) / (max - min)) * 62} r="2" fill="hsl(var(--card))" stroke="hsl(var(--chart-1))" strokeWidth="1" />)}</svg></div><div className="mt-3 flex justify-between text-[10px] text-muted-foreground"><span>{measurements.length ? 'Mais antigo' : 'Evolução ilustrativa'}</span><span>Mais recente</span></div></section>;
}
function LatestSnapshot({ measurement, previous }: { measurement?: Measurement; previous?: Measurement }) {
  const details = measurement ? [{ label: 'Cintura', value: measurement.waistCm ? `${measurement.waistCm} cm` : '—' }, { label: 'Gordura corporal', value: measurement.bodyFatPct ? `${measurement.bodyFatPct}%` : '—' }, { label: 'Registrado', value: formatDate(measurement.date) }] : [{ label: 'Cintura', value: '—' }, { label: 'Gordura corporal', value: '—' }, { label: 'Registrado', value: 'Ainda não' }];
  const delta = measurement && previous ? measurement.weightKg - previous.weightKg : null;
  return <section className="rounded-2xl border border-border bg-primary p-5 text-primary-foreground soft-shadow sm:p-6"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-primary-foreground/55">Última medição</p><div className="mt-5 flex items-end gap-2"><span className="font-mono-app text-5xl font-bold">{measurement?.weightKg?.toFixed(1) ?? '—'}</span><span className="mb-1 text-sm text-primary-foreground/55">kg</span>{delta !== null && <span className="mb-1 ml-auto flex items-center gap-1 text-xs font-bold text-primary-foreground/70">{delta <= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{Math.abs(delta).toFixed(1)} kg vs anterior</span>}</div><div className="mt-8 divide-y divide-primary-foreground/10">{details.map((detail) => <div key={detail.label} className="flex justify-between py-3 text-sm"><span className="text-primary-foreground/55">{detail.label}</span><span className="font-bold">{detail.value}</span></div>)}</div><div className="mt-5 flex gap-2 rounded-xl bg-primary-foreground/10 p-3 text-xs leading-5 text-primary-foreground/65"><CircleHelp size={15} className="mt-0.5 shrink-0" />Uma medição é apenas informação — seu valor permanece constante.</div></section>;
}

function MeasurementsTable({ measurements, onEdit, onDelete, onAdd }: { measurements: Measurement[]; onEdit: (m: Measurement) => void; onDelete: (m: Measurement) => void; onAdd: () => void }) {
  return <section className="mt-4 rounded-2xl border border-border bg-card p-5 soft-shadow sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Histórico de registros</p><h2 className="mt-1 text-lg font-bold">Suas medidas</h2></div>{measurements.length > 0 && <span className="font-mono-app text-xs text-muted-foreground">{measurements.length} {measurements.length === 1 ? 'registro' : 'registros'}</span>}</div>{measurements.length === 0 ? <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-border bg-background p-8 text-center"><div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><Ruler size={21} /></div><p data-testid="text-measurements-empty" className="mt-4 text-sm font-bold">Seu histórico começa aqui</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Uma medição a cada poucas semanas pode revelar mudanças que o dia a dia esconde.</p><button data-testid="button-empty-add-measurement" onClick={onAdd} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Adicionar primeira medida</button></div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-border text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground"><th className="pb-3 pl-2">Data</th><th className="pb-3">Peso</th><th className="pb-3">Cintura</th><th className="pb-3">Gordura</th><th className="pb-3">Observação</th><th className="pb-3 text-right pr-2">Ações</th></tr></thead><tbody>{measurements.map((m, index) => <tr data-testid={`row-measurement-${m.id}`} key={m.id} className="border-b border-border/70 last:border-0"><td className="py-4 pl-2 font-semibold">{formatDate(m.date)}{index === 0 && <span className="ml-2 rounded-full bg-secondary px-2 py-1 text-[9px] font-bold text-secondary-foreground">ATUAL</span>}</td><td className="py-4 font-mono-app font-bold">{m.weightKg.toFixed(1)} kg</td><td className="py-4 text-muted-foreground">{m.waistCm ? `${m.waistCm} cm` : '—'}</td><td className="py-4 text-muted-foreground">{m.bodyFatPct ? `${m.bodyFatPct}%` : '—'}</td><td className="max-w-[180px] truncate py-4 text-muted-foreground">{m.notes || 'Sem observação'}</td><td className="py-4 pr-2 text-right"><button data-testid={`button-edit-measurement-${m.id}`} onClick={() => onEdit(m)} className="mr-1 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Editar medição de ${formatDate(m.date)}`}><Pencil size={15} /></button><button data-testid={`button-delete-measurement-${m.id}`} onClick={() => onDelete(m)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Excluir medição de ${formatDate(m.date)}`}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}</section>;
}

function Habits({ currentLog, logs, onHabit, onView }: { currentLog: DailyLog; logs: Record<string, DailyLog>; onHabit: (h: keyof HabitState) => void; onView: (v: View) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() - (6 - i)); return date.toISOString().slice(0, 10); });
  const weekly = days.map((date) => logs[date] ?? { date, waterMl: 0, habits: emptyHabits() });
  const total = weekly.reduce((sum, day) => sum + Object.values(day.habits).filter(Boolean).length, 0);
  const habitCards: { key: keyof HabitState; title: string; description: string; icon: LucideIcon; color: string }[] = [{ key: 'sleep', title: 'Descanso', description: 'Proteja sua energia com uma pausa de verdade.', icon: Moon, color: 'bg-primary text-primary-foreground' }, { key: 'movement', title: 'Movimento', description: 'Alongar, caminhar, treinar — tudo conta.', icon: Footprints, color: 'bg-secondary text-secondary-foreground' }, { key: 'nutrition', title: 'Alimentação', description: 'Perceba o que ajuda você a se sentir bem.', icon: Beaker, color: 'bg-accent text-accent-foreground' }, { key: 'mood', title: 'Humor', description: 'Há espaço para tudo o que você sente hoje.', icon: HeartPulse, color: 'bg-chart-4/50 text-foreground' }];
  return <div className="rise"><PageIntro eyebrow="Pequenas coisas, sempre" title={<>Crie seu <em>ritmo.</em></>} sub="Seus hábitos não são uma prova. São pequenas formas de voltar para você." action={<button data-testid="button-habits-overview" onClick={() => onView('overview')} className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted"><Home size={16} /> Voltar à visão geral</button>} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{habitCards.map(({ key, title, description, icon: Icon, color }) => <button data-testid={`card-habit-${key}`} key={key} onClick={() => onHabit(key)} className={`relative overflow-hidden rounded-2xl p-5 text-left transition hover:-translate-y-1 hover:shadow-lg ${currentLog.habits[key] ? color : 'border border-border bg-card'}`}><div className="flex items-start justify-between"><span className={`flex size-10 items-center justify-center rounded-xl ${currentLog.habits[key] ? 'bg-foreground/10' : 'bg-muted text-muted-foreground'}`}>{currentLog.habits[key] ? <Check size={20} className="check-pop" /> : <Icon size={20} />}</span><span className="text-[10px] font-bold uppercase tracking-[.14em] opacity-55">{currentLog.habits[key] ? 'Completo' : 'Em aberto'}</span></div><h2 className="mt-8 text-lg font-bold">{title}</h2><p className="mt-1 text-xs leading-5 opacity-65">{description}</p></button>)}</div>
    <section className="mt-4 rounded-2xl border border-border bg-card p-5 soft-shadow sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Reflexão semanal</p><h2 className="mt-1 text-lg font-bold">Os últimos sete dias</h2></div><p data-testid="text-weekly-summary" className="text-sm font-semibold text-muted-foreground"><span className="font-mono-app text-xl text-foreground">{total}</span> de 28 check-ins</p></div><div className="mt-7 grid grid-cols-7 gap-2 sm:gap-4">{weekly.map((day) => { const count = Object.values(day.habits).filter(Boolean).length; return <div data-testid={`day-summary-${day.date}`} key={day.date} className="text-center"><div className="flex h-28 flex-col-reverse gap-1.5 rounded-xl bg-muted p-1.5">{[0, 1, 2, 3].map((slot) => <div key={slot} className={`flex-1 rounded-md ${slot < count ? 'bg-secondary-foreground' : 'bg-background'}`} />)}</div><p className="mt-2 text-[10px] font-bold text-muted-foreground">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`))}</p></div>; })}</div><div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-secondary-foreground" /> Cada barra representa um check-in. Mantenha o registro verdadeiro.</div></section>
  </div>;
}

function ProfilePage({ profile, measurements, onEditProfile, onAdd, onEditMeasurement, onDelete }: { profile: Profile; measurements: Measurement[]; onEditProfile: () => void; onAdd: () => void; onEditMeasurement: (m: Measurement) => void; onDelete: (m: Measurement) => void }) {
  return <div className="rise"><PageIntro eyebrow="A pessoa por trás dos números" title={<>Este é <em>o seu espaço.</em></>} sub="Mantenha seu ponto de partida por perto. Você pode mudar tudo aqui conforme a vida muda." action={<button data-testid="button-edit-profile" onClick={onEditProfile} className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:shadow-lg"><Edit3 size={16} /> Editar perfil</button>} />
    <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><section className="rounded-2xl bg-primary p-6 text-primary-foreground soft-shadow sm:p-8"><div className="flex size-16 items-center justify-center rounded-2xl bg-accent font-display text-2xl text-accent-foreground">{initials(profile.name)}</div><h2 data-testid="text-profile-name" className="mt-6 font-display text-4xl">{profile.name}</h2><p className="mt-1 text-sm text-primary-foreground/55">Começou em {formatDate(profile.startDate)}</p><div className="mt-10 grid grid-cols-2 gap-3">{[['Idade', `${profile.age} anos`], ['Altura', `${profile.heightCm} cm`], ['Atual', `${profile.currentWeightKg.toFixed(1)} kg`], ['Meta', `${profile.goalWeightKg.toFixed(1)} kg`]].map(([label, value]) => <div key={label} className="rounded-xl bg-primary-foreground/10 p-3"><p className="text-[10px] uppercase tracking-[.12em] text-primary-foreground/45">{label}</p><p className="mt-1 font-mono-app text-sm font-bold">{value}</p></div>)}</div></section><section className="rounded-2xl border border-border bg-card p-6 soft-shadow sm:p-8"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Seus dados, suas regras</p><h2 className="mt-1 text-xl font-bold">Como o MyLife funciona</h2></div><HeartPulse className="text-accent-foreground" size={22} /></div><div className="mt-7 space-y-5"><OnboardingPoint icon={Waves} title="Privacidade em primeiro lugar" text="Suas informações ficam neste navegador, usando o armazenamento local." /><OnboardingPoint icon={TrendingDown} title="Tendências, não snapshots" text="Buscamos direção, não um dia perfeito." /><OnboardingPoint icon={CircleHelp} title="Sem julgamentos" text="Um check-in perdido é apenas um check-in perdido." /></div></section></div><MeasurementsTable measurements={measurements} onEdit={onEditMeasurement} onDelete={onDelete} onAdd={onAdd} /></div>;
}

function DialogShell({ title, eyebrow, children, onClose, wide = false }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-primary/35 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div role="dialog" aria-modal="true" className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-border bg-card p-6 shadow-2xl sm:rounded-[2rem] sm:p-8 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-accent-foreground/70">{eyebrow}</p><h2 className="mt-2 font-display text-4xl leading-none">{title}</h2></div><button data-testid="button-dialog-close" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Fechar janela"><X size={19} /></button></div>{children}</div></div>;
}

function Field({ label, name, value, onChange, type = 'text', placeholder, min, step }: { label: string; name: string; value: string | number; onChange: (value: string) => void; type?: string; placeholder?: string; min?: string; step?: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold text-foreground/75">{label}</span><input data-testid={`input-${name}`} name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} min={min} step={step} required={name === 'name' || name === 'weightKg'} className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-accent-foreground focus:ring-2 focus:ring-accent/30" /></label>;
}

function ProfileDialog({ profile, onClose, onSave }: { profile: Profile | null; onClose: () => void; onSave: (profile: Profile) => void }) {
  const [form, setForm] = useState({ name: profile?.name ?? '', age: String(profile?.age ?? ''), heightCm: String(profile?.heightCm ?? ''), currentWeightKg: String(profile?.currentWeightKg ?? ''), goalWeightKg: String(profile?.goalWeightKg ?? ''), startDate: profile?.startDate ?? today() });
  const submit = (event: FormEvent) => { event.preventDefault(); const values = [form.age, form.heightCm, form.currentWeightKg, form.goalWeightKg].map(Number); if (!form.name.trim() || !form.startDate || values.some((value) => !Number.isFinite(value) || value <= 0)) return; onSave({ name: form.name.trim(), age: values[0], heightCm: values[1], currentWeightKg: values[2], goalWeightKg: values[3], startDate: form.startDate }); };
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <DialogShell title={profile ? 'Ajuste seus dados' : 'Comece por você'} eyebrow={profile ? 'Configurações do perfil' : 'Um começo leve'} onClose={onClose}><form onSubmit={submit} className="mt-8 space-y-5"><Field label="Seu nome" name="name" value={form.name} onChange={set('name')} placeholder="Como devemos chamar você?" /><div className="grid grid-cols-2 gap-3"><Field label="Idade" name="age" value={form.age} onChange={set('age')} type="number" min="1" /><Field label="Altura (cm)" name="heightCm" value={form.heightCm} onChange={set('heightCm')} type="number" min="80" step="0.1" /></div><div className="grid grid-cols-2 gap-3"><Field label="Peso atual (kg)" name="currentWeightKg" value={form.currentWeightKg} onChange={set('currentWeightKg')} type="number" min="1" step="0.1" /><Field label="Peso meta (kg)" name="goalWeightKg" value={form.goalWeightKg} onChange={set('goalWeightKg')} type="number" min="1" step="0.1" /></div><Field label="Data de início" name="startDate" value={form.startDate} onChange={set('startDate')} type="date" /><div className="flex gap-3 pt-3"><button data-testid="button-cancel-profile" type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-3 text-sm font-bold hover:bg-muted">Agora não</button><button data-testid="button-save-profile" type="submit" className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:shadow-lg">{profile ? 'Salvar alterações' : 'Criar meu espaço'}</button></div></form></DialogShell>;
}

function MeasurementDialog({ measurement, onClose, onSave }: { measurement: Measurement | null; onClose: () => void; onSave: (measurement: Measurement) => void }) {
  const [form, setForm] = useState({ date: measurement?.date ?? today(), weightKg: measurement ? String(measurement.weightKg) : '', waistCm: measurement?.waistCm ? String(measurement.waistCm) : '', chestCm: measurement?.chestCm ? String(measurement.chestCm) : '', hipCm: measurement?.hipCm ? String(measurement.hipCm) : '', armCm: measurement?.armCm ? String(measurement.armCm) : '', bodyFatPct: measurement?.bodyFatPct ? String(measurement.bodyFatPct) : '', notes: measurement?.notes ?? '' });
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const optional = (value: string) => value ? Number(value) : undefined;
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.weightKg) return; onSave({ id: measurement?.id ?? `${Date.now()}`, date: form.date, weightKg: Number(form.weightKg), waistCm: optional(form.waistCm), chestCm: optional(form.chestCm), hipCm: optional(form.hipCm), armCm: optional(form.armCm), bodyFatPct: optional(form.bodyFatPct), notes: form.notes.trim() || undefined }); };
  return <DialogShell title={measurement ? 'Editar registro' : 'Novo registro'} eyebrow={measurement ? 'Atualizar medida' : 'Perceba a mudança'} onClose={onClose} wide><form onSubmit={submit} className="mt-8 space-y-5"><div className="grid grid-cols-2 gap-3"><Field label="Data" name="date" value={form.date} onChange={update('date')} type="date" /><Field label="Peso (kg)" name="weightKg" value={form.weightKg} onChange={update('weightKg')} type="number" min="1" step="0.1" /></div><p className="border-b border-border pb-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Detalhes opcionais</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Field label="Cintura (cm)" name="waistCm" value={form.waistCm} onChange={update('waistCm')} type="number" min="1" step="0.1" /><Field label="Peito (cm)" name="chestCm" value={form.chestCm} onChange={update('chestCm')} type="number" min="1" step="0.1" /><Field label="Quadril (cm)" name="hipCm" value={form.hipCm} onChange={update('hipCm')} type="number" min="1" step="0.1" /><Field label="Braço (cm)" name="armCm" value={form.armCm} onChange={update('armCm')} type="number" min="1" step="0.1" /></div><Field label="Gordura corporal (%)" name="bodyFatPct" value={form.bodyFatPct} onChange={update('bodyFatPct')} type="number" min="1" step="0.1" /><label className="block"><span className="mb-2 block text-xs font-bold text-foreground/75">Uma nota para o seu futuro</span><textarea data-testid="input-notes" value={form.notes} onChange={(event) => update('notes')(event.target.value)} rows={3} placeholder="Como você estava se sentindo?" className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-accent-foreground focus:ring-2 focus:ring-accent/30" /></label><div className="flex gap-3 pt-3"><button data-testid="button-cancel-measurement" type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-3 text-sm font-bold hover:bg-muted">Cancelar</button><button data-testid="button-save-measurement" type="submit" className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:shadow-lg">{measurement ? 'Atualizar registro' : 'Salvar registro'}</button></div></form></DialogShell>;
}

function ConfirmDialog({ title, description, onCancel, onConfirm }: { title: string; description: string; onCancel: () => void; onConfirm: () => void }) {
  return <DialogShell title={title} eyebrow="Uma última confirmação" onClose={onCancel}><p className="mt-5 text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-7 flex gap-3"><button data-testid="button-cancel-delete" onClick={onCancel} className="flex-1 rounded-xl border border-border py-3 text-sm font-bold hover:bg-muted">Manter registro</button><button data-testid="button-confirm-delete" onClick={onConfirm} className="flex-1 rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground hover:opacity-90">Remover registro</button></div></DialogShell>;
}

export default App;
