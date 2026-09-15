/**
 * Dashboard Page — Landing page showing overview stats.
 *
 * Colors: #2185d5 (blue), #3a4750 (gray), #303841 (dark), #f3f3f3 (light)
 */
export default function DashboardPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#303841' }}>Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-md p-6 drop-shadow">
          <h3 className="text-sm font-medium" style={{ color: '#3a4750' }}>Content</h3>
          <p className="text-3xl font-bold mt-2" style={{ color: '#2185d5' }}>—</p>
          <p className="text-sm mt-1" style={{ color: '#3a4750' }}>Total posts and pages</p>
        </div>

        <div className="bg-white rounded-md p-6 drop-shadow">
          <h3 className="text-sm font-medium" style={{ color: '#3a4750' }}>Media</h3>
          <p className="text-3xl font-bold mt-2" style={{ color: '#2185d5' }}>—</p>
          <p className="text-sm mt-1" style={{ color: '#3a4750' }}>Uploaded files</p>
        </div>

        <div className="bg-white rounded-md p-6 drop-shadow">
          <h3 className="text-sm font-medium" style={{ color: '#3a4750' }}>Taxonomy</h3>
          <p className="text-3xl font-bold mt-2" style={{ color: '#2185d5' }}>—</p>
          <p className="text-sm mt-1" style={{ color: '#3a4750' }}>Categories and tags</p>
        </div>
      </div>
    </div>
  );
}
