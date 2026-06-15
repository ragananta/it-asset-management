import api from "./axios";

export interface Employee {
  username: string;
  name: string;
  departemen: string;
  pos?: string;
  email?: string;
}

export interface Asset {
  id: number;
  asset_name: string;
  asset_code: string;
  condition_status: "good" | "damaged" | "under_maintenance" | "retired";
  status: "active" | "borrowed" | "disposed";
  category?: { id: number; name: string; code: string } | null;
}

export interface Assignment {
  id: number;
  asset_id: number;
  user_name: string;
  phone?: string;
  assign_date: string;
  return_date: string | null;
  asset: Asset | null;
}

export interface DepartmentCategoryBreakdown {
  categoryName: string;
  count: number;
}

export interface DepartmentDistribution {
  department: string;
  count: number;
  categories: DepartmentCategoryBreakdown[];
}

/**
 * Fetch all active assignments page by page.
 * Limits page queries and recursively retrieves all active assignments.
 */
export async function fetchAllActiveAssignments(): Promise<Assignment[]> {
  let allAssignments: Assignment[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await api.get(`/asset-assignments`, {
      params: {
        is_active: "1",
        page: page,
        per_page: 100,
      },
    });

    const payload = res?.data?.data;
    const items = payload?.data || [];
    
    allAssignments = [...allAssignments, ...items];

    if (payload?.next_page_url && items.length > 0) {
      page++;
    } else {
      hasMore = false;
    }
  }

  return allAssignments;
}

/**
 * Aggregates assignments by department using employee list data and a filter.
 * 
 * Filter options:
 * - 'all': All active assignments.
 * - 'active': Active assignments with condition_status === 'good'.
 * - 'borrowed': Active assignments with status === 'borrowed'.
 * - 'maintenance': Active assignments with condition_status === 'under_maintenance'.
 */
export function getAssetDistributionByDepartment(
  assignments: Assignment[],
  employees: Employee[],
  filter: "all" | "active" | "borrowed" | "maintenance"
): DepartmentDistribution[] {
  // Map employee name and username to department (case-insensitive)
  const employeeMap = new Map<string, string>();
  employees.forEach((emp) => {
    if (emp.name) employeeMap.set(emp.name.toLowerCase(), emp.departemen);
    if (emp.username) employeeMap.set(emp.username.toLowerCase(), emp.departemen);
  });

  const departmentCounts: Record<string, { count: number; categories: Record<string, number> }> = {};

  assignments.forEach((assign) => {
    const asset = assign.asset;
    if (!asset) return;

    // Apply filter condition
    if (filter === "active") {
      if (asset.condition_status !== "good") return;
    } else if (filter === "borrowed") {
      if (asset.status !== "borrowed") return;
    } else if (filter === "maintenance") {
      if (asset.condition_status !== "under_maintenance") return;
    }

    const userNameKey = assign.user_name ? assign.user_name.toLowerCase() : "";
    const dept = employeeMap.get(userNameKey) || "Unknown";

    if (!departmentCounts[dept]) {
      departmentCounts[dept] = { count: 0, categories: {} };
    }
    departmentCounts[dept].count += 1;

    // Resolve category name (with fallbacks for codes)
    let catName = asset.category?.name || "Lain-lain";
    if (catName === "Lain-lain" && asset.asset_code) {
      const codeParts = asset.asset_code.split("-");
      if (codeParts.length >= 2) {
        const code = codeParts[1].toUpperCase();
        if (code === "LPT") catName = "Laptop";
        else if (code === "SCR") catName = "Scanner";
        else if (code === "PC") catName = "Personal Computer";
        else if (code === "PRN") catName = "Printer";
        else if (code === "MTR") catName = "Monitor";
        else if (code === "TAB") catName = "Tablet";
        else if (code === "PHN") catName = "Handphone";
      }
    }

    departmentCounts[dept].categories[catName] = (departmentCounts[dept].categories[catName] || 0) + 1;
  });

  // Convert to array and sort descending by count
  return Object.entries(departmentCounts)
    .map(([department, data]) => {
      const categoriesBreakdown = Object.entries(data.categories)
        .map(([categoryName, count]) => ({ categoryName, count }))
        .sort((a, b) => b.count - a.count);
      return {
        department,
        count: data.count,
        categories: categoriesBreakdown,
      };
    })
    .sort((a, b) => b.count - a.count);
}
