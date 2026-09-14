/**
 * Dashboard Page — Landing page showing overview stats.
 */
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Content</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-sm text-gray-500 mt-1">Total posts and pages</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Media</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-sm text-gray-500 mt-1">Uploaded files</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Taxonomy</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-sm text-gray-500 mt-1">Categories and tags</p>
        </div>
      </div>
    </div>
  );
}
