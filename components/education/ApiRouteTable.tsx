import { API_ROUTES } from '@/lib/demo/guide-content';

export default function ApiRouteTable() {
  return (
    <div className="table-responsive">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Method</th>
            <th>Path</th>
            <th>Auth</th>
          </tr>
        </thead>
        <tbody>
          {API_ROUTES.map((row) => (
            <tr key={`${row.method}-${row.path}`}>
              <td>
                <span className="badge bg-secondary">{row.method}</span>
              </td>
              <td>
                <code>{row.path}</code>
              </td>
              <td className="text-muted small">{row.auth}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}