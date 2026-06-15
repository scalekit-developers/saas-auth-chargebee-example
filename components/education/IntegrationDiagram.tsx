import { ARCHITECTURE_FLOW } from '@/lib/demo/guide-content';

export default function IntegrationDiagram() {
  return (
    <pre className="bg-light p-3 rounded small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
      {ARCHITECTURE_FLOW}
    </pre>
  );
}