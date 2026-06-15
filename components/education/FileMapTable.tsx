import CopyButton from '@/components/CopyButton';
import { FILE_MAP } from '@/lib/demo/guide-content';

export default function FileMapTable() {
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>File</th>
            <th>Role</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {FILE_MAP.map((row) => (
            <tr key={row.path}>
              <td>
                <code>{row.path}</code>
              </td>
              <td className="text-muted small">{row.role}</td>
              <td className="text-end">
                <CopyButton text={row.path} label="Copy" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}