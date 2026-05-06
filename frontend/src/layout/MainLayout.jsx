import "./layout.css";

function MainLayout({ children, onLogout, setPage, page }) {
  return (
    <div className="layout">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">IT Asset Management</div>

        <ul className="menu">
          <li
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </li>

          <li
            className={page === "assets" ? "active" : ""}
            onClick={() => setPage("assets")}
          >
            Assets
          </li>

          <li
            className={page === "users" ? "active" : ""}
            onClick={() => setPage("users")}
          >
            Users
          </li>
        </ul>

        {/* Logout di bawah (lebih proper UX) */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">

        {/* HEADER */}
        <header className="header">
          <h3 className="title">
            {page ? page.charAt(0).toUpperCase() + page.slice(1) : ""}
          </h3>
        </header>

        {/* CONTENT */}
        <div className="content">
          {children}
        </div>

      </main>
    </div>
  );
}

export default MainLayout;