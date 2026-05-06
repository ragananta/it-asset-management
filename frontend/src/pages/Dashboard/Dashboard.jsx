import { useEffect, useState } from "react";
import api from "../../services/api";
import Card from "../../components/Card";
import "./dashboard.css";

function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    const res = await api.get("/dashboard");
    setSummary(res.data.data.summary);
  };

  if (!summary) return <p>Loading...</p>;

  return (
    <div>
      <h2>Master Data</h2>

      <div className="summary-grid">
        <Card title="Assets" value={summary.total_assets} />
        <Card title="Categories" value={summary.total_categories} />
        <Card title="Vendors" value={summary.total_vendors} />
        <Card title="Users" value={summary.total_users} />
        <Card title="Locations" value={summary.total_locations} />
      </div>
    </div>
  );
}

export default Dashboard;