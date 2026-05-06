import { useEffect, useState } from "react";
import api from "../../services/api";
import "./assets.css";
import { Plus } from "lucide-react";

function Assets() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // MASTER DATA
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);

  // FORM
  const [form, setForm] = useState({
    asset_name: "",
    category_id: "",
    vendor_id: "",
    assigned_user_id: "",
    location_id: "",
    brand: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    warranty_expiry: "",
    purchase_price: "",
    current_value: "",
    depreciation_value: "",
    condition_status: "Good",
    lifecycle_status: "Active",
    notes: "",
  });

  useEffect(() => {
    fetchAssets();
    fetchMaster();
  }, []);

  // ================= GET ASSETS =================
  const fetchAssets = async () => {
    try {
      const res = await api.get("/assets");
      setAssets(res.data.data);
    } catch (err) {
      console.log("ASSETS ERROR:", err.response?.data);
    }
  };

  // ================= GET MASTER =================
  const fetchMaster = async () => {
    try {
      const [cat, ven, usr, loc] = await Promise.all([
        api.get("/categories"),
        api.get("/vendors"),
        api.get("/master-users"),
        api.get("/locations"),
      ]);

      setCategories(cat.data.data);
      setVendors(ven.data.data);
      setUsers(usr.data.data);
      setLocations(loc.data.data);
    } catch (err) {
      console.log("MASTER ERROR:", err.response?.data);
    }
  };

  // ================= INPUT =================
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    try {
      setLoading(true);

      const payload = {
        ...form,
        category_id: Number(form.category_id),
        vendor_id: Number(form.vendor_id),
        assigned_user_id: Number(form.assigned_user_id),
        location_id: Number(form.location_id),
      };

      console.log("PAYLOAD:", payload);

      await api.post("/assets", payload);

      alert("Asset berhasil disimpan ✅");

      setShowModal(false);
      fetchAssets();

      // RESET FORM
      setForm({
        asset_name: "",
        category_id: "",
        vendor_id: "",
        assigned_user_id: "",
        location_id: "",
        brand: "",
        model: "",
        serial_number: "",
        purchase_date: "",
        warranty_expiry: "",
        purchase_price: "",
        current_value: "",
        depreciation_value: "",
        condition_status: "Good",
        lifecycle_status: "Active",
        notes: "",
      });

    } catch (error) {
      console.log("SUBMIT ERROR:", error.response?.data);
      alert("Gagal simpan ❌");
    } finally {
      setLoading(false);
    }
  };

  // ================= SEARCH =================
  const filteredAssets = assets.filter((item) =>
    item.asset_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card-container">

      {/* HEADER */}
      <div className="table-header">
        <h2>Assets Data</h2>

        <div className="actions">
          <input
            type="text"
            placeholder="Search..."
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="add-btn" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Asset
          </button>
        </div>
      </div>

      {/* TABLE */}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Vendor</th>
            <th>User</th>
            <th>Location</th>
            <th>Condition</th>
          </tr>
        </thead>

        <tbody>
          {filteredAssets.length === 0 ? (
            <tr>
              <td colSpan="6">No data</td>
            </tr>
          ) : (
            filteredAssets.map((item) => (
              <tr key={item.id}>
                <td>{item.asset_name}</td>
                <td>{item.category?.category_name}</td>
                <td>{item.vendor?.vendor_name}</td>
                <td>{item.user?.employee_name}</td>
                <td>{item.location?.location_name}</td>
                <td>{item.condition_status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* MODAL */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">

            <h3>Add Asset</h3>

            <input name="asset_name" placeholder="Asset Name" onChange={handleChange} />
            <input name="brand" placeholder="Brand" onChange={handleChange} />
            <input name="model" placeholder="Model" onChange={handleChange} />
            <input name="serial_number" placeholder="Serial Number" onChange={handleChange} />

            <input type="date" name="purchase_date" onChange={handleChange} />
            <input type="date" name="warranty_expiry" onChange={handleChange} />

            <input name="purchase_price" placeholder="Price" onChange={handleChange} />

            {/* DROPDOWN */}
            <select name="category_id" onChange={handleChange}>
              <option value="">Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.category_name}</option>
              ))}
            </select>

            <select name="vendor_id" onChange={handleChange}>
              <option value="">Vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.vendor_name}</option>
              ))}
            </select>

            <select name="assigned_user_id" onChange={handleChange}>
              <option value="">User</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.employee_name}</option>
              ))}
            </select>

            <select name="location_id" onChange={handleChange}>
              <option value="">Location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.location_name}</option>
              ))}
            </select>

            <select name="condition_status" onChange={handleChange}>
              <option value="Good">Good</option>
              <option value="Damaged">Damaged</option>
            </select>

            <textarea name="notes" placeholder="Notes" onChange={handleChange} />

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button onClick={handleSubmit}>
                {loading ? "Saving..." : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Assets;