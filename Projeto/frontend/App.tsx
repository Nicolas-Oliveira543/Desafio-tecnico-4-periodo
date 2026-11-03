import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, AlertCircle, ArrowDownUp, BookOpen, BookText, Check, ChevronDown, CircleHelp,
  Clock3, GraduationCap, LayoutDashboard, LoaderCircle, Menu, Plus, RefreshCw, Search, ShieldCheck,
  Trash2, Users, X, Pencil, type LucideIcon } from "lucide-react";
import { api, type ApiRecord, type ResourceKey } from "./api";

type Screen = "dashboard" | ResourceKey;
type RecordCollection = Record<ResourceKey, ApiRecord[]>;
type FieldKind = "text" | "email" | "date" | "textarea" | "select" | "boolean";
type FieldDefinition = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
};
type ColumnDefinition = { key: string; label: string; render?: 
  (record: ApiRecord, data: RecordCollection) => string };
type ResourceDefinition = {
  key: ResourceKey;
  label: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  fields: FieldDefinition[];
  columns: ColumnDefinition[];
};

type ToastState = { message: string; type: "success" | "error" } | null;

const RESOURCE_ORDER: ResourceKey[] = ["users", "courses", "modules", "contents", "attendance"];

const EMPTY_DATA: RecordCollection = {
  users: [],
  courses: [],
  modules: [],
  contents: [],
  attendance: []
};

const RESOURCES: Record<ResourceKey, ResourceDefinition> = {
  users: {
    key: "users",
    label: "Users",
    singular: "User",
    description: "Manage learner accounts and user status.",
    icon: Users,
    fields: [
      { name: "name", label: "Full name", kind: "text", required: true, maxLength: 200, placeholder: "Enter a full name" },
      { name: "email", label: "Email address", kind: "email", required: true, maxLength: 200, placeholder: "name@example.com" },
      { name: "status", label: "Account status", kind: "boolean", help: "Choose active, inactive, or not set." },
      { name: "creationdate", label: "Creation date", kind: "date" },
      { name: "updatedate", label: "Last updated", kind: "date" }
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status", render: (row) => booleanLabel(row.status, "Active", "Inactive") },
      { key: "creationdate", label: "Created" }
    ]
  },
  courses: {
    key: "courses",
    label: "Courses",
    singular: "Course",
    description: "Create courses and assign an owner.",
    icon: GraduationCap,
    fields: [
      { name: "uniquecode", label: "Unique code", kind: "text", required: true, maxLength: 20, placeholder: "e.g. CS101" },
      { name: "tittle", label: "Course title", kind: "text", required: true, maxLength: 20, placeholder: "Course title" },
      { name: "description", label: "Description", kind: "textarea", required: true, maxLength: 250, placeholder: "Describe this course" },
      { name: "userID", label: "Owner", kind: "select", required: true, options: [] },
      { name: "creationdate", label: "Creation date", kind: "date" },
      { name: "updatedate", label: "Last updated", kind: "date" }
    ],
    columns: [
      { key: "uniquecode", label: "Code" },
      { key: "tittle", label: "Course title" },
      { key: "description", label: "Description" },
      { key: "userID", label: "Owner", render: (row, data) => findName(data.users, row.userID) }
    ]
  },
  modules: {
    key: "modules",
    label: "Modules",
    singular: "Module",
    description: "Organize course content into learning modules.",
    icon: BookOpen,
    fields: [
      { name: "courseID", label: "Course", kind: "select", required: true, options: [] },
      { name: "tittle", label: "Module title", kind: "text", required: true, maxLength: 20, placeholder: "Module title" },
      { name: "description", label: "Description", kind: "textarea", required: true, maxLength: 250, placeholder: "Describe this module" },
      { name: "userID", label: "Owner", kind: "select", required: true, options: [] },
      { name: "creationdate", label: "Creation date", kind: "date" },
      { name: "updatedate", label: "Last updated", kind: "date" }
    ],
    columns: [
      { key: "tittle", label: "Module title" },
      { key: "courseID", label: "Course", render: (row, data) => findCourseName(data.courses, row.courseID) },
      { key: "userID", label: "Owner", render: (row, data) => findName(data.users, row.userID) },
      { key: "description", label: "Description" }
    ]
  },
  contents: {
    key: "contents",
    label: "Contents",
    singular: "Content",
    description: "Manage individual lessons and learning materials.",
    icon: BookText,
    fields: [
      { name: "moduleID", label: "Module", kind: "select", required: true, options: [] },
      { name: "tittle", label: "Content title", kind: "text", required: true, maxLength: 20, placeholder: "Content title" },
      { name: "content", label: "Content", kind: "textarea", required: true, maxLength: 200, placeholder: "Enter the learning content" },
      { name: "creationdate", label: "Creation date", kind: "date" },
      { name: "updatedate", label: "Last updated", kind: "date" }
    ],
    columns: [
      { key: "tittle", label: "Content title" },
      { key: "moduleID", label: "Module", render: (row, data) => findModuleName(data.modules, row.moduleID) },
      { key: "content", label: "Content" },
      { key: "creationdate", label: "Created" }
    ]
  },
  attendance: {
    key: "attendance",
    label: "Attendance",
    singular: "Attendance record",
    description: "Track which learners have watched each lesson.",
    icon: Activity,
    fields: [
      { name: "userID", label: "User", kind: "select", required: true, options: [] },
      { name: "contentID", label: "Content", kind: "select", required: true, options: [] },
      { name: "watched", label: "Watched", kind: "boolean" }
    ],
    columns: [
      { key: "userID", label: "User", render: (row, data) => findName(data.users, row.userID) },
      { key: "contentID", label: "Content", render: (row, data) => findContentName(data.contents, row.contentID) },
      { key: "watched", label: "Completion", render: (row) => booleanLabel(row.watched, "Watched", "Not watched") }
    ]
  }
};

function booleanLabel(value: unknown, trueLabel: string, falseLabel: string): string {
  if (value === true || value === 1) return trueLabel;
  if (value === false || value === 0) return falseLabel;
  return "Not set";
}

function findName(users: ApiRecord[], id: unknown): string {
  const user = users.find((item) => item.id === Number(id));
  return user ? String(user.name ?? `User #${id}`) : `User #${String(id ?? "?")}`;
}

function findCourseName(courses: ApiRecord[], id: unknown): string {
  const course = courses.find((item) => item.id === Number(id));
  return course ? String(course.tittle ?? `Course #${id}`) : `Course #${String(id ?? "?")}`;
}

function findModuleName(modules: ApiRecord[], id: unknown): string {
  const module = modules.find((item) => item.id === Number(id));
  return module ? String(module.tittle ?? `Module #${id}`) : `Module #${String(id ?? "?")}`;
}

function findContentName(contents: ApiRecord[], id: unknown): string {
  const content = contents.find((item) => item.id === Number(id));
  return content ? String(content.tittle ?? `Content #${id}`) : `Content #${String(id ?? "?")}`;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function createFieldOptions(field: FieldDefinition, data: RecordCollection): FieldDefinition {
  if (field.name === "userID") {
    return { ...field, options: data.users.map((user) => ({ value: String(user.id), label: `${String(user.name)} (#${user.id})` })) };
  }
  if (field.name === "courseID") {
    return { ...field, options: data.courses.map((course) => ({ value: String(course.id), label: `${String(course.tittle)} (#${course.id})` })) };
  }
  if (field.name === "moduleID") {
    return { ...field, options: data.modules.map((module) => ({ value: String(module.id), label: `${String(module.tittle)} (#${module.id})` })) };
  }
  if (field.name === "contentID") {
    return { ...field, options: data.contents.map((content) => ({ value: String(content.id), label: `${String(content.tittle)} (#${content.id})` })) };
  }
  return field;
}

function getInitialFormValues(resource: ResourceKey, record?: ApiRecord): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of RESOURCES[resource].fields) {
    const value = record?.[field.name];
    if (field.kind === "boolean") {
      result[field.name] = value === true || value === 1 ? "true" : value === false || value === 0 ? "false" : "null";
    } else {
      result[field.name] = value === null || value === undefined ? "" : String(value);
    }
  }
  return result;
}

function buildPayload(resource: ResourceKey, values: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of RESOURCES[resource].fields) {
    const rawValue = values[field.name] ?? "";
    if (field.kind === "boolean") {
      payload[field.name] = rawValue === "null" ? null : rawValue === "true";
    } else if (field.name.endsWith("ID")) {
      payload[field.name] = Number(rawValue);
    } else if (field.kind === "date") {
      payload[field.name] = rawValue || null;
    } else {
      payload[field.name] = rawValue.trim();
    }
  }
  return payload;
}

function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [data, setData] = useState<RecordCollection>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [dialog, setDialog] = useState<{ resource: ResourceKey; record?: ApiRecord } | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError("");

    try {
      const [users, courses, modules, contents, attendance] = await Promise.all([
        api.getAll("users"),
        api.getAll("courses"),
        api.getAll("modules"),
        api.getAll("contents"),
        api.getAll("attendance")
      ]);
      setData({ users, courses, modules, contents, attendance });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "An unexpected error occurred while loading data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    setSearch("");
    setSidebarOpen(false);
  }, [screen]);

  const totalRecords = RESOURCE_ORDER.reduce((total, key) => total + data[key].length, 0);
  const watchedCount = data.attendance.filter((item) => item.watched === true || item.watched === 1).length;
  const watchedPercentage = data.attendance.length ? Math.round((watchedCount / data.attendance.length) * 100) : 0;

  const handleSave = async (resource: ResourceKey, values: Record<string, string>, record?: ApiRecord) => {
    try {
      const payload = buildPayload(resource, values);
      if (record) {
        await api.update(resource, record.id, payload);
        setToast({ message: `${RESOURCES[resource].singular} updated successfully.`, type: "success" });
      } else {
        await api.create(resource, payload);
        setToast({ message: `${RESOURCES[resource].singular} created successfully.`, type: "success" });
      }
      setDialog(null);
      await loadData(true);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "The record could not be saved.", type: "error" });
      throw error;
    }
  };

  const handleDelete = async (resource: ResourceKey, record: ApiRecord) => {
    const label = RESOURCES[resource].singular.toLowerCase();
    const name = String(record.tittle ?? record.name ?? record.uniquecode ?? `#${record.id}`);
    if (!window.confirm(`Delete ${label} "${name}"? This action cannot be undone.`)) return;

    try {
      await api.delete(resource, record.id);
      setToast({ message: `${RESOURCES[resource].singular} deleted successfully.`, type: "success" });
      await loadData(true);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "The record could not be deleted.", type: "error" });
    }
  };

  const currentResource = screen === "dashboard" ? null : RESOURCES[screen];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><GraduationCap size={22} strokeWidth={2.3} /></div>
          <div className="brand-copy"><strong>CourseFlow</strong><span>Management workspace</span></div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <div className="nav-section-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <NavButton active={screen === "dashboard"} icon={LayoutDashboard} label="Overview" onClick={() => setScreen("dashboard")} />
        </nav>
        <div className="nav-section-label nav-section-spaced">MANAGEMENT</div>
        <nav className="main-nav" aria-label="Management navigation">
          {RESOURCE_ORDER.map((key) => {
            const resource = RESOURCES[key];
            return <NavButton key={key} active={screen === key} icon={resource.icon} label={resource.label} count={data[key].length} onClick={() => setScreen(key)} />;
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-card">
            <div className="connection-icon"><ShieldCheck size={17} /></div>
            <div><strong>API connection</strong><span><i className={loadError ? "status-dot offline" : "status-dot"} />{loadError ? "Disconnected" : "Connected"}</span></div>
          </div>
          <div className="sidebar-footer">CourseFlow <span>v1.0</span></div>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{currentResource?.label ?? "Overview"}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="api-indicator"><span className={`status-dot ${loadError ? "offline" : ""}`} />{loadError ? "API unavailable" : "Live data"}</div>
            <button className="button button-light button-small" onClick={() => void loadData(true)} disabled={isRefreshing}>
              <RefreshCw size={15} className={isRefreshing ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <div className="page-content">
          {loadError && <div className="alert alert-error"><AlertCircle size={18} /><div><strong>Could not load API data</strong><span>{loadError}</span></div><button className="alert-action" onClick={() => void loadData(true)}>Try again</button></div>}

          {screen === "dashboard" ? (
            <Dashboard
              data={data}
              totalRecords={totalRecords}
              watchedPercentage={watchedPercentage}
              isLoading={isLoading}
              onNavigate={setScreen}
              onCreate={(resource) => setDialog({ resource })}
            />
          ) : currentResource ? (
            <ResourcePage
              resource={currentResource}
              records={data[screen]}
              allData={data}
              search={search}
              onSearch={setSearch}
              isLoading={isLoading}
              onCreate={() => setDialog({ resource: screen })}
              onEdit={(record) => setDialog({ resource: screen, record })}
              onDelete={(record) => void handleDelete(screen, record)}
            />
          ) : null}
        </div>
      </main>

      {dialog && (
        <RecordDialog
          resource={dialog.resource}
          record={dialog.record}
          data={data}
          onClose={() => setDialog(null)}
          onSave={(values) => handleSave(dialog.resource, values, dialog.record)}
        />
      )}

      {toast && <div className={`toast toast-${toast.type}`} role="status"><span className="toast-icon">{toast.type === "success" ? <Check size={17} /> : <AlertCircle size={17} />}</span><span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={16} /></button></div>}
    </div>
  );
}

function NavButton({ active, icon: Icon, label, count, onClick }: { active: boolean; icon: LucideIcon; label: string; count?: number; onClick: () => void }) {
  return (
    <button className={`nav-button ${active ? "nav-button-active" : ""}`} onClick={onClick}>
      <Icon size={18} strokeWidth={active ? 2.2 : 1.9} /><span>{label}</span>{count !== undefined && <small>{count}</small>}
    </button>
  );
}

function Dashboard({ data, totalRecords, watchedPercentage, isLoading, onNavigate, onCreate }: {
  data: RecordCollection;
  totalRecords: number;
  watchedPercentage: number;
  isLoading: boolean;
  onNavigate: (screen: Screen) => void;
  onCreate: (resource: ResourceKey) => void;
}) {
  const metrics = [
    { label: "Total users", value: data.users.length, icon: Users, tone: "violet", note: "Registered accounts", key: "users" as const },
    { label: "Active courses", value: data.courses.length, icon: GraduationCap, tone: "blue", note: "Available courses", key: "courses" as const },
    { label: "Learning modules", value: data.modules.length, icon: BookOpen, tone: "amber", note: "Across all courses", key: "modules" as const },
    { label: "Learning contents", value: data.contents.length, icon: BookText, tone: "green", note: "Lessons and materials", key: "contents" as const }
  ];

  return (
    <div className="page-stack">
      <div className="page-heading dashboard-heading">
        <div><div className="eyebrow">YOUR LEARNING SPACE</div><h1>Overview</h1><p>Here is what is happening across your course workspace.</p></div>
        <button className="button button-primary" onClick={() => onCreate("courses")}><Plus size={17} />Create course</button>
      </div>

      <section className="metric-grid" aria-label="Workspace statistics">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <button className="metric-card" key={metric.label} onClick={() => onNavigate(metric.key)}>
            <div className={`metric-icon metric-${metric.tone}`}><Icon size={19} /></div>
            <div className="metric-label">{metric.label}</div>
            <div className="metric-value">{isLoading ? <span className="skeleton skeleton-number" /> : metric.value.toLocaleString()}</div>
            <div className="metric-note">{metric.note}</div>
            <div className="metric-arrow"><ArrowDownUp size={14} /></div>
          </button>;
        })}
      </section>

      <section className="dashboard-grid">
        <div className="panel collection-panel">
          <div className="panel-heading"><div><h2>Manage your workspace</h2><p>Open a collection to view and manage its records.</p></div><span className="panel-count">{totalRecords} records</span></div>
          <div className="collection-list">
            {RESOURCE_ORDER.map((key) => {
              const resource = RESOURCES[key];
              const Icon = resource.icon;
              return <button className="collection-row" key={key} onClick={() => onNavigate(key)}>
                <div className="collection-icon"><Icon size={18} /></div>
                <div className="collection-copy"><strong>{resource.label}</strong><span>{resource.description}</span></div>
                <span className="collection-total">{data[key].length}</span>
                <ChevronDown className="collection-chevron" size={17} />
              </button>;
            })}
          </div>
        </div>

        <div className="right-column">
          <div className="panel progress-panel">
            <div className="panel-heading"><div><h2>Learning progress</h2><p>Attendance completion</p></div><div className="progress-symbol"><Activity size={18} /></div></div>
            <div className="progress-number">{isLoading ? "—" : `${watchedPercentage}%`}<span> watched</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${isLoading ? 0 : watchedPercentage}%` }} /></div>
            <div className="progress-meta"><span>{data.attendance.filter((row) => row.watched === true || row.watched === 1).length} watched</span><span>{data.attendance.length} total records</span></div>
            {data.attendance.length === 0 && <div className="progress-empty">Add attendance records to start tracking learner progress.</div>}
          </div>
          <div className="quick-actions panel">
            <div className="panel-heading"><div><h2>Quick actions</h2><p>Create a new record</p></div><Clock3 size={18} className="muted-icon" /></div>
            <div className="quick-action-buttons">
              <button onClick={() => onCreate("users")}><span><Users size={16} /></span>Add user<Plus size={15} /></button>
              <button onClick={() => onCreate("modules")}><span><BookOpen size={16} /></span>Add module<Plus size={15} /></button>
              <button onClick={() => onCreate("contents")}><span><BookText size={16} /></span>Add content<Plus size={15} /></button>
              <button onClick={() => onCreate("attendance")}><span><Activity size={16} /></span>Log attendance<Plus size={15} /></button>
            </div>
          </div>
          <div className="data-note"><CircleHelp size={16} /><span>Changes are saved directly through your Course Management API.</span></div>
        </div>
      </section>
    </div>
  );
}

function ResourcePage({ resource, records, allData, search, onSearch, isLoading, onCreate, onEdit, onDelete }: {
  resource: ResourceDefinition;
  records: ApiRecord[];
  allData: RecordCollection;
  search: string;
  onSearch: (value: string) => void;
  isLoading: boolean;
  onCreate: () => void;
  onEdit: (record: ApiRecord) => void;
  onDelete: (record: ApiRecord) => void;
}) {
  const filteredRecords = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => {
      const visibleValues = resource.columns.map((column) => column.render ? column.render(record, allData) : formatCell(record[column.key]));
      return [record.id, ...visibleValues].join(" ").toLowerCase().includes(normalized);
    });
  }, [records, search, resource, allData]);
  const Icon = resource.icon;

  return (
    <div className="page-stack">
      <div className="page-heading resource-heading">
        <div><div className="eyebrow">DATA MANAGEMENT</div><h1>{resource.label}</h1><p>{resource.description}</p></div>
        <button className="button button-primary" onClick={onCreate}><Plus size={17} />Add {resource.singular.toLowerCase()}</button>
      </div>

      <div className="panel table-panel">
        <div className="table-toolbar">
          <div className="table-title-group"><div className="table-title-icon"><Icon size={18} /></div><div><h2>All {resource.label.toLowerCase()}</h2><span>{records.length} {records.length === 1 ? "record" : "records"} in this collection</span></div></div>
          <div className="table-tools">
            <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={`Search ${resource.label.toLowerCase()}...`} aria-label={`Search ${resource.label}`} />{search && <button onClick={() => onSearch("")} aria-label="Clear search"><X size={14} /></button>}</label>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th className="id-column">ID</th>{resource.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th className="actions-column">Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={resource.columns.length + 2} className="table-message"><LoaderCircle className="spin" size={20} />Loading records...</td></tr> : filteredRecords.length === 0 ? <tr><td colSpan={resource.columns.length + 2}><div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><strong>{search ? "No matching records" : `No ${resource.label.toLowerCase()} yet`}</strong><span>{search ? "Try a different search term." : `Create your first ${resource.singular.toLowerCase()} to get started.`}</span>{!search && <button className="button button-primary button-small" onClick={onCreate}><Plus size={15} />Add {resource.singular.toLowerCase()}</button>}</div></td></tr> : filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className="id-cell">#{record.id}</td>
                  {resource.columns.map((column) => {
                    const value = column.render ? column.render(record, allData) : formatCell(record[column.key]);
                    const isStatus = column.key === "status" || column.key === "watched";
                    const truthy = record[column.key] === true || record[column.key] === 1;
                    return <td key={column.key} className={column.key === "description" || column.key === "content" ? "description-cell" : ""}>{isStatus ? <span className={`status-pill ${truthy ? "status-positive" : record[column.key] === false || record[column.key] === 0 ? "status-neutral" : "status-muted"}`}><i />{value}</span> : <span title={value}>{value}</span>}</td>;
                  })}
                  <td><div className="row-actions"><button className="row-action" onClick={() => onEdit(record)} aria-label={`Edit record ${record.id}`} title="Edit"><Pencil size={15} /></button><button className="row-action row-action-danger" onClick={() => onDelete(record)} aria-label={`Delete record ${record.id}`} title="Delete"><Trash2 size={15} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records</span><span>Sorted by newest ID first</span></div>
      </div>
    </div>
  );
}

function RecordDialog({ resource, record, data, onClose, onSave }: {
  resource: ResourceKey;
  record?: ApiRecord;
  data: RecordCollection;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => getInitialFormValues(resource, record));
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const definition = RESOURCES[resource];
  const fields = definition.fields.map((field) => createFieldOptions(field, data));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSaving, onClose]);

  const updateField = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");
    try {
      await onSave(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Please review the entered information.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header"><div><div className="eyebrow">{record ? "EDIT RECORD" : "NEW RECORD"}</div><h2 id="modal-title">{record ? `Edit ${definition.singular.toLowerCase()}` : `Create ${definition.singular.toLowerCase()}`}</h2><p>Enter the details below. Required fields are marked with an asterisk.</p></div><button className="icon-button" onClick={onClose} disabled={isSaving} aria-label="Close dialog"><X size={19} /></button></div>
        <form onSubmit={(event) => void submit(event)}>
          <div className="form-grid">
            {fields.map((field) => <div className={`form-field ${field.kind === "textarea" ? "form-field-wide" : ""}`} key={field.name}>
              <label htmlFor={`field-${field.name}`}>{field.label}{field.required && <span className="required-mark"> *</span>}</label>
              {field.kind === "textarea" ? <textarea id={`field-${field.name}`} value={values[field.name] ?? ""} onChange={(event) => updateField(field.name, event.target.value)} required={field.required} maxLength={field.maxLength} placeholder={field.placeholder} rows={3} />
                : field.kind === "select" ? <select id={`field-${field.name}`} value={values[field.name] ?? ""} onChange={(event) => updateField(field.name, event.target.value)} required={field.required}>
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                : field.kind === "boolean" ? <select id={`field-${field.name}`} value={values[field.name] ?? "null"} onChange={(event) => updateField(field.name, event.target.value)}><option value="null">Not set</option><option value="true">Yes</option><option value="false">No</option></select>
                : <input id={`field-${field.name}`} type={field.kind} value={values[field.name] ?? ""} onChange={(event) => updateField(field.name, event.target.value)} required={field.required} maxLength={field.maxLength} placeholder={field.placeholder} />}
              {field.help && <span className="field-help">{field.help}</span>}
              {field.kind === "select" && (field.options?.length ?? 0) === 0 && <span className="field-help field-warning">No available options. Create the related record first.</span>}
              {field.maxLength && <span className="field-counter">Maximum {field.maxLength} characters</span>}
            </div>)}
          </div>
          {formError && <div className="form-error"><AlertCircle size={16} />{formError}</div>}
          <div className="modal-footer"><button type="button" className="button button-light" onClick={onClose} disabled={isSaving}>Cancel</button><button type="submit" className="button button-primary" disabled={isSaving || fields.some((field) => field.kind === "select" && field.required && (field.options?.length ?? 0) === 0)}>{isSaving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{record ? "Save changes" : `Create ${definition.singular.toLowerCase()}`}</button></div>
        </form>
      </section>
    </div>
  );
}

export default App;
